import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { watNow } from "../orders/clock";
import { codeHash, deliveryCode } from "../orders/code";
import { priceLines } from "../orders/lines";
import { KITCHEN } from "../orders/riders";
import { advance, insertOrder } from "../orders/store";

// Practice orders and the live simulator (architecture.md 18.4, MGR-28, build step 7). A manager
// places a pretend online order (from one of the seeded demo customers, to their saved address)
// or a pretend walk-in, and can let a simulated kitchen and rider move practice orders along at
// 1x, 5x, or 20x. Practice orders are real rows marked `practice`, so every screen shows them
// like any order, and the simulator only ever moves those: never a real customer's order. Staff
// and riders can also handle practice orders by hand; the simulator then leaves their steps to
// them. Reset removes every practice order.

export const SPEEDS = [1, 5, 20] as const;
export type Speed = (typeof SPEEDS)[number];

/** Seconds each step waits at 1x before the simulator moves it on. */
const WAIT: Partial<Record<(typeof t.orderStatus.enumValues)[number], number>> = {
  confirmed: 20, // the kitchen acknowledges
  acknowledged: 15, // the first item ticked: Preparing
  preparing: 45, // packed: Ready
  ready: 30, // the simulated rider accepts
  rider_accepted: 30, // picked up
  picked_up: 20, // one hop along the route, until within 300 m: Arriving
  arriving: 20, // the code entered: Delivered
  ready_for_collection: 30, // collected at the counter
};
/** The simulated rider covers the way in this many hops (a position each time, like real tracking). */
const HOPS = 5;
const ARRIVE_M = 300;

export const OPEN = Object.keys(WAIT) as (keyof typeof WAIT)[];

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** One to three dishes that are on the menu and not sold out. */
async function randomItems(db: Db) {
  const items = await db
    .select({ id: t.menuItem.id })
    .from(t.menuItem)
    .where(and(eq(t.menuItem.available, true), eq(t.menuItem.archived, false)));
  const n = 1 + Math.floor(Math.random() * 3);
  return Array.from({ length: n }, () => ({ itemId: pick(items).id, quantity: 1 }));
}

/**
 * Places a practice order: online (a demo customer, delivery or pickup) or a walk-in. Opening
 * hours and the pause don't apply: practice works any time.
 */
export async function placePractice(
  db: Db,
  secret: string,
  kind: "online" | "walkin",
  managerId: string,
) {
  const priced = await priceLines(db, await randomItems(db));
  if (!priced.ok) return { error: priced.error };
  const now = watNow();
  const [s] = await db
    .select({ fee: t.setting.deliveryFee })
    .from(t.setting)
    .where(eq(t.setting.id, 1));

  if (kind === "walkin") {
    const total = priced.foodTotal;
    return {
      order: await insertOrder(
        db,
        {
          businessDate: now.date,
          channel: "walkin",
          type: pick(["eat_in", "take_away"] as const),
          status: "confirmed",
          foodTotal: total,
          deliveryFee: 0,
          total,
          paymentMethod: "cash",
          enteredBy: managerId,
          label: "Practice",
          soupVarietyId: priced.soupVarietyId,
          placedAt: new Date(),
          isDemo: true,
          practice: true,
        },
        priced.lines,
        {
          method: "cash",
          demoRef: `PRACTICE-${Date.now()}`,
          amount: total,
          cashReceived: total,
          changeDue: 0,
          takenBy: managerId,
        },
        [
          { status: "placed", actorKind: "staff", actorId: managerId },
          { status: "confirmed", actorKind: "staff", actorId: managerId },
        ],
      ),
    };
  }

  // A demo customer with a saved address in an area that's in range; most practice orders are
  // deliveries, as in the history (18.3).
  const homes = await db
    .select({
      userId: t.address.userId,
      addressId: t.address.id,
      neighbourhoodId: t.address.neighbourhoodId,
    })
    .from(t.address)
    .innerJoin(t.user, eq(t.user.id, t.address.userId))
    .innerJoin(t.neighbourhood, eq(t.neighbourhood.id, t.address.neighbourhoodId))
    .where(
      and(
        eq(t.user.isDemo, true),
        eq(t.address.archived, false),
        eq(t.neighbourhood.inRange, true),
      ),
    )
    .limit(200);
  if (!homes.length) return { error: "There are no demo customers. Run the history seed first." };
  const home = pick(homes);
  const delivery = Math.random() < 0.8;
  const fee = delivery ? (s?.fee ?? 1500) : 0;
  const total = priced.foodTotal + fee;
  const payment = pick(["card", "transfer"] as const);
  return {
    order: await insertOrder(
      db,
      {
        businessDate: now.date,
        channel: "online",
        customerId: home.userId,
        type: delivery ? "delivery" : "pickup",
        status: "confirmed",
        foodTotal: priced.foodTotal,
        deliveryFee: fee,
        total,
        paymentMethod: payment,
        addressId: delivery ? home.addressId : null,
        neighbourhoodId: delivery ? home.neighbourhoodId : null,
        soupVarietyId: priced.soupVarietyId,
        placedAt: new Date(),
        isDemo: true,
        practice: true,
      },
      priced.lines,
      { method: payment, demoRef: `PRACTICE-${Date.now()}`, amount: total },
      [
        { status: "placed", actorKind: "customer", actorId: home.userId },
        { status: "confirmed", actorKind: "system", actorId: null },
      ],
      async (_tx, orderId) =>
        delivery
          ? { deliveryCodeHash: await codeHash(orderId, await deliveryCode(secret, orderId)) }
          : {},
    ),
  };
}

