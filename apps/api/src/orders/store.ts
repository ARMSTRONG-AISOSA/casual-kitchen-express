import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import type { PricedLine } from "./lines";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Status = (typeof t.orderStatus.enumValues)[number];
type ActorKind = (typeof t.actorKind.enumValues)[number];

/**
 * Every change to an order (or an alert, or a rider's state) takes the next number from the shared
 * counter, so an app that reconnects asks only for what changed (architecture.md 14.4, decision 4).
 * Spread it into every update of those tables.
 */
export const touch = () => ({ version: sql<number>`nextval('change_seq')` });

/** The next order number: O-0001 running on for online orders, W-001 each day for walk-ins (4.8). */
async function nextNumber(tx: Tx, channel: "online" | "walkin", businessDate: string) {
  if (channel === "online") {
    const [{ n }] = (
      await tx.execute<{ n: number }>(
        sql`select coalesce(max(substring(number from 3)::int), 0) + 1 as n
          from "order" where channel = 'online'`,
      )
    ).rows as [{ n: number }];
    return `O-${String(n).padStart(4, "0")}`;
  }
  const [{ n }] = (
    await tx.execute<{ n: number }>(
      sql`select coalesce(max(substring(number from 3)::int), 0) + 1 as n
        from "order" where channel = 'walkin' and business_date = ${businessDate}`,
    )
  ).rows as [{ n: number }];
  return `W-${String(n).padStart(3, "0")}`;
}

type NewOrder = Omit<typeof t.order.$inferInsert, "number" | "id">;

/**
 * Saves a new order with its lines, payment, and first status events in one transaction. Two
 * orders placed at the same moment could pick the same number; the unique index refuses one, and
 * it tries again with the next number.
 */
export async function insertOrder(
  db: Db,
  values: NewOrder,
  lines: PricedLine[],
  payment: Omit<typeof t.payment.$inferInsert, "orderId">,
  events: { status: Status; actorKind: ActorKind; actorId: string | null }[],
  extra?: (tx: Tx, orderId: string) => Promise<Partial<typeof t.order.$inferInsert>>,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const number = await nextNumber(tx, values.channel, values.businessDate);
        const [made] = await tx
          .insert(t.order)
          .values({ ...values, number })
          .returning();
        const o = made!;
        await tx.insert(t.orderItem).values(lines.map((l) => ({ ...l, orderId: o.id })));
        await tx.insert(t.payment).values({ ...payment, orderId: o.id });
        await tx.insert(t.orderStatusEvent).values(
          events.map((e, i) => ({
            ...e,
            orderId: o.id,
            // The same moment, a millisecond apart, so the timeline keeps its order.
            at: new Date(o.placedAt.getTime() + i),
          })),
        );
        if (extra) {
          const changes = await extra(tx, o.id);
          if (Object.keys(changes).length)
            return (
              await tx.update(t.order).set(changes).where(eq(t.order.id, o.id)).returning()
            )[0]!;
        }
        return o;
      });
    } catch (e) {
      const unique = e as { cause?: { code?: string }; code?: string };
      if ((unique.code ?? unique.cause?.code) !== "23505" || attempt >= 4) throw e;
    }
  }
}

/**
 * Moves an order from one of the allowed statuses to the next and records who did it (4.5).
 * The status check is part of the update itself, so two taps at once can't both succeed.
 * Returns null when the order isn't in one of the allowed statuses any more.
 */
export async function advance(
  tx: Tx,
  orderId: string,
  from: Status[],
  to: Status,
  actor: { kind: ActorKind; id: string | null },
  set: Partial<typeof t.order.$inferInsert> = {},
) {
  const [o] = await tx
    .update(t.order)
    .set({ ...set, status: to, ...touch() })
    .where(and(eq(t.order.id, orderId), inArray(t.order.status, from)))
    .returning();
  if (!o) return null;
  await tx
    .insert(t.orderStatusEvent)
    .values({ orderId, status: to, actorKind: actor.kind, actorId: actor.id });
  return o;
}
