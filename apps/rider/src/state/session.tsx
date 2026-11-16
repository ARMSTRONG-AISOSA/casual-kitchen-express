import { ApiError, type Me } from "@cke/api-client";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, whenSignedOut } from "../api";
import { authClient, refreshCookie } from "../auth";
import { RIDER } from "../data/orders";
import { useStore } from "./store";
import { unregisterPush } from "../push";

type Set = ReturnType<typeof useStore>["set"];

// The rider's own details, kept on the phone so the app opens signed in without signal (riders
// are often out of coverage). The API stays the authority whenever it can be reached.
const ME_KEY = "cke-rider.me";
const saveMe = (me: Me | null) =>
  (me
    ? SecureStore.setItemAsync(ME_KEY, JSON.stringify(me))
    : SecureStore.deleteItemAsync(ME_KEY)
  ).catch(() => {});
async function savedMe(): Promise<Me | null> {
  try {
    const raw = await SecureStore.getItemAsync(ME_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

// The temporary password typed at sign-in, kept in memory only, so the new-password screen doesn't
// ask for it again. Cleared once used.
let typedPassword = "";
export const rememberTyped = (p: string) => {
  typedPassword = p;
};
export const takeTyped = () => {
  const p = typedPassword;
  typedPassword = "";
  return p;
};

/** What a non-rider sees if they sign in here (design.md 5: riders only). */
export const NOT_A_RIDER =
  "This app is for riders. Kitchen, dispatch, and managers use CKE Kitchen.";

/**
 * Lets a signed-in rider in (architecture.md 12.1). Anyone else is signed out again and false is
 * returned, so the sign-in screen can say why.
 */
export async function enterAs(me: Me, set: Set) {
  if (me.role !== "rider" || !me.staffCode) {
    await signOut(set, false);
    return false;
  }
  void saveMe(me);
  set({ me, signedIn: true, mustSetPassword: me.mustChangePassword });
  router.replace(me.mustChangePassword ? "/new-password" : "/(tabs)");
  return true;
}

/** Signs out of the API too, and goes offline. */
export async function signOut(set: Set, toSignIn = true) {
  // While still signed in: this phone stops getting the rider's notifications.
  await unregisterPush();
  try {
    await authClient?.signOut();
  } catch {
    // Offline: the session is forgotten on this phone either way.
  }
  await refreshCookie();
  await saveMe(null);
  set({ me: null, signedIn: false, online: false });
  if (toSignIn) {
    router.dismissAll();
    router.replace("/sign-in");
  }
}

/** The rider's details: from the API when signed in for real, otherwise the demo rider. */
export function useRider() {
  const { s } = useStore();
  const me = s.me;
  if (!me) return RIDER;
  const gender =
    me.gender === "male"
      ? "Male"
      : me.gender === "female"
        ? "Female"
        : me.gender === "prefer_not_to_say"
          ? "Prefer not to say"
          : "";
  return {
    first: me.name.split(" ")[0] ?? me.name,
    name: me.name,
    staffId: me.staffCode ?? "",
    username: "",
    job: me.jobTitle ?? "",
    phone: me.phone ?? "",
    home: me.homeAddress ?? "",
    gender,
  };
}

const Ready = createContext(true);
export const useSessionReady = () => useContext(Ready);

/** Picks up a saved session on open, so the rider stays signed in on their phone (design.md 5.4). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { set } = useStore();
  const [ready, setReady] = useState(!api);

  useEffect(() => {
    if (!api) return;
    // A manager reset the password or deactivated the account: back to sign-in.
    whenSignedOut(() => {
      void refreshCookie();
      void saveMe(null);
      set({ me: null, signedIn: false, online: false });
      router.replace("/sign-in");
    });
    void (async () => {
      try {
        if (await refreshCookie()) await enterAs(await api.me(), set);
      } catch (e) {
        // Offline with a saved session: open with the details kept on the phone. A refusal from
        // the API (signed out, deactivated) shows the sign-in screen instead.
        const kept = e instanceof ApiError ? null : await savedMe();
        if (kept) await enterAs(kept, set);
      } finally {
        setReady(true);
      }
    })();
  }, [set]);

  return <Ready.Provider value={ready}>{children}</Ready.Provider>;
}