/** The simulated rider: a demo rider who isn't online in the rider app, so people are left alone. */
async function simulatedRider(db: Db) {
  const riders = await db
    .select({ userId: t.staffProfile.userId, online: t.riderState.online })
    .from(t.staffProfile)
    .leftJoin(t.riderState, eq(t.riderState.userId, t.staffProfile.userId))
    .where(and(eq(t.staffProfile.role, "rider"), eq(t.staffProfile.status, "active")))
    .orderBy(desc(t.staffProfile.code));
  return riders.find((r) => !r.online)?.userId ?? null;
}

export type Moved = {
  orders: string[];
  /** The simulated rider's new positions, for the customers' maps. */
  positions: { orderId: string; customerId: string; lat: number; lng: number }[];
};

/**
 * One turn of the simulator: each practice order whose step has waited long enough at this speed
 * moves on one step. Returns what changed, for the live connection.
 */
export async function stepPractice(db: Db, speed: Speed): Promise<Moved> {
  const moved: Moved = { orders: [], positions: [] };
  const open = await db
    .select()
    .from(t.order)
    .where(and(eq(t.order.practice, true), inArray(t.order.status, OPEN)))
    .orderBy(asc(t.order.placedAt));
  if (!open.length) return moved;
  const last = await db
    .select({ orderId: t.orderStatusEvent.orderId, at: max(t.orderStatusEvent.at) })
    .from(t.orderStatusEvent)
    .where(
      inArray(
        t.orderStatusEvent.orderId,
        open.map((o) => o.id),
      ),
    )
    .groupBy(t.orderStatusEvent.orderId);
  const deliveries = await db
    .select()
    .from(t.delivery)
    .where(
      inArray(
        t.delivery.orderId,
        open.map((o) => o.id),
      ),
    );
  const system = { kind: "system" as const, id: null };
  let rider: string | null | undefined;

  for (const o of open) {
    const since = Date.now() - (last.find((l) => l.orderId === o.id)?.at?.getTime() ?? Date.now());
    if (since < (WAIT[o.status]! * 1000) / speed) continue;
    const d = deliveries.find((x) => x.orderId === o.id);
    // Rider steps belong to whoever has the order: the simulator only drives its own rider.
    rider ??= await simulatedRider(db);
    const mine = !!d && d.riderId === rider;

    const done = await db.transaction(async (tx) => {
      switch (o.status) {
        case "confirmed":
          return advance(tx, o.id, ["confirmed"], "acknowledged", system, {
            acknowledgedAt: new Date(),
          });
        case "acknowledged": {
          const [first] = await tx
            .select({ id: t.orderItem.id })
            .from(t.orderItem)
            .where(eq(t.orderItem.orderId, o.id))
            .limit(1);
          if (first)
            await tx.update(t.orderItem).set({ ticked: true }).where(eq(t.orderItem.id, first.id));
          return advance(tx, o.id, ["acknowledged"], "preparing", system);
        }
        case "preparing":
          await tx.update(t.orderItem).set({ ticked: true }).where(eq(t.orderItem.orderId, o.id));
          return advance(
            tx,
            o.id,
            ["preparing"],
            o.type === "delivery" ? "ready" : "ready_for_collection",
            system,
            {
              readyAt: new Date(),
            },
          );
        case "ready": {
          if (d || !rider) return null; // a person took it, or no rider is free to simulate
          await tx.insert(t.delivery).values({
            orderId: o.id,
            riderId: rider,
            batchGroup: crypto.randomUUID(),
            stopNumber: 1,
          });
          return advance(tx, o.id, ["ready"], "rider_accepted", { kind: "staff", id: rider });
        }
        case "rider_accepted":
          if (!mine) return null;
          await tx
            .update(t.delivery)
            .set({ pickedUpAt: new Date() })
            .where(eq(t.delivery.orderId, o.id));
          return advance(
            tx,
            o.id,
            ["rider_accepted"],
            "picked_up",
            { kind: "staff", id: rider! },
            { pickedUpAt: new Date() },
          );
        case "picked_up": {
          if (!mine || !o.addressId || !o.customerId) return null;
          const [to] = await tx
            .select({ lat: t.address.lat, lng: t.address.lng })
            .from(t.address)
            .where(eq(t.address.id, o.addressId));
          if (!to) return null;
          // One hop further along the way from the kitchen, at the same low cadence as real tracking.
          const gone =
            (Date.now() - (o.pickedUpAt?.getTime() ?? Date.now())) /
            ((WAIT.picked_up! * 1000) / speed);
          const f = Math.min(1, Math.max(1, Math.floor(gone)) / HOPS);
          const at = {
            lat: KITCHEN.lat + (to.lat - KITCHEN.lat) * f,
            lng: KITCHEN.lng + (to.lng - KITCHEN.lng) * f,
          };
          await tx.insert(t.riderState).values({ userId: rider! }).onConflictDoNothing();
          const [was] = await tx
            .select({ lat: t.riderState.lat, lng: t.riderState.lng })
            .from(t.riderState)
            .where(eq(t.riderState.userId, rider!));
          // Only a new hop is sent; turns in between leave the marker where it is.
          if (was?.lat !== at.lat || was.lng !== at.lng) {
            await tx
              .update(t.riderState)
              .set({ ...at, locatedAt: new Date() })
              .where(eq(t.riderState.userId, rider!));
            moved.positions.push({ orderId: o.id, customerId: o.customerId, ...at });
          }
          if (metres(at, to) > ARRIVE_M && f < 1) return null;
          return advance(tx, o.id, ["picked_up"], "arriving", system);
        }
        case "arriving": {
          if (!mine) return null;
          const [s] = await tx
            .select({ pay: t.setting.riderPay })
            .from(t.setting)
            .where(eq(t.setting.id, 1));
          await tx
            .update(t.delivery)
            .set({ deliveredAt: new Date(), riderPay: s?.pay ?? 1000 })
            .where(eq(t.delivery.orderId, o.id));
          await tx
            .update(t.riderState)
            .set({ lat: null, lng: null, locatedAt: null })
            .where(eq(t.riderState.userId, rider!));
          return advance(
            tx,
            o.id,
            ["arriving"],
            "delivered",
            { kind: "staff", id: rider! },
            { deliveredAt: new Date() },
          );
        }
        case "ready_for_collection":
          return advance(tx, o.id, ["ready_for_collection"], "collected", system, {
            collectedAt: new Date(),
          });
        default:
          return null;
      }
    });
    if (done) moved.orders.push(o.id);
  }
  return moved;
}

