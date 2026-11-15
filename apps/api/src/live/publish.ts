import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertViews } from "../orders/alerts";
import { CARRYING, queueOrders, riderDeliveries, ridersPanel } from "../orders/riders";
import { customerViews, loadOrders } from "../orders/view";
import type { LiveMessage } from "./hub";

// What goes over the live connection after each change (architecture.md 10, 14.4). The changed
// record itself is sent, so the apps watching don't need to call the API. Each message carries the
// record's change number, so an app that reconnects asks /changes only for what came after.

/** Staff who watch orders live: the board, Orders, and the dashboard. */
const ORDER_WATCHERS = ["kitchen", "dispatch", "manager", "accounts"];
/** Staff who see alerts (design 6.4). */
const ALERT_WATCHERS = ["kitchen", "dispatch", "manager"];

/** The messages for changed orders: staff, the customer, the rider queue, and the rider. */
export async function orderMessages(
  db: Db,
  secret: string,
  orderIds: string[],
): Promise<LiveMessage[]> {
  const ids = [...new Set(orderIds)];
  if (!ids.length) return [];
  const rows = await db.select().from(t.order).where(inArray(t.order.id, ids));
  const messages: LiveMessage[] = [];

  // Staff: the board's shape, which has no customer phone or address.
  for (const order of await loadOrders(db, rows, false))
    messages.push({ to: ORDER_WATCHERS, data: { type: "order", order, version: order.version } });

  // Each customer: only their own order.
  const online = rows.filter((o) => o.customerId);
  const views = await customerViews(db, secret, online);
  online.forEach((o, i) =>
    messages.push({
      to: [`customer:${o.customerId}`],
      data: { type: "order", order: views[i], version: o.version },
    }),
  );

  // Riders' queue: a ready delivery appears; once taken or cancelled it disappears (RID-03, RID-04).
  const deliveries = rows.filter(
    (o) => o.type === "delivery" && ["ready", "rider_accepted", "cancelled"].includes(o.status),
  );
  if (deliveries.length) {
    const inQueue = await queueOrders(
      db,
      deliveries.map((o) => o.id),
    );
    for (const o of deliveries)
      messages.push({
        to: ["riders"],
        data: {
          type: "queue",
          orderId: o.id,
          item: inQueue.find((q) => q.orderId === o.id) ?? null,
          version: o.version,
        },
      });
  }

  // The rider carrying it: their delivery, or that it's gone (delivered, cancelled).
  const carried = await db
    .select({ orderId: t.delivery.orderId, riderId: t.delivery.riderId })
    .from(t.delivery)
    .where(inArray(t.delivery.orderId, ids));
  for (const riderId of new Set(carried.map((d) => d.riderId))) {
    const mine = carried.filter((d) => d.riderId === riderId).map((d) => d.orderId);
    for (const delivery of await riderDeliveries(db, riderId, mine))
      messages.push({
        to: [`rider:${riderId}`],
        data: {
          type: "delivery",
          delivery,
          removed: !(CARRYING as readonly string[]).includes(delivery.status),
          version: rows.find((o) => o.id === delivery.orderId)?.version,
        },
      });
  }
  // The riders panel changes too when a rider's load changes (DSP-03).
  if (carried.length)
    messages.push(...(await riderMessages(db, [...new Set(carried.map((d) => d.riderId))])));
  return messages;
}

/** Alerts, opened or cleared (MGR-14). */
export async function alertMessages(db: Db, alertIds: string[]): Promise<LiveMessage[]> {
  if (!alertIds.length) return [];
  return (await alertViews(db, { ids: [...new Set(alertIds)] })).map((alert) => ({
    to: ALERT_WATCHERS,
    data: { type: "alert", alert, version: alert.version },
  }));
}

/** The riders panel rows for these riders (online, load, what they carry). */
export async function riderMessages(db: Db, riderIds: string[]): Promise<LiveMessage[]> {
  if (!riderIds.length) return [];
  return (await ridersPanel(db, riderIds)).map((rider) => ({
    to: ["dispatch", "manager"],
    data: { type: "rider", rider, version: rider.version },
  }));
}

/** The menu or a customer-facing setting changed: apps fetch /bootstrap again (14.4, decision 1). */
export async function catalogMessage(db: Db): Promise<LiveMessage[]> {
  const [s] = await db
    .select({ v: t.setting.catalogVersion })
    .from(t.setting)
    .where(eq(t.setting.id, 1));
  return [{ to: ["all"], data: { type: "catalog", version: s?.v ?? 0 } }];
}

/** The single hub every app connects to. */
export const liveHub = (env: Env) => env.LIVE_HUB.getByName("main");

/**
 * Sends messages without holding up the reply. The messages are built before the reply (the
 * database connection closes with the request); only the hand-over to the hub runs afterwards.
 */
export function send(
  c: { env: Env; executionCtx: { waitUntil(p: Promise<unknown>): void } },
  messages: LiveMessage[],
) {
  if (!messages.length) return;
  c.executionCtx.waitUntil(
    liveHub(c.env)
      .publish(messages)
      .then(
        () => undefined,
        () => undefined, // the live connection is a convenience; /changes catches apps up
      ),
  );
}
