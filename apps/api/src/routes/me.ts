import { newPassword } from "@cke/validation";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { readActor, type Actor } from "../auth/actor";
import { createAuth } from "../auth/auth";
import type { Db } from "../db/client";
import * as t from "../db/schema";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** The signed-in person (architecture.md 4.5 and 12.1). */
export const me = new Hono<Ctx>()
  /** GET /me: who is signed in, for the top bar, the menus by role (3.0), and first sign-in. */
  .get("/", async (c) => {
    const actor = await readActor(c);
    if (!actor) return c.json({ error: "Sign in to continue" }, 401);
    let photoId: string | null = null;
    if (actor.staffCode) {
      const [row] = await c
        .get("db")
        .select({ photoId: t.staffProfile.photoId })
        .from(t.staffProfile)
        .where(eq(t.staffProfile.userId, actor.id));
      photoId = row?.photoId ?? null;
    }
    c.header("Cache-Control", "no-store");
    return c.json({ ...actor, photoId });
  })
  /**
   * POST /me/password: change your own password. Needed at the first sign-in and after a manager
   * resets it (mustChangePassword), and available any time from Profile (12.1).
   */
  .post(
    "/password",
    zValidator(
      "json",
      z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword }),
    ),
    async (c) => {
      const actor = await readActor(c);
      if (!actor?.staffCode) return c.json({ error: "Sign in to continue" }, 401);
      const body = c.req.valid("json");
      if (body.currentPassword === body.newPassword)
        return c.json({ error: "Choose a password different from the current one" }, 400);
      const auth = createAuth(c.env, c.get("db"), new URL(c.req.url).origin);
      try {
        await auth.api.changePassword({
          body: { currentPassword: body.currentPassword, newPassword: body.newPassword },
          headers: c.req.raw.headers,
        });
      } catch {
        return c.json({ error: "That current password isn’t right" }, 400);
      }
      await c.get("db").transaction(async (tx) => {
        await tx
          .update(t.staffProfile)
          .set({ mustChangePassword: false })
          .where(eq(t.staffProfile.userId, actor.id));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "account",
          action: `${actor.name} changed their password`,
          target: `staff:${actor.staffCode}`,
        });
      });
      return c.json({ ok: true });
    },
  );
