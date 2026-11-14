import type { Me } from "@cke/api-client";
import { useEffect, type ReactNode } from "react";
import { api } from "../api";
import { authClient, refreshCookie, signInError } from "../auth";
import { useStore } from "./store";

type Set = ReturnType<typeof useStore>["set"];

const GENDER_LABEL = { female: "Female", male: "Male", prefer_not_to_say: "Prefer not to say" };
const GENDER_VALUE: Record<string, Me["gender"]> = {
  Female: "female",
  Male: "male",
  "Prefer not to say": "prefer_not_to_say",
};

/** The address of a saved photo; it needs the session to load (architecture.md 3.1). */
export const photoUrl = (photoId: string | null) =>
  photoId ? `${process.env.EXPO_PUBLIC_API_URL}/media/${photoId}` : "";

/** The customer's profile from the API (CustomerProfile, architecture.md 9) into the app's state. */
function enterAs(me: Me, set: Set) {
  set((st) => ({
    signedIn: true,
    name: me.name,
    email: me.email ?? "",
    gender: me.gender ? GENDER_LABEL[me.gender] : "",
    customerId: me.customerCode ?? st.customerId,
    photo: !!me.photoId,
    photoUri: photoUrl(me.photoId),
  }));
}

/** Saves a change to the name or gender (CUS-15). Returns an error sentence, or null. */
export async function saveProfile(changes: { name?: string; gender?: string }) {
  if (!api) return null;
  try {
    await api.updateMe({
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.gender !== undefined ? { gender: GENDER_VALUE[changes.gender] ?? null } : {}),
    });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Couldn’t save that. Try again.";
  }
}

/** Signs out on this phone and on the API. The account, orders, and addresses stay saved. */
export async function signOutCustomer(set: Set) {
  try {
    await authClient?.signOut();
  } catch {
    // Offline: the session is forgotten on this phone either way.
  }
  await refreshCookie();
  set({
    signedIn: false,
    name: "",
    email: "",
    gender: "",
    customerId: "",
    photo: false,
    photoUri: "",
  });
}

/**
 * Continue with Google (CUS-05, CUS-20): Google's page opens in the browser and comes back to the
 * app (architecture.md 12.2). Returns an error sentence, or null once signed in. `returnTo` is the
 * screen to come back to.
 */
export async function signInWithGoogle(set: Set, returnTo: string): Promise<string | null> {
  if (!authClient || !api) return "demo";
  try {
    const res = await authClient.signIn.social({ provider: "google", callbackURL: returnTo });
    if (res.error) return signInError(res.error);
    // Closed or cancelled before choosing an account.
    if (!(await refreshCookie()))
      return "Google sign-in didn’t finish. Try again when you’re ready.";
    const me = await api.me();
    // Staff accounts belong in the staff apps; a customer account uses a different Google email.
    if (me.role !== "customer") {
      await authClient.signOut();
      await refreshCookie();
      return "That Google account belongs to CKE staff. Use another Google account to order.";
    }
    enterAs(me, set);
    return null;
  } catch {
    return signInError(null);
  }
}

/** Picks up a saved session on open, so customers stay signed in (architecture.md 12.1). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { set } = useStore();
  useEffect(() => {
    if (!api) return;
    void (async () => {
      try {
        if (await refreshCookie()) {
          const me = await api.me();
          if (me.role === "customer") enterAs(me, set);
        }
      } catch {
        // No session, or offline: the customer browses as a guest until they sign in.
      }
    })();
  }, [set]);
  return children;
}
