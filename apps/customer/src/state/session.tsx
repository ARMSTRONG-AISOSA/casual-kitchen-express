import type { Me } from "@cke/api-client";
import { useEffect, type ReactNode } from "react";
import { api } from "../api";
import { authClient, refreshCookie, signInError } from "../auth";
import { useStore } from "./store";

type Set = ReturnType<typeof useStore>["set"];

/** The customer's name and email from Google, into the app's state. */
function enterAs(me: Me, set: Set) {
  set((st) => ({
    signedIn: true,
    name: me.name,
    email: me.email ?? "",
    // The customer number and the rest of the account come from the API in build step 6.
    customerId: st.customerId || "C-01093",
  }));
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
