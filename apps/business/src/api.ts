import { createApiClient } from "@cke/api-client";

/**
 * The API, when EXPO_PUBLIC_API_URL is set (apps/business/.env, see .env.example). Without it the
 * app runs on its demo data, as before. Only the soup rotation uses the API so far; the rest moves
 * over in build step 6.
 */
const baseUrl = process.env.EXPO_PUBLIC_API_URL;
export const api = baseUrl ? createApiClient({ baseUrl }) : null;
