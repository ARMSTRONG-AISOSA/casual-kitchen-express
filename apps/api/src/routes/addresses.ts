import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import { ensureCustomer } from "../auth/customer";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import type { Tx } from "../orders/store";
import { insideBoundary } from "./orders";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** A Nigerian phone number, stored as typed without spaces: 0803…, +234803…, or 234803…. */
const phone = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .refine(
    (s) => /^(\+?234|0)[789][01]\d{8}$/.test(s),
    "Enter a Nigerian phone number, for example 0803 123 4567",
  );

const fields = z.object({
  label: z.string().trim().min(1, "Give it a name, for example Home").max(30),
  street: z.string().trim().max(100).optional(),
  landmark: z.string().trim().max(100).optional(),
  neighbourhoodId: z.uuid(),
  contactPhone: phone,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

const view = (a: typeof t.address.$inferSelect, area: string) => ({
  id: a.id,
  label: a.label,
  street: a.street,
  landmark: a.landmark,
  neighbourhoodId: a.neighbourhoodId,
  neighbourhood: area,
  contactPhone: a.contactPhone,
  lat: a.lat,
  lng: a.lng,
  isDefault: a.isDefault,
});

/** Whether a pin in this area can be delivered to (4.7): the area is in range, and the pin is inside the boundary once drawn. */
async function deliverable(tx: Tx | Db, neighbourhoodId: string, lat: number, lng: number) {
  const [[area], [s]] = await Promise.all([
    tx.select().from(t.neighbourhood).where(eq(t.neighbourhood.id, neighbourhoodId)),
    tx.select({ boundary: t.setting.boundary }).from(t.setting).where(eq(t.setting.id, 1)),
  ]);
  if (!area) return { area: null, ok: false };
  return {
    area,
    ok: area.inRange && (!s?.boundary?.length || insideBoundary(s.boundary, lng, lat)),
  };
}

/** Makes one address the default (and the profile's default address). */
async function makeDefault(tx: Tx, userId: string, id: string) {
  await tx
    .update(t.address)
    .set({ isDefault: false })
    .where(and(eq(t.address.userId, userId), ne(t.address.id, id)));
  await tx.update(t.address).set({ isDefault: true }).where(eq(t.address.id, id));
  await tx
    .update(t.customerProfile)
    .set({ defaultAddressId: id })
    .where(eq(t.customerProfile.userId, userId));
}

async function list(db: Db | Tx, userId: string) {
  const rows = await db
    .select({ a: t.address, area: t.neighbourhood.name })
    .from(t.address)
    .innerJoin(t.neighbourhood, eq(t.neighbourhood.id, t.address.neighbourhoodId))
    .where(and(eq(t.address.userId, userId), eq(t.address.archived, false)))
    .orderBy(asc(t.address.createdAt));
  return rows.map((r) => view(r.a, r.area));
}

const OUTSIDE = {
  error: "We don’t deliver there yet. You can still pick up your order.",
  outsideRange: true,
};

/**
 * The customer's address book (CUS-14, 4.7), mounted at /me/addresses: label, area, street or
 * landmark, contact phone, map pin, and default. No address search is needed. An address outside
 * the delivery range can't be saved for delivery (CUS-23); the app offers pickup instead.
 */
export const addresses = new Hono<Ctx>()
  .get("/", requireRole("customer"), async (c) =>
    c.json({ addresses: await list(c.get("db"), c.get("actor").id) }),
  )

  .post("/", requireRole("customer"), zValidator("json", fields), async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const body = c.req.valid("json");
    await ensureCustomer(db, actor);
    const result = await db.transaction(async (tx) => {
      const check = await deliverable(tx, body.neighbourhoodId, body.lat, body.lng);
      if (!check.area)
        return { status: 400 as const, body: { error: "Pick your area from the list" } };
      if (!check.ok) return { status: 409 as const, body: OUTSIDE };
      const { isDefault, ...values } = body;
      const [made] = await tx
        .insert(t.address)
        .values({ ...values, userId: actor.id })
        .returning();
      const count = (await list(tx, actor.id)).length;
      if (isDefault || count === 1) await makeDefault(tx, actor.id, made!.id); // the first address is the default
      return { status: 201 as const, body: { addresses: await list(tx, actor.id), id: made!.id } };
    });
    return c.json(result.body, result.status);
  })

  .patch(
    "/:id",
    requireRole("customer"),
    zValidator("param", z.object({ id: z.uuid() })),
    zValidator("json", fields.partial()),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await db.transaction(async (tx) => {
        const [a] = await tx
          .select()
          .from(t.address)
          .where(
            and(
              eq(t.address.id, id),
              eq(t.address.userId, actor.id),
              eq(t.address.archived, false),
            ),
          );
        if (!a)
          return {
            status: 404 as const,
            body: { error: "That address isn’t in your address book" },
          };
        const next = {
          neighbourhoodId: body.neighbourhoodId ?? a.neighbourhoodId,
          lat: body.lat ?? a.lat,
          lng: body.lng ?? a.lng,
        };
        const check = await deliverable(tx, next.neighbourhoodId, next.lat, next.lng);
        if (!check.area)
          return { status: 400 as const, body: { error: "Pick your area from the list" } };
        if (!check.ok) return { status: 409 as const, body: OUTSIDE };
        const { isDefault, ...values } = body;
        if (Object.keys(values).length)
          await tx.update(t.address).set(values).where(eq(t.address.id, id));
        if (isDefault) await makeDefault(tx, actor.id, id);
        return { status: 200 as const, body: { addresses: await list(tx, actor.id) } };
      });
      return c.json(result.body, result.status);
    },
  )

  /** DELETE /me/addresses/:id: past orders point to it, so it's archived, not erased. */
  .delete(
    "/:id",
    requireRole("customer"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const result = await db.transaction(async (tx) => {
        // Read it first: whether it was the default decides who becomes the default next.
        const [a] = await tx
          .select({ isDefault: t.address.isDefault })
          .from(t.address)
          .where(
            and(
              eq(t.address.id, id),
              eq(t.address.userId, actor.id),
              eq(t.address.archived, false),
            ),
          );
        if (!a) return null;
        await tx
          .update(t.address)
          .set({ archived: true, isDefault: false })
          .where(eq(t.address.id, id));
        const rest = await list(tx, actor.id);
        // The next address becomes the default, if the default was removed.
        if (a.isDefault) {
          if (rest[0]) await makeDefault(tx, actor.id, rest[0].id);
          else
            await tx
              .update(t.customerProfile)
              .set({ defaultAddressId: null })
              .where(eq(t.customerProfile.userId, actor.id));
        }
        return list(tx, actor.id);
      });
      if (!result) return c.json({ error: "That address isn’t in your address book" }, 404);
      return c.json({ addresses: result });
    },
  );
