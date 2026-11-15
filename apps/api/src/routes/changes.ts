import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertViews } from "../orders/alerts";
import { fits, queueOrders, riderDeliveries, riderLoad } from "../orders/riders";
import { customerViews, loadOrders } from "../orders/view";
import { latestChange } from "./orders";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** More changes than this means the app was away a long time: it reloads its screen instead. */
const MAX = 300;

/**
 * GET /changes?since=N: what changed since the last change number the app saw, in one small call
 * when it reconnects or comes back to the foreground (architecture.md 14.4, decision 4). While
 * connected, the live connection (GET /live) sends each change as it happens.
 * - Staff: the orders that changed (with their lines), and alerts opened or cleared.
 * - A customer: only their own orders.
 * - A rider: their queue and deliveries as they are now (both are small), in the same one call.
 * `latest` is the number to send next time; `reload` says there was too much to send.
 */
export const changes = new Hono<Ctx>().get(
  "/",
  requireRole("kitchen", "dispatch", "accounts", "manager", "customer", "rider"),
  zValidator("query", z.object({ since: z.coerce.number().int().min(0) })),
  async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const { since } = c.req.valid("query");
    const latest = await latestChange(db);

    if (actor.role === "rider") {
      const r = await riderLoad(db, actor.id);
      const queue = r.online
        ? (await queueOrders(db))
            .filter((q) => fits(r, q))
            .map(({ lat: _a, lng: _b, ...card }) => card)
        : [];
      return c.json({
        queue,
        deliveries: await riderDeliveries(db, actor.id),
        latest,
        reload: false,
      });
    }

    const newer = gt(t.order.version, since);
    const rows = await db
      .select()
      .from(t.order)
      .where(actor.role === "customer" ? and(newer, eq(t.order.customerId, actor.id)) : newer)
      .orderBy(asc(t.order.version))
      .limit(MAX + 1);
    if (rows.length > MAX) return c.json({ orders: [], alerts: [], latest, reload: true });
    if (actor.role === "customer")
      return c.json({
        orders: await customerViews(db, c.env.BETTER_AUTH_SECRET, rows),
        latest,
        reload: false,
      });

    const changedAlerts =
      actor.role === "accounts"
        ? []
        : await db
            .select({ id: t.alert.id })
            .from(t.alert)
            .where(gt(t.alert.version, since))
            .limit(MAX);
    return c.json({
      orders: await loadOrders(db, rows, false),
      alerts: changedAlerts.length
        ? await alertViews(db, { ids: changedAlerts.map((a) => a.id) })
        : [],
      latest,
      reload: false,
    });
  },
);
