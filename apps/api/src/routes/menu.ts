import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { catalogMessage, send } from "../live/publish";
import type { Tx } from "../orders/store";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** Every menu change raises the catalog version, so apps fetch the menu again (14.4, decision 1). */
const bumpCatalog = (tx: Tx, actor: Actor) =>
  tx
    .update(t.setting)
    .set({
      catalogVersion: sql`${t.setting.catalogVersion} + 1`,
      updatedAt: new Date(),
      updatedBy: actor.id,
    })
    .where(eq(t.setting.id, 1));

const naira = z.number().int().min(0).max(1_000_000);
const option = z.object({
  name: z.string().trim().min(1).max(40),
  priceChange: naira,
  isDefault: z.boolean().default(false),
});
const itemFields = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2, "Enter the dish’s name").max(60),
  description: z.string().trim().max(200).default(""),
  price: naira.refine((n) => n > 0, "Enter a price"),
  station: z.enum(t.station.enumValues),
  load: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isSoup: z.boolean().default(false),
  // The full list of choices (one protein, one swallow, and so on). Sending it replaces the list.
  options: z
    .array(option)
    .max(12)
    .refine((o) => o.filter((x) => x.isDefault).length <= 1, "Only one choice can be the default")
    .optional(),
});

/** Saves an item's choices, making the first one the default when none is marked (CUS-03). */
async function saveOptions(tx: Tx, itemId: string, list: z.infer<typeof option>[]) {
  await tx.delete(t.itemOption).where(eq(t.itemOption.itemId, itemId));
  if (!list.length) return;
  const anyDefault = list.some((o) => o.isDefault);
  await tx.insert(t.itemOption).values(
    list.map((o, i) => ({
      ...o,
      itemId,
      isDefault: anyDefault ? o.isDefault : i === 0,
      sortOrder: i,
    })),
  );
}

/** A full item with its choices, as the Menu screen and the item editor show it. */
async function itemView(tx: Tx | Db, id: string) {
  const [item] = await tx.select().from(t.menuItem).where(eq(t.menuItem.id, id));
  if (!item) return null;
  const options = await tx
    .select({
      id: t.itemOption.id,
      name: t.itemOption.name,
      priceChange: t.itemOption.priceChange,
      isDefault: t.itemOption.isDefault,
    })
    .from(t.itemOption)
    .where(eq(t.itemOption.itemId, id))
    .orderBy(asc(t.itemOption.sortOrder));
  return { ...item, options };
}

/**
 * Menu management (MGR-05, MGR-07, MGR-08) and the sold-out switch (KIT-08). Managers add, edit,
 * and archive items; kitchen staff and managers mark items sold out. An item in past orders is
 * archived, never erased (9). Price changes are written to the audit log (9, Setting).
 */
