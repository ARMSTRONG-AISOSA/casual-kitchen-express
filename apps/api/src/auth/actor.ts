import type { StaffRole } from "@cke/types";
import { eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { createAuth } from "./auth";

/**
 * Who is making a request (architecture.md 4.5): the signed-in person, recorded against every
 * change. Staff carry their staff code and role; customers have no staff fields.
 */
export type Actor = {
  id: string;
  name: string;
  role: StaffRole | "customer";
  staffCode: string | null;
  isOwner: boolean;
  mustChangePassword: boolean;
};

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** Reads the session from the request (cookie from the apps) and looks up the person. */
export async function readActor(c: Context<Ctx>): Promise<Actor | null> {
  const auth = createAuth(c.env, c.get("db"), new URL(c.req.url).origin);
  const found = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!found) return null;
  const [staff] = await c
    .get("db")
    .select()
    .from(t.staffProfile)
    .where(eq(t.staffProfile.userId, found.user.id));
  if (staff) {
    // A deactivated person is signed out straight away (3.1), even with a session still open.
    if (staff.status !== "active") return null;
    return {
      id: found.user.id,
      name: staff.fullName,
      role: staff.role,
      staffCode: staff.code,
      isOwner: staff.isOwner,
      mustChangePassword: staff.mustChangePassword,
    };
  }
  return {
    id: found.user.id,
    name: found.user.name,
    role: "customer",
    staffCode: null,
    isOwner: false,
    mustChangePassword: false,
  };
}

/**
 * Lets a request through only for a signed-in person with one of these roles (3.0). Attached to
 * each route itself rather than as wildcard middleware, so a router quirk can't skip it.
 * Staff who must still change their temporary password can only do that (12.1).
 */
export const requireRole =
  (...roles: Actor["role"][]): MiddlewareHandler<Ctx> =>
  async (c, next) => {
    const actor = await readActor(c);
    if (!actor) return c.json({ error: "Sign in to continue" }, 401);
    if (actor.mustChangePassword)
      return c.json({ error: "Set a new password first", mustChangePassword: true }, 403);
    if (!roles.includes(actor.role))
      return c.json({ error: "Your account can’t do that. Ask a manager." }, 403);
    c.set("actor", actor);
    await next();
  };

export const STAFF_ROLES: StaffRole[] = ["rider", "kitchen", "dispatch", "accounts", "manager"];
