import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { customerViews, loadOrders } from "../orders/view";
import { latestChange } from "./orders";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** More changes than this means the app was away a long time: it reloads its screen instead. */
const MAX = 300;

/**
 * GET /changes?since=N: only what changed since the last change number the app saw, in one small
 * call when it reconnects or comes back to the foreground (architecture.md 14.4, decision 4).
 * Staff get the orders that changed (with their lines); a customer gets only their own orders.
 * `latest` is the number to send next time. `reload` says there was too much to send.
 */
export const changes = new Hono<Ctx>().get(
  "/",
  requireRole("kitchen", "dispatch", "accounts", "manager", "customer"),
  zValidator("query", z.object({ since: z.coerce.number().int().min(0) })),
  async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const { since } = c.req.valid("query");
    const latest = await latestChange(db);
    const newer = gt(t.order.version, since);
    const rows = await db
      .select()
      .from(t.order)
      .where(actor.role === "customer" ? and(newer, eq(t.order.customerId, actor.id)) : newer)
      .orderBy(asc(t.order.version))
      .limit(MAX + 1);
    if (rows.length > MAX) return c.json({ orders: [], latest, reload: true });
    const orders =
      actor.role === "customer"
        ? await customerViews(db, c.env.BETTER_AUTH_SECRET, rows)
        : await loadOrders(db, rows, false);
    return c.json({ orders, latest, reload: false });
  },
);
