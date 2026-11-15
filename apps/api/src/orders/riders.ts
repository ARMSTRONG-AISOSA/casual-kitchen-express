import { DEFAULTS } from "@cke/validation";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import type { Tx } from "./store";

/**
 * The kitchen's map pin, for the queue's distances (6.0 rule 2: computed on the server). An
 * approximate point in Ugbowo until the owner drops the real pin with the delivery boundary
 * (16.1 item 12).
 */
export const KITCHEN = { name: "CKE kitchen, Ugbowo", lat: 6.4013, lng: 5.6145 };

/** Straight-line distance in metres between two points (haversine). */
export function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

/** A rider never carries more than three orders (section 6). */
export const MAX_ORDERS = 3;

/** Orders a rider is carrying: accepted and not yet delivered. */
export const CARRYING = ["rider_accepted", "picked_up", "arriving"] as const;

type Q = Tx | Db;

/** Each order's load (the sum of its item loads, section 6), for a set of orders. */
async function loads(db: Q, orderIds: string[]) {
  if (!orderIds.length) return new Map<string, number>();
  const rows = await db
    .select({
      orderId: t.orderItem.orderId,
      load: sql<number>`sum(${t.orderItem.load} * ${t.orderItem.quantity})::int`,
    })
    .from(t.orderItem)
    .where(inArray(t.orderItem.orderId, orderIds))
    .groupBy(t.orderItem.orderId);
  return new Map(rows.map((r) => [r.orderId, r.load]));
}

/** Where each order is going: the address pin, area, and contact. */
async function dropOffs(db: Q, orderIds: string[]) {
  if (!orderIds.length) return [];
  return db
    .select({
      orderId: t.order.id,
      label: t.address.label,
      street: t.address.street,
      landmark: t.address.landmark,
      phone: t.address.contactPhone,
      lat: t.address.lat,
      lng: t.address.lng,
      neighbourhood: t.neighbourhood.name,
    })
    .from(t.order)
    .innerJoin(t.address, eq(t.address.id, t.order.addressId))
    .innerJoin(t.neighbourhood, eq(t.neighbourhood.id, t.address.neighbourhoodId))
    .where(inArray(t.order.id, orderIds));
}

/** What a rider is carrying now, with loads and drop-off pins, and their budget (section 6). */
export async function riderLoad(db: Q, riderId: string) {
  const [[state], [s], carrying] = await Promise.all([
    db.select().from(t.riderState).where(eq(t.riderState.userId, riderId)),
    db
      .select({ budget: t.setting.capacityBudget, batch: t.setting.batchDistanceM })
      .from(t.setting)
      .where(eq(t.setting.id, 1)),
    db
      .select({
        orderId: t.delivery.orderId,
        stop: t.delivery.stopNumber,
        group: t.delivery.batchGroup,
      })
      .from(t.delivery)
      .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
      .where(and(eq(t.delivery.riderId, riderId), inArray(t.order.status, [...CARRYING])))
      .orderBy(asc(t.delivery.stopNumber)),
  ]);
  const ids = carrying.map((d) => d.orderId);
  const [loadMap, drops] = await Promise.all([loads(db, ids), dropOffs(db, ids)]);
  return {
    online: state?.online ?? false,
    budget: state?.capacityBudget ?? s?.budget ?? DEFAULTS.capacityBudget,
    batchDistanceM: s?.batch ?? 1500,
    orders: carrying.map((d) => ({
      ...d,
      load: loadMap.get(d.orderId) ?? 0,
      drop: drops.find((x) => x.orderId === d.orderId),
    })),
    load: ids.reduce((sum, id) => sum + (loadMap.get(id) ?? 0), 0),
  };
}

export type RiderLoad = Awaited<ReturnType<typeof riderLoad>>;

/**
 * Whether an order fits what the rider carries: fewer than three orders, the combined load within
 * the budget, and every drop-off within the batch distance of the new one (section 6).
 */
export function fits(r: RiderLoad, order: { load: number; lat: number; lng: number }) {
  if (r.orders.length >= MAX_ORDERS) return false;
  if (r.load + order.load > r.budget) return false;
  return r.orders.every((o) => !o.drop || metres(o.drop, order) <= r.batchDistanceM);
}

/** The queue's cards: ready delivery orders no rider has taken (RID-03), oldest first. */
export async function queueOrders(db: Q, onlyIds?: string[]) {
  const rows = await db
    .select({ id: t.order.id, number: t.order.number, readyAt: t.order.readyAt })
    .from(t.order)
    .leftJoin(t.delivery, eq(t.delivery.orderId, t.order.id))
    .where(
      and(
        eq(t.order.status, "ready"),
        eq(t.order.type, "delivery"),
        isNull(t.delivery.id),
        onlyIds ? inArray(t.order.id, onlyIds) : undefined,
      ),
    )
    .orderBy(asc(t.order.readyAt));
  const ids = rows.map((r) => r.id);
  const [loadMap, drops] = await Promise.all([loads(db, ids), dropOffs(db, ids)]);
  return rows.map((r) => {
    const d = drops.find((x) => x.orderId === r.id)!;
    return {
      orderId: r.id,
      number: r.number,
      neighbourhood: d?.neighbourhood ?? "",
      distanceM: d ? metres(KITCHEN, d) : 0,
      load: loadMap.get(r.id) ?? 0,
      readyAt: r.readyAt,
      lat: d?.lat ?? 0,
      lng: d?.lng ?? 0,
    };
  });
}

