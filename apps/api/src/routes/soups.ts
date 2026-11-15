import { soupName } from "@cke/validation";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { requireRole, type Actor } from "../auth/actor";
import { catalogMessage, send } from "../live/publish";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Every menu or customer-facing setting change raises the catalog version (14.4, decision 1). */
const bumpCatalog = (tx: Tx, actor: Actor) =>
  tx
    .update(t.setting)
    .set({
      catalogVersion: sql`${t.setting.catalogVersion} + 1`,
      updatedAt: new Date(),
      updatedBy: actor.id,
    })
    .where(eq(t.setting.id, 1));

const activeSoups = (tx: Tx) =>
  tx
    .select({ id: t.soupVariety.id, name: t.soupVariety.name })
    .from(t.soupVariety)
    .where(eq(t.soupVariety.active, true))
    .orderBy(asc(t.soupVariety.sortOrder));

const bad = (message: string) => ({ error: message });
type SoupRow = { id: string; name: string };
type Refused = { status: 404 | 409; error: string };

/**
 * The soup of the day rotation (KIT-17). Managers add and remove soups on the Menu screen; kitchen
 * staff and managers pick today's soup. A removed soup is archived, not erased, because past orders
 * point to it. Adding its name again brings it back.
 */
export const soups = new Hono<Ctx>()
  .post(
    "/",
    requireRole("manager"),
    zValidator("json", z.object({ name: soupName })),
    async (c) => {
      const actor = c.get("actor");
      const name = c.req.valid("json").name;
      const result = await c.get("db").transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(t.soupVariety)
          .where(sql`lower(${t.soupVariety.name}) = lower(${name})`);
        if (existing?.active) return { conflict: `${existing.name} is already in the rotation` };
        const [{ next }] = (await tx
          .select({ next: sql<number>`coalesce(max(${t.soupVariety.sortOrder}), -1) + 1` })
          .from(t.soupVariety)) as [{ next: number }];
        const [soup] = existing
          ? await tx
              .update(t.soupVariety)
              .set({ active: true, name, sortOrder: next })
              .where(eq(t.soupVariety.id, existing.id))
              .returning({ id: t.soupVariety.id, name: t.soupVariety.name })
          : await tx
              .insert(t.soupVariety)
              .values({ name, sortOrder: next })
              .returning({ id: t.soupVariety.id, name: t.soupVariety.name });
        await bumpCatalog(tx, actor);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Added ${name} to the soup rotation`,
          target: `soup:${soup!.id}`,
          after: { name },
        });
        return { soup: soup!, soups: await activeSoups(tx) };
      });
      if ("conflict" in result) return c.json(bad(result.conflict!), 409);
      send(c, await catalogMessage(c.get("db")));
      return c.json(result, 201);
    },
  )
  .delete(
    "/:id",
    requireRole("manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const result = await c
        .get("db")
        .transaction(async (tx): Promise<Refused | { soups: SoupRow[] }> => {
          const [soup] = await tx
            .select()
            .from(t.soupVariety)
            .where(and(eq(t.soupVariety.id, id), eq(t.soupVariety.active, true)));
          if (!soup) return { status: 404 as const, error: "That soup isn’t in the rotation" };
          const [s] = await tx.select().from(t.setting).where(eq(t.setting.id, 1));
          if (s?.soupVarietyId === id)
            return {
              status: 409 as const,
              error: `${soup.name} is today’s soup. Pick another soup of the day first.`,
            };
          const left = await activeSoups(tx);
          if (left.length <= 1)
            return { status: 409 as const, error: "Keep at least one soup in the rotation" };
          await tx.update(t.soupVariety).set({ active: false }).where(eq(t.soupVariety.id, id));
          await bumpCatalog(tx, actor);
          await tx.insert(t.auditLog).values({
            actorId: actor.id,
            kind: "setting",
            action: `Removed ${soup.name} from the soup rotation`,
            target: `soup:${id}`,
            before: { name: soup.name },
          });
          return { soups: await activeSoups(tx) };
        });
      if ("status" in result) return c.json(bad(result.error), result.status);
      send(c, await catalogMessage(c.get("db")));
      return c.json(result);
    },
  );

/** PUT /settings/soup-of-the-day: kitchen staff (on Sold out) and managers (KIT-17). */
export const soupOfTheDay = new Hono<Ctx>().put(
  "/",
  requireRole("kitchen", "manager"),
  zValidator("json", z.object({ soupId: z.uuid() })),
  async (c) => {
    const actor = c.get("actor");
    const { soupId } = c.req.valid("json");
    const result = await c.get("db").transaction(async (tx) => {
      const [soup] = await tx
        .select()
        .from(t.soupVariety)
        .where(and(eq(t.soupVariety.id, soupId), eq(t.soupVariety.active, true)));
      if (!soup) return { error: "That soup isn’t in the rotation" };
      await tx.update(t.setting).set({ soupVarietyId: soupId }).where(eq(t.setting.id, 1));
      await bumpCatalog(tx, actor);
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "setting",
        action: `Set the soup of the day to ${soup.name}`,
        target: `soup:${soupId}`,
        after: { name: soup.name },
      });
      return { soupOfTheDay: { id: soup.id, name: soup.name } };
    });
    if (!("soupOfTheDay" in result)) return c.json(bad(result.error), 404);
    send(c, await catalogMessage(c.get("db")));
    return c.json(result);
  },
);
