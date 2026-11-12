import type { MiddlewareHandler } from "hono";

/** Who is making a change. `id` is a staff or customer user ID, or null for the system. */
export type Actor = { id: string | null };

/**
 * Write guard until sign-in exists (build step 4, next). Changes are refused unless the local
 * development setting ALLOW_UNSIGNED_WRITES is "true" (set in .dev.vars on the laptop only), so a
 * deployed Worker can't be changed by anyone before Better Auth checks roles. Better Auth replaces
 * this with the signed-in person and a role check per route.
 */
export const requireWriter: MiddlewareHandler<{
  Bindings: Env;
  Variables: { actor: Actor };
}> = async (c, next) => {
  if (c.env.ALLOW_UNSIGNED_WRITES !== "true") {
    return c.json({ error: "Sign in to make changes" }, 401);
  }
  c.set("actor", { id: null });
  await next();
};
