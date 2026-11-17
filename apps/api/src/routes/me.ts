import { newPassword } from "@cke/validation";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { readActor, type Actor } from "../auth/actor";
import { ensureCustomer } from "../auth/customer";
import { createAuth } from "../auth/auth";
import { STAFF_EMAIL_DOMAIN } from "../auth/staff-email";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { webpSize } from "../media/webp";
import { dropIfUnused } from "./photos";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** The signed-in person (architecture.md 4.5 and 12.1). */
export const me = new Hono<Ctx>()
  /** GET /me: who is signed in, for the top bar, the menus by role (3.0), and first sign-in. */
  .get("/", async (c) => {
    const actor = await readActor(c);
    if (!actor) return c.json({ error: "Sign in to continue" }, 401);
    // Staff see their own details on Profile and the rider's Me tab (MGR-03, RID-21).
    let profile = {
      photoId: null,
      jobTitle: null,
      phone: null,
      homeAddress: null,
      gender: null,
    } as {
      photoId: string | null;
      jobTitle: string | null;
      phone: string | null;
      homeAddress: string | null;
      gender: "female" | "male" | "prefer_not_to_say" | null;
    };
    if (actor.staffCode) {
      const [row] = await c
        .get("db")
        .select({
          photoId: t.staffProfile.photoId,
          jobTitle: t.staffProfile.jobTitle,
          phone: t.staffProfile.phone,
          homeAddress: t.staffProfile.homeAddress,
          gender: t.staffProfile.gender,
        })
        .from(t.staffProfile)
        .where(eq(t.staffProfile.userId, actor.id));
      if (row) profile = row;
    }
    // A customer's profile row is made at their first visit, with their customer ID (CUS-27).
    let customerCode: string | null = null;
    if (actor.role === "customer") {
      const cp = await ensureCustomer(c.get("db"), actor);
      customerCode = cp.code;
      profile = { ...profile, photoId: cp.photoId, gender: cp.gender };
      actor.name = cp.name;
    }
    // The email from Google, shown on the customer's profile (CUS-21). Staff emails are internal.
    const [u] = await c
      .get("db")
      .select({ email: t.user.email })
      .from(t.user)
      .where(eq(t.user.id, actor.id));
    const email = u && !u.email.endsWith(STAFF_EMAIL_DOMAIN) ? u.email : null;
    c.header("Cache-Control", "no-store");
    return c.json({ ...actor, ...profile, customerCode, email });
  })
  /** PATCH /me: a customer changes their name or gender on Profile (CUS-15). */
  .patch(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string().trim().min(2, "Enter your name").max(80).optional(),
        gender: z.enum(["female", "male", "prefer_not_to_say"]).nullable().optional(),
      }),
    ),
    async (c) => {
      const actor = await readActor(c);
      if (actor?.role !== "customer") return c.json({ error: "Sign in to continue" }, 401);
      await ensureCustomer(c.get("db"), actor);
      const body = c.req.valid("json");
      await c
        .get("db")
        .update(t.customerProfile)
        .set(body)
        .where(eq(t.customerProfile.userId, actor.id));
      return c.json({ ok: true });
    },
  )
  /**
   * PUT /me/photo: a customer adds or replaces their profile photo (CUS-15, CUS-16), compressed on
   * the phone first (8.1: square, up to 512 px and 80 KB, WebP). The old photo is deleted (8.3).
   * DELETE /me/photo removes it. The photo is private to the customer (and managers and dispatch).
   */
  /**
   * PUT /me/push-token: this device's Expo push token, for the app it's in (10). Saved at sign-in
   * and when the rider changes Sound; a device that signs in as someone else moves to them.
   */
  .put(
    "/push-token",
    zValidator(
      "json",
      z.object({
        token: z.string().min(10).max(200),
        app: z.enum(t.pushApp.enumValues),
        sound: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const actor = await readActor(c);
      if (!actor) return c.json({ error: "Sign in to continue" }, 401);
      const { token, app, sound = true } = c.req.valid("json");
      const allowed =
        app === "customer"
          ? actor.role === "customer"
          : app === "rider"
            ? actor.role === "rider"
            : ["kitchen", "dispatch", "accounts", "manager"].includes(actor.role);
      if (!allowed) return c.json({ error: "That app isn’t for this account" }, 403);
      await c
        .get("db")
        .insert(t.pushToken)
        .values({ token, userId: actor.id, app, sound })
        .onConflictDoUpdate({
          target: t.pushToken.token,
          set: { userId: actor.id, app, sound, updatedAt: new Date() },
        });
      return c.json({ saved: true });
    },
  )

  /** DELETE /me/push-token: signing out on this device stops its notifications. */
  .delete(
    "/push-token",
    zValidator("json", z.object({ token: z.string().max(200) })),
    async (c) => {
      const actor = await readActor(c);
      if (!actor) return c.json({ error: "Sign in to continue" }, 401);
      await c
        .get("db")
        .delete(t.pushToken)
        .where(
          and(eq(t.pushToken.token, c.req.valid("json").token), eq(t.pushToken.userId, actor.id)),
        );
      return c.json({ removed: true });
    },
  )

  .put("/photo", async (c) => {
    const actor = await readActor(c);
    if (actor?.role !== "customer") return c.json({ error: "Sign in to continue" }, 401);
    const file = (await c.req.parseBody()).file;
    if (!(file instanceof File)) return c.json({ error: "Choose a photo first" }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = webpSize(bytes);
    if (!size) return c.json({ error: "Photos must be compressed to WebP by the app first" }, 400);
    if (bytes.length > 80_000 || Math.max(size.width, size.height) > 512)
      return c.json({ error: "The photo is too big. Up to 512 px and 80 KB." }, 413);
    const db = c.get("db");
    const profile = await ensureCustomer(db, actor);
    const path = `customer/${crypto.randomUUID()}.webp`;
    await c.env.MEDIA.put(path, bytes);
    let result: { id: string; oldPath: string | null };
    try {
      result = await db.transaction(async (tx) => {
        const [asset] = await tx
          .insert(t.mediaAsset)
          .values({
            ownerId: actor.id,
            path,
            bytes: bytes.length,
            width: size.width,
            height: size.height,
            format: "webp",
            title: profile.code,
          })
          .returning({ id: t.mediaAsset.id });
        await tx
          .update(t.customerProfile)
          .set({ photoId: asset!.id })
          .where(eq(t.customerProfile.userId, actor.id));
        return { id: asset!.id, oldPath: await dropIfUnused(tx, profile.photoId) };
      });
    } catch (e) {
      await c.env.MEDIA.delete(path); // nothing points to it
      throw e;
    }
    if (result.oldPath) await c.env.MEDIA.delete(result.oldPath);
    return c.json({ photoId: result.id });
  })
  .delete("/photo", async (c) => {
    const actor = await readActor(c);
    if (actor?.role !== "customer") return c.json({ error: "Sign in to continue" }, 401);
    const db = c.get("db");
    const profile = await ensureCustomer(db, actor);
    const oldPath = await db.transaction(async (tx) => {
      await tx
        .update(t.customerProfile)
        .set({ photoId: null })
        .where(eq(t.customerProfile.userId, actor.id));
      return dropIfUnused(tx, profile.photoId);
    });
    if (oldPath) await c.env.MEDIA.delete(oldPath);
    return c.json({ photoId: null });
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
