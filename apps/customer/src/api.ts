import { createApiClient } from "@cke/api-client";
import { sessionCookie } from "./auth";

/**
 * The API, when EXPO_PUBLIC_API_URL is set (apps/customer/.env, see .env.example). Without it the
 * app runs on its demo data, as before. The soup of the day, photos, and Google sign-in use the API
 * so far; the rest moves over in build step 6.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL;
export const api = baseUrl
  ? createApiClient({
      baseUrl,
      getHeaders: (): Record<string, string> => {
        const c = sessionCookie();
        return c ? { Cookie: c } : {};
      },
    })
  : null;
