import { inArray } from "drizzle-orm";
import type { Db } from "../src/db/client";
import * as t from "../src/db/schema";

/**
 * Removes test orders and everything that points to them: alerts, requests, refunds, deliveries,
 * ratings, and their audit entries. Lines, payments, and status events go with the order.
 */
export async function deleteOrders(db: Db, ids: string[]) {
  if (!ids.length) return;
  await db.delete(t.alert).where(inArray(t.alert.orderId, ids));
  await db.delete(t.helpRequest).where(inArray(t.helpRequest.orderId, ids));
  await db.delete(t.cancellationRequest).where(inArray(t.cancellationRequest.orderId, ids));
  await db.delete(t.refund).where(inArray(t.refund.orderId, ids));
  await db.delete(t.delivery).where(inArray(t.delivery.orderId, ids));
  await db.delete(t.rating).where(inArray(t.rating.orderId, ids));
  await db.delete(t.auditLog).where(
    inArray(
      t.auditLog.target,
      ids.map((id) => `order:${id}`),
    ),
  );
  await db.delete(t.order).where(inArray(t.order.id, ids));
}
