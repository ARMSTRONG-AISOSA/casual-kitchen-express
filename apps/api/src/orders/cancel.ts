import { maxPartialRefund, type RefundChoice } from "@cke/validation";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { clearAlerts } from "./alerts";
import { advance, type Status, type Tx } from "./store";

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** Statuses an order can be cancelled from at all (not finished). */
export const CANCELLABLE: Status[] = [
  "placed",
  "confirmed",
  "acknowledged",
  "preparing",
  "ready",
  "rider_accepted",
  "picked_up",
  "arriving",
  "ready_for_collection",
];

/** Before the food is ready, an approved request is refunded in full (4.6). */
export const BEFORE_READY: Status[] = ["placed", "confirmed", "acknowledged", "preparing"];

/** After pickup, the delivery fee isn't refunded automatically (4.6). */
export const AFTER_PICKUP: Status[] = ["picked_up", "arriving"];

/** How much of an order has been refunded so far. */
export async function refunded(tx: Tx | Db, orderId: string) {
  const [r] = (await tx
    .select({ sum: sql<number>`coalesce(sum(${t.refund.amount}), 0)::int` })
    .from(t.refund)
    .where(eq(t.refund.orderId, orderId))) as [{ sum: number }];
  return r.sum;
}

/**
 * Records a simulated refund (4.6, MGR-15): no money moves, but the record, the payment's status,
 * and the audit log are real. `decidedBy` is the staff member, or empty for an automatic refund.
 */
export async function recordRefund(
  tx: Tx,
  o: typeof t.order.$inferSelect,
  r: { amount: number; reason: string; requestedBy: string; decidedBy: string | null },
) {
  const already = await refunded(tx, o.id);
  const kind = already === 0 && r.amount === o.total ? "full" : "partial";
  const [made] = await tx
    .insert(t.refund)
    .values({
      orderId: o.id,
      amount: r.amount,
      kind,
      reason: r.reason,
      status: "completed",
      requestedBy: r.requestedBy,
      decidedBy: r.decidedBy,
      completedAt: new Date(),
    })
    .returning();
  if (already + r.amount >= o.total)
    await tx.update(t.payment).set({ status: "refunded" }).where(eq(t.payment.orderId, o.id));
  await tx.insert(t.auditLog).values({
    actorId: r.decidedBy ?? r.requestedBy,
    kind: "money",
    action: `Refunded ${naira(r.amount)} for ${o.number} (${r.reason})`,
    target: `order:${o.id}`,
    after: { amount: r.amount, kind, reason: r.reason },
  });
  return made!;
}

/**
 * Cancels an order from one of the allowed statuses, refunds it, and clears its alerts. Returns
 * null when the order has moved on (the status check is part of the update).
 */
export async function cancelOrder(
  tx: Tx,
  orderId: string,
  from: Status[],
  who: { kind: "staff" | "customer"; id: string; decidedBy: string | null; requestedBy: string },
  reason: string,
  refundAmount: number,
) {
  const o = await advance(
    tx,
    orderId,
    from,
    "cancelled",
    { kind: who.kind, id: who.id },
    { cancelledAt: new Date() },
  );
  if (!o) return null;
  await tx.insert(t.auditLog).values({
    actorId: who.id,
    kind: "other",
    action: `Cancelled ${o.number} (${reason})`,
    target: `order:${o.id}`,
    after: { reason },
  });
  if (refundAmount > 0)
    await recordRefund(tx, o, {
      amount: refundAmount,
      reason,
      requestedBy: who.requestedBy,
      decidedBy: who.decidedBy,
    });
  // Pending requests for a cancelled order are settled; its alerts close.
  await tx
    .update(t.cancellationRequest)
    .set({ status: "approved", decidedBy: who.decidedBy, decidedAt: new Date() })
    .where(
      and(eq(t.cancellationRequest.orderId, orderId), eq(t.cancellationRequest.status, "pending")),
    );
  const alerts = await clearAlerts(
    tx,
    orderId,
    ["unaccepted", "stuck", "item_unavailable", "cancellation_request", "help_request"],
    who.decidedBy,
  );
  return { order: o, alerts };
}

/** How many orders a customer cancelled in the last 7 days (the repeat-cancellation rule, 4.6). */
export async function recentCancellations(db: Tx | Db, customerId: string) {
  const [r] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.order)
    .where(
      and(
        eq(t.order.customerId, customerId),
        eq(t.order.status, "cancelled"),
        gt(t.order.cancelledAt, new Date(Date.now() - 7 * 24 * 3600_000)),
      ),
    )) as [{ n: number }];
  return r.n;
}

/**
 * Works out a refund from the person's choice (MGR-15): a full refund is what's left to refund;
 * a partial one is the typed amount, never more than 99% of what the customer paid
 * (owner decision, 15 November 2026) and never more than what's left. "None" is only for a
 * manager cancelling after pickup (4.6).
 */
export function refundAmount(
  choice: RefundChoice,
  paid: number,
  left: number,
  allowNone: boolean,
): { amount: number } | { error: string } {
  if (choice.kind === "full") return { amount: left };
  if (choice.kind === "none")
    return allowNone ? { amount: 0 } : { error: "Choose a full or partial refund" };
  const cap = maxPartialRefund(paid);
  if (choice.amount > cap)
    return {
      error: `A partial refund can be up to ${naira(cap)} (99% of the ${naira(paid)} paid)`,
    };
  if (choice.amount > left) return { error: `The most that can be refunded is ${naira(left)}` };
  return { amount: choice.amount };
}
