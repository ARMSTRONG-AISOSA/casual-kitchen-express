import type { Me } from "@cke/api-client";
import { router } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { api, whenSignedOut } from "../api";
import { authClient, refreshCookie, sessionCookie } from "../auth";
import type { Person } from "../data/seed";
import { homeFor } from "../ui/shell";
import { useStore, type State } from "./store";
import { unregisterPush } from "../push";
import { ApiError } from "@cke/api-client";

type Set = ReturnType<typeof useStore>["set"];

// The temporary password typed at sign-in, kept in memory only, so the new-password screen doesn't
// ask for it again ("nothing asked twice"). Cleared once used.
let typedPassword = "";
export const rememberTyped = (p: string) => {
  typedPassword = p;
};
export const takeTyped = () => {
  const p = typedPassword;
  typedPassword = "";
  return p;
};

/**
 * The signed-in person, from the API (architecture.md 4.5, 12). The rest of the app knows people by
 * staff code, so signing in sets `userId` to the code from GET /me. Someone the demo list doesn't
 * have yet (a person a manager just added) is added to it, so their menus and name work.
 */
export function enterAs(me: Me, set: Set) {
  // Riders and customers have their own apps (design.md 4 and 5).
  if (!me.staffCode || me.role === "customer" || me.role === "rider") {
    void signOut(set);
    return;
  }
  const code = me.staffCode;
  if (me.mustChangePassword) {
    router.replace("/new-password");
    return;
  }
  // The API is the authority on who this is: its name and role replace whatever the app's list had
  // (a manager may have just changed the role).
  const role = me.role;
  set((st: State) => ({
    userId: code,
    people: st.people.some((p) => p.id === code)
      ? st.people.map((p) => (p.id === code ? { ...p, name: me.name, role, active: true } : p))
      : [
          ...st.people,
          { id: code, name: me.name, role, job: "", phone: "", active: true } as Person,
        ],
  }));
  router.replace(homeFor(role));
}

/** Signs out of the API too, so the next person on the tablet starts fresh (Switch person). */
export async function signOut(set: Set) {
  // While still signed in: this tablet stops getting this person's notifications.
  await unregisterPush();
  try {
    await authClient?.signOut();
  } catch {
    // Offline: the session is forgotten on this device either way.
  }
  await refreshCookie();
  set({ userId: null });
  router.replace("/sign-in");
}

const Ready = createContext(true);
export const useSessionReady = () => useContext(Ready);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { s, set } = useStore();
  const [ready, setReady] = useState(!api);
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  // On open: pick up a saved session, so staff on their own phone stay signed in (12.1).
  useEffect(() => {
    if (!api) return;
    whenSignedOut(() => {
      void refreshCookie();
      set({ userId: null });
      router.replace("/sign-in");
    });
    void (async () => {
      try {
        if (!(await refreshCookie())) return;
        // Can't reach CKE yet (the network or the API waking up): try again for about 15
        // seconds before showing sign-in, so a saved session isn't lost to a slow start.
        for (let attempt = 0; ; attempt++) {
          try {
            enterAs(await api.me(), set);
            return;
          } catch (e) {
            if (e instanceof ApiError || attempt >= 4) return; // signed out, or still offline
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, [set]);

  // The shared tablet signs the person out at 8:30 pm, the walk-in closing time (4.5, KIT-12), so
  // a forgotten sign-out doesn't carry into the next day. Owner decisions (14 November 2026):
  // it waits until every order placed before 8:30 pm is finished (collected, delivered, or
  // cancelled), and managers can turn it off in Settings. Only someone signed in before 8:30 pm
  // is signed out, so a manager who signs in later to finish up isn't. Phones stay signed in.
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  useEffect(() => {
    if (!isTablet || !s.userId) return;
    const signedInAt = new Date();
    const timer = setInterval(() => {
      const st = latest.current;
      if (!st.settings.autoSignOut) return;
      const now = new Date();
      const close = new Date(now);
      close.setHours(20, 30, 0, 0);
      // From 8:30 pm today, or any time after a sign-in on an earlier day.
      const due =
        now >= close ? signedInAt < close : signedInAt.toDateString() !== now.toDateString();
      if (!due) return;
      const cutoff = now >= close ? close.getTime() : now.getTime();
      const open = st.orders.some(
        (o) => o.placedAt < cutoff && o.status !== "done" && o.status !== "cancelled",
      );
      if (!open) void signOut(set);
    }, 60_000);
    return () => clearInterval(timer);
  }, [isTablet, s.userId, set]);

  return <Ready.Provider value={ready}>{children}</Ready.Provider>;
}

export { sessionCookie };
