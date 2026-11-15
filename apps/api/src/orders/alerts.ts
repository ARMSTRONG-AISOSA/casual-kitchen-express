import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { touch, type Tx } from "./store";

type Kind = (typeof t.alertKind.enumValues)[number];
type Q = Tx | Db;

/**
 * How long an order can wait before an alert (MGR-14). Not set in the documents, so these are
 * starting values, recorded in architecture.md 9 for the owner to adjust:
 * - waiting for a rider: 5 minutes after Ready ("unaccepted");
 * - not acknowledged: 5 minutes after it was placed ("stuck");
 * - in the kitchen: 30 minutes after it was acknowledged ("stuck");
 * - on the road: 45 minutes after pickup ("stuck").
 */
export const ALERT_AFTER_MIN = { rider: 5, acknowledge: 5, kitchen: 30, road: 45 } as const;

/** Opens an alert, unless one of the same kind is already open for the order. */
export async function openAlert(
  tx: Q,
  kind: Kind,
  orderId: string,
  requestId: string | null = null,
) {
  const [open] = await tx
    .select({ id: t.alert.id })
    .from(t.alert)
    .where(and(eq(t.alert.kind, kind), eq(t.alert.orderId, orderId), isNull(t.alert.clearedAt)));
  if (open) return null;
  const [made] = await tx
    .insert(t.alert)
    .values({ kind, orderId, requestId })
    .returning({ id: t.alert.id });
  return made!.id;
}

/** Clears an order's open alerts of these kinds; returns the cleared IDs. */
export async function clearAlerts(tx: Q, orderId: string, kinds: Kind[], by: string | null) {
  const rows = await tx
    .update(t.alert)
    .set({ clearedAt: new Date(), clearedBy: by, ...touch() })
    .where(
      and(eq(t.alert.orderId, orderId), inArray(t.alert.kind, kinds), isNull(t.alert.clearedAt)),
    )
    .returning({ id: t.alert.id });
  return rows.map((r) => r.id);
}

/** Alert cards (design 6.4): the order, and the request's reason and who asked. */
export async function alertViews(db: Q, where: { ids?: string[]; open?: boolean }) {
  const rider = alias(t.staffProfile, "rider");
  const rows = await db
    .select({
      id: t.alert.id,
      kind: t.alert.kind,
      createdAt: t.alert.createdAt,
      clearedAt: t.alert.clearedAt,
      requestId: t.alert.requestId,
      version: t.alert.version,
      orderId: t.order.id,
      number: t.order.number,
      channel: t.order.channel,
      status: t.order.status,
      customerName: t.customerProfile.name,
      cancelReason: t.cancellationRequest.reason,
      helpReason: t.helpRequest.reason,
      riderCode: rider.code,
      riderName: rider.fullName,
    })
    .from(t.alert)
    .leftJoin(t.order, eq(t.order.id, t.alert.orderId))
    .leftJoin(t.customerProfile, eq(t.customerProfile.userId, t.order.customerId))
    .leftJoin(
      t.cancellationRequest,
      and(
        eq(t.alert.kind, "cancellation_request"),
        eq(t.cancellationRequest.id, t.alert.requestId),
      ),
    )
    .leftJoin(
      t.helpRequest,
      and(eq(t.alert.kind, "help_request"), eq(t.helpRequest.id, t.alert.requestId)),
    )
    .leftJoin(rider, eq(rider.userId, t.helpRequest.riderId))
    .where(
      and(
        where.ids ? inArray(t.alert.id, where.ids) : undefined,
        where.open ? isNull(t.alert.clearedAt) : undefined,
      ),
    )
    .orderBy(desc(t.alert.createdAt));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    createdAt: r.createdAt,
    cleared: !!r.clearedAt,
    requestId: r.requestId,
    order: r.orderId
      ? { id: r.orderId, number: r.number, channel: r.channel, status: r.status }
      : null,
    customerName: r.customerName,
    reason: r.cancelReason ?? r.helpReason ?? null,
    rider: r.riderCode ? { code: r.riderCode, name: r.riderName } : null,
    version: r.version,
  }));
}

/**
 * The timed check, run every minute by the Cron Trigger (14.0, background jobs): opens alerts for
 * orders waiting too long, marks those orders Delayed so the customer sees "Running a little
 * late" (4.3), and clears waiting-for-a-rider alerts once a rider has the order.
 * Returns the alert and order IDs it changed, so they can be sent over the live connection.
 */
export async function scanAlerts(db: Db, now = new Date()) {
  const ago = (min: number) => new Date(now.getTime() - min * 60_000);
  const alerts: string[] = [];
  const orders: string[] = [];
  await db.transaction(async (tx) => {
    const waiting = await tx
      .select({ id: t.order.id })
      .from(t.order)
      .leftJoin(t.delivery, eq(t.delivery.orderId, t.order.id))
      .where(
        and(
          eq(t.order.status, "ready"),
          eq(t.order.type, "delivery"),
          isNull(t.delivery.id),
          lt(t.order.readyAt, ago(ALERT_AFTER_MIN.rider)),
        ),
      );
    for (const o of waiting) {
      const id = await openAlert(tx, "unaccepted", o.id);
      if (id) alerts.push(id);
    }
    const stuck = await tx
      .select({ id: t.order.id, exception: t.order.exception })
      .from(t.order)
      .where(
        sql`(${t.order.status} = 'confirmed' and ${t.order.placedAt} < ${ago(ALERT_AFTER_MIN.acknowledge)})
          or (${t.order.status} in ('acknowledged', 'preparing') and ${t.order.acknowledgedAt} < ${ago(ALERT_AFTER_MIN.kitchen)})
          or (${t.order.status} in ('picked_up', 'arriving') and ${t.order.pickedUpAt} < ${ago(ALERT_AFTER_MIN.road)})`,
      );
    for (const o of stuck) {
      const id = await openAlert(tx, "stuck", o.id);
      if (id) {
        alerts.push(id);
        if (!o.exception) {
          await tx
            .update(t.order)
            .set({ exception: "delayed", ...touch() })
            .where(eq(t.order.id, o.id));
          orders.push(o.id);
        }
      }
    }
    // A rider has it now, or it was cancelled: the waiting alert goes away on its own, and so does
    // a stuck alert once the order is finished.
    const taken = await tx
      .select({ id: t.alert.id })
      .from(t.alert)
      .innerJoin(t.order, eq(t.order.id, t.alert.orderId))
      .leftJoin(t.delivery, eq(t.delivery.orderId, t.order.id))
      .where(
        and(
          isNull(t.alert.clearedAt),
          sql`((${t.alert.kind} = 'unaccepted' and (${t.order.status} <> 'ready' or ${t.delivery.id} is not null))
            or (${t.alert.kind} = 'stuck' and ${t.order.status} in ('delivered', 'collected', 'cancelled')))`,
        ),
      );
    if (taken.length) {
      await tx
        .update(t.alert)
        .set({ clearedAt: now, ...touch() })
        .where(
          inArray(
            t.alert.id,
            taken.map((a) => a.id),
          ),
        );
      alerts.push(...taken.map((a) => a.id));
    }
  });
  return { alerts, orders };
}
