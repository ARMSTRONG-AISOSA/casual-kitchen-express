import { createApiClient } from "@cke/api-client";
import { sessionCookie } from "./auth";

/**
 * The API, when EXPO_PUBLIC_API_URL is set (apps/business/.env, see .env.example). Without it the
 * app runs on its demo data, as before. Sign-in, the soup rotation, photos, and staff photos use
 * the API so far; the rest moves over in build step 6.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL;

// Set by the session provider: what to do when the API says the session has ended (a manager
// reset the password or deactivated the account, or it expired).
let onSignedOut: () => void = () => {};
export const whenSignedOut = (fn: () => void) => {
  onSignedOut = fn;
};

export const api = baseUrl
  ? createApiClient({
      baseUrl,
      getHeaders: (): Record<string, string> => {
        const c = sessionCookie();
        return c ? { Cookie: c } : {};
      },
      onUnauthorized: () => onSignedOut(),
    })
  : null;
