import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { hashPassword, verifyPassword } from "./password";
import { rateLimitStorage } from "./rate-limit";

/** The apps' own link schemes, which Better Auth's Expo plugin sends as the request origin. */
const APP_ORIGINS = ["cke-business://", "cke-rider://", "cke-customer://"];

/**
 * Better Auth, created for each request because the database connection is per request
 * (architecture.md 12.2). Riders, kitchen staff, dispatch officers, and account officers sign in
 * with a username and a password a manager set; customers and managers use Google, through Better
 * Auth's browser-based flow (12.2, no native library). There is no password sign-up and no
 * forgot-password: a manager creates every staff account and resets passwords (12.1). A manager is
 * added by their Google email, and their first Google sign-in links to that account.
 */
export function createAuth(env: Env, db: Db, origin: string) {
  return betterAuth({
    appName: "Casual Kitchen Express",
    baseURL: origin,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: t.user,
        session: t.session,
        account: t.account,
        verification: t.verification,
      },
    }),
    user: {
      // The system role (customer, rider, kitchen, dispatch, accounts, manager). Only the API sets it.
      additionalFields: { role: { type: "string", required: false, input: false } },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    // Riders and customers rarely sign in again (12.1): 30 days, renewed once a day while used.
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    // Google is on once the client from the owner's Google Cloud project is in the environment
    // (.dev.vars locally, `wrangler secret put` when deployed). Its redirect address is
    // <API address>/api/auth/callback/google.
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              // Shared phones often have more than one Google account.
              prompt: "select_account",
            },
          }
        : {},
    // Google confirms the email, so a Google sign-in joins the manager account added by that email.
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 }), expo()],
    trustedOrigins: [...APP_ORIGINS, "exp://"],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/username": { window: 60, max: 5 },
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-in/social": { window: 60, max: 10 },
        "/change-password": { window: 60, max: 5 },
      },
      customStorage: rateLimitStorage(env),
    },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    databaseHooks: {
      session: {
        create: {
          // A deactivated staff member can't sign in (3.1). Customers are handled at sign-in
          // with Google, where deactivated accounts are offered reactivation (CUS-25).
          before: async (session) => {
            const [staff] = await db
              .select({ status: t.staffProfile.status })
              .from(t.staffProfile)
              .where(eq(t.staffProfile.userId, session.userId));
            if (staff && staff.status !== "active")
              throw new APIError("FORBIDDEN", {
                message: "This account is deactivated. Ask a manager.",
                code: "ACCOUNT_DEACTIVATED",
              });
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