/** Whether any practice order is still moving, so the simulator keeps its alarm. */
export async function practiceOpen(db: Db) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(t.order)
    .where(and(eq(t.order.practice, true), inArray(t.order.status, OPEN)));
  return r?.n ?? 0;
}

/** Reset (MGR-29 for live data): every practice order and everything attached to it goes. */
export async function resetPractice(db: Db) {
  const ids = (
    await db.select({ id: t.order.id }).from(t.order).where(eq(t.order.practice, true))
  ).map((r) => r.id);
  if (!ids.length) return 0;
  await db.transaction(async (tx) => {
    await tx.delete(t.alert).where(inArray(t.alert.orderId, ids));
    await tx.delete(t.helpRequest).where(inArray(t.helpRequest.orderId, ids));
    await tx.delete(t.cancellationRequest).where(inArray(t.cancellationRequest.orderId, ids));
    await tx.delete(t.refund).where(inArray(t.refund.orderId, ids));
    await tx.delete(t.delivery).where(inArray(t.delivery.orderId, ids));
    await tx.delete(t.rating).where(inArray(t.rating.orderId, ids));
    await tx.delete(t.auditLog).where(
      inArray(
        t.auditLog.target,
        ids.map((id) => `order:${id}`),
      ),
    );
    await tx.delete(t.order).where(inArray(t.order.id, ids));
  });
  return ids.length;
}