export type QueueItem = Awaited<ReturnType<typeof queueOrders>>[number];

/**
 * A rider's own deliveries (RID-06, RID-09, RID-23): stops in order, with what they need to find
 * and call the customer. Only the customer's first name is shown.
 */
export async function riderDeliveries(db: Q, riderId: string, onlyIds?: string[]) {
  const rows = await db
    .select({
      orderId: t.order.id,
      number: t.order.number,
      status: t.order.status,
      total: t.order.total,
      stop: t.delivery.stopNumber,
      assignedBy: t.delivery.assignedBy,
      customerName: t.customerProfile.name,
    })
    .from(t.delivery)
    .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
    .leftJoin(t.customerProfile, eq(t.customerProfile.userId, t.order.customerId))
    .where(
      and(
        eq(t.delivery.riderId, riderId),
        onlyIds ? inArray(t.order.id, onlyIds) : inArray(t.order.status, [...CARRYING]),
      ),
    )
    .orderBy(asc(t.delivery.stopNumber));
  const ids = rows.map((r) => r.orderId);
  const [loadMap, drops, counts] = await Promise.all([
    loads(db, ids),
    dropOffs(db, ids),
    ids.length
      ? db
          .select({
            orderId: t.orderItem.orderId,
            n: sql<number>`sum(${t.orderItem.quantity})::int`,
          })
          .from(t.orderItem)
          .where(inArray(t.orderItem.orderId, ids))
          .groupBy(t.orderItem.orderId)
      : Promise.resolve([] as { orderId: string; n: number }[]),
  ]);
  return rows.map((r) => {
    const d = drops.find((x) => x.orderId === r.orderId);
    return {
      orderId: r.orderId,
      number: r.number,
      status: r.status,
      stop: r.stop,
      picked: r.status !== "rider_accepted",
      assignedByDispatch: !!r.assignedBy,
      customerFirstName: (r.customerName ?? "").split(" ")[0] ?? "",
      phone: d?.phone ?? null,
      address: d
        ? {
            label: d.label,
            street: d.street,
            landmark: d.landmark,
            neighbourhood: d.neighbourhood,
            lat: d.lat,
            lng: d.lng,
          }
        : null,
      items: counts.find((c) => c.orderId === r.orderId)?.n ?? 0,
      load: loadMap.get(r.orderId) ?? 0,
      pickup: KITCHEN.name,
    };
  });
}

/**
 * The live riders panel (DSP-03, MGR-02): every active rider, online first, with what each is
 * carrying, their load against the budget, and their phone for Call rider.
 */
export async function ridersPanel(db: Q, onlyIds?: string[]) {
  const riders = await db
    .select({
      userId: t.staffProfile.userId,
      code: t.staffProfile.code,
      name: t.staffProfile.fullName,
      phone: t.staffProfile.phone,
      online: t.riderState.online,
      version: t.riderState.version,
    })
    .from(t.staffProfile)
    .leftJoin(t.riderState, eq(t.riderState.userId, t.staffProfile.userId))
    .where(
      and(
        eq(t.staffProfile.role, "rider"),
        eq(t.staffProfile.status, "active"),
        onlyIds ? inArray(t.staffProfile.userId, onlyIds) : undefined,
      ),
    )
    .orderBy(asc(t.staffProfile.code));
  const loadsByRider = await Promise.all(riders.map((r) => riderLoad(db, r.userId)));
  const numbers = await (async () => {
    const ids = loadsByRider.flatMap((l) => l.orders.map((o) => o.orderId));
    if (!ids.length) return [];
    return db
      .select({ id: t.order.id, number: t.order.number, status: t.order.status })
      .from(t.order)
      .where(inArray(t.order.id, ids));
  })();
  return riders
    .map((r, i) => {
      const l = loadsByRider[i]!;
      return {
        code: r.code,
        name: r.name,
        phone: r.phone,
        online: r.online ?? false,
        budget: l.budget,
        load: l.load,
        carrying: l.orders.map((o) => {
          const n = numbers.find((x) => x.id === o.orderId);
          return {
            orderId: o.orderId,
            number: n?.number ?? "",
            status: n?.status ?? "",
            neighbourhood: o.drop?.neighbourhood ?? "",
          };
        }),
        version: r.version ?? 0,
      };
    })
    .sort((a, b) => Number(b.online) - Number(a.online));
}