export const menu = new Hono<Ctx>()
  /** GET /menu: every item with its station and archived items, for the manager's Menu screen. */
  .get("/", requireRole("kitchen", "manager"), async (c) => {
    const db = c.get("db");
    const [categories, items, options] = await Promise.all([
      db.select().from(t.menuCategory).orderBy(asc(t.menuCategory.sortOrder)),
      db.select().from(t.menuItem).orderBy(asc(t.menuItem.sortOrder)),
      db.select().from(t.itemOption).orderBy(asc(t.itemOption.sortOrder)),
    ]);
    return c.json({
      categories: categories.map((cat) => ({
        ...cat,
        items: items
          .filter((i) => i.categoryId === cat.id)
          .map((i) => ({
            ...i,
            options: options
              .filter((o) => o.itemId === i.id)
              .map((o) => ({
                id: o.id,
                name: o.name,
                priceChange: o.priceChange,
                isDefault: o.isDefault,
              })),
          })),
      })),
    });
  })

  .post(
    "/categories",
    requireRole("manager"),
    zValidator("json", z.object({ name: z.string().trim().min(2).max(40) })),
    async (c) => {
      const actor = c.get("actor");
      const { name } = c.req.valid("json");
      const category = await c.get("db").transaction(async (tx) => {
        const [{ next }] = (await tx
          .select({ next: sql<number>`coalesce(max(${t.menuCategory.sortOrder}), -1) + 1` })
          .from(t.menuCategory)) as [{ next: number }];
        const [made] = await tx
          .insert(t.menuCategory)
          .values({ name, sortOrder: next })
          .returning();
        await bumpCatalog(tx, actor);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Added the ${name} category`,
          target: `category:${made!.id}`,
          after: { name },
        });
        return made!;
      });
      send(c, await catalogMessage(c.get("db")));
      return c.json({ category }, 201);
    },
  )

  .patch(
    "/categories/:id",
    requireRole("manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    zValidator(
      "json",
      z.object({
        name: z.string().trim().min(2).max(40).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    ),
    async (c) => {
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const changes = c.req.valid("json");
      const category = await c.get("db").transaction(async (tx) => {
        const [made] = await tx
          .update(t.menuCategory)
          .set(changes)
          .where(eq(t.menuCategory.id, id))
          .returning();
        if (!made) return null;
        await bumpCatalog(tx, actor);
        return made;
      });
      if (!category) return c.json({ error: "That category doesn’t exist" }, 404);
      send(c, await catalogMessage(c.get("db")));
      return c.json({ category });
    },
  )

  .post("/items", requireRole("manager"), zValidator("json", itemFields), async (c) => {
    const actor = c.get("actor");
    const { options, ...fields } = c.req.valid("json");
    const result = await c.get("db").transaction(async (tx) => {
      const [cat] = await tx
        .select()
        .from(t.menuCategory)
        .where(eq(t.menuCategory.id, fields.categoryId));
      if (!cat) return null;
      const [{ next }] = (await tx
        .select({ next: sql<number>`coalesce(max(${t.menuItem.sortOrder}), -1) + 1` })
        .from(t.menuItem)
        .where(eq(t.menuItem.categoryId, fields.categoryId))) as [{ next: number }];
      const [made] = await tx
        .insert(t.menuItem)
        .values({ ...fields, sortOrder: next })
        .returning();
      await saveOptions(tx, made!.id, options ?? []);
      await bumpCatalog(tx, actor);
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "setting",
        action: `Added ${fields.name} to the menu at ₦${fields.price.toLocaleString("en-NG")}`,
        target: `item:${made!.id}`,
        after: { name: fields.name, price: fields.price },
      });
      return itemView(tx, made!.id);
    });
    if (!result) return c.json({ error: "Choose a category" }, 400);
    send(c, await catalogMessage(c.get("db")));
    return c.json({ item: result }, 201);
  })

  .patch(
    "/items/:id",
    requireRole("manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    zValidator(
      "json",
      itemFields.partial().extend({ sortOrder: z.number().int().min(0).optional() }),
    ),
    async (c) => {
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const { options, ...fields } = c.req.valid("json");
      const result = await c.get("db").transaction(async (tx) => {
        const [before] = await tx.select().from(t.menuItem).where(eq(t.menuItem.id, id));
        if (!before) return null;
        if (Object.keys(fields).length)
          await tx.update(t.menuItem).set(fields).where(eq(t.menuItem.id, id));
        if (options) await saveOptions(tx, id, options);
        await bumpCatalog(tx, actor);
        if (fields.price !== undefined && fields.price !== before.price)
          await tx.insert(t.auditLog).values({
            actorId: actor.id,
            kind: "setting",
            action: `Changed the price of ${fields.name ?? before.name} from ₦${before.price.toLocaleString("en-NG")} to ₦${fields.price.toLocaleString("en-NG")}`,
            target: `item:${id}`,
            before: { price: before.price },
            after: { price: fields.price },
          });
        return itemView(tx, id);
      });
      if (!result) return c.json({ error: "That item doesn’t exist" }, 404);
      send(c, await catalogMessage(c.get("db")));
      return c.json({ item: result });
    },
  )

  /** PUT /menu/items/:id/availability: sold out or back on (KIT-08), from the board or Menu. */
  .put(
    "/items/:id/availability",
    requireRole("kitchen", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    zValidator("json", z.object({ available: z.boolean() })),
    async (c) => {
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const { available } = c.req.valid("json");
      const result = await c.get("db").transaction(async (tx) => {
        const [item] = await tx
          .update(t.menuItem)
          .set({ available })
          .where(and(eq(t.menuItem.id, id), eq(t.menuItem.archived, false)))
          .returning({ id: t.menuItem.id, name: t.menuItem.name, available: t.menuItem.available });
        if (!item) return null;
        await bumpCatalog(tx, actor);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "other",
          action: available ? `Put ${item.name} back on` : `Marked ${item.name} sold out`,
          target: `item:${id}`,
          after: { available },
        });
        return item;
      });
      if (!result) return c.json({ error: "That item isn’t on the menu" }, 404);
      send(c, await catalogMessage(c.get("db")));
      return c.json({ item: result });
    },
  )

  /** DELETE /menu/items/:id: takes the item off the menu. Past orders keep it, so it's archived. */
  .delete(
    "/items/:id",
    requireRole("manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const ok = await c.get("db").transaction(async (tx) => {
        const [item] = await tx
          .update(t.menuItem)
          .set({ archived: true })
          .where(and(eq(t.menuItem.id, id), eq(t.menuItem.archived, false)))
          .returning({ name: t.menuItem.name });
        if (!item) return false;
        await bumpCatalog(tx, actor);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Took ${item.name} off the menu`,
          target: `item:${id}`,
          before: { name: item.name },
        });
        return true;
      });
      if (!ok) return c.json({ error: "That item isn’t on the menu" }, 404);
      send(c, await catalogMessage(c.get("db")));
      return c.json({ ok: true });
    },
  );
