import { expoClient } from "@better-auth/expo/client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/**
 * Sign-in through the API's Better Auth (architecture.md 12). The session cookie is kept in the
 * phone's secure storage, so the rider stays signed in on their phone (design.md 5.4). Without an
 * API address the app stays on its demo sign-in.
 */
const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const authClient = baseURL
  ? createAuthClient({
      baseURL,
      basePath: "/api/auth",
      plugins: [
        usernameClient(),
        expoClient({ scheme: "cke-rider", storagePrefix: "cke-rider", storage: SecureStore }),
      ],
    })
  : null;

// The cookie for API calls and staff photos. Image requests need their headers straight away, so
// the current value is kept here and refreshed whenever the session changes.
let cookie = "";
export const sessionCookie = () => cookie;
export async function refreshCookie() {
  cookie = authClient ? await authClient.getCookie() : "";
  return cookie;
}

/** Plain-English messages for what the API can answer at sign-in. */
export function signInError(e: { status?: number; code?: string; message?: string } | null) {
  if (!e) return "Can’t reach CKE right now. Check the connection and try again.";
  if (e.status === 429) return "Too many tries. Wait a minute, then try again.";
  if (e.code === "ACCOUNT_DEACTIVATED") return "This account is deactivated. Ask a manager.";
  if (e.code === "INVALID_USERNAME_OR_PASSWORD" || e.status === 401)
    return "That username and password don’t match. Ask your manager if you’re stuck.";
  return "Can’t reach CKE right now. Check the connection and try again.";
}
