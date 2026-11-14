import { expoClient } from "@better-auth/expo/client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/**
 * Sign-in through the API's Better Auth (architecture.md 12). The session cookie is kept in the
 * phone's secure storage, so customers stay signed in (architecture.md 12.1). Customers sign in only
 * with Google, through the browser (12.2). Without an API address the app stays on its demo sign-in.
 */
const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const authClient = baseURL
  ? createAuthClient({
      baseURL,
      basePath: "/api/auth",
      plugins: [
        usernameClient(),
        expoClient({ scheme: "cke-customer", storagePrefix: "cke-customer", storage: SecureStore }),
      ],
    })
  : null;

// The cookie for API calls, kept here and refreshed whenever the session changes.
let cookie = "";
export const sessionCookie = () => cookie;
export async function refreshCookie() {
  cookie = authClient ? await authClient.getCookie() : "";
  return cookie;
}

/** Plain-English messages for what can go wrong with Google sign-in. */
export function signInError(e: { status?: number; message?: string } | null) {
  if (!e) return "Can’t reach CKE right now. Check the connection and try again.";
  if (e.status === 429) return "Too many tries. Wait a minute, then try again.";
  if (e.status === 404 || /provider/i.test(e.message ?? ""))
    return "Google sign-in isn’t set up yet. You can keep browsing.";
  return "Can’t reach CKE right now. Check the connection and try again.";
}
