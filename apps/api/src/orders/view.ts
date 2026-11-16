import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { deliveryCode } from "./code";

type OrderRow = typeof t.order.$inferSelect;

/** Finished orders: nothing more happens to them except refunds (4.6). */
export const FINISHED = ["delivered", "collected", "cancelled"] as const;

/** Customers can cancel on their own only before the kitchen acknowledges (4.6). */
export const CUSTOMER_CAN_CANCEL = ["placed", "confirmed"] as const;

const itemView = (i: typeof t.orderItem.$inferSelect) => ({
  id: i.id,
  name: i.name,
  unitPrice: i.unitPrice,
  quantity: i.quantity,
  options: i.options,
  notes: i.notes,
  station: i.station,
  ticked: i.ticked,
});

/**
 * Loads orders with their lines, timelines, payments, and customer cards in a few queries
 * (one call per screen, 14.4). `full` adds the timeline, payment, and customer card that the
 * order detail needs; the board only needs the lines.
 */
export async function loadOrders(db: Db, rows: OrderRow[], full: boolean) {
  if (!rows.length) return [];
  const ids = rows.map((o) => o.id);
  const items = await db
    .select()
    .from(t.orderItem)
    .where(inArray(t.orderItem.orderId, ids))
    .orderBy(asc(t.orderItem.station), asc(t.orderItem.name));
  const events = full
    ? await db
        .select({
          orderId: t.orderStatusEvent.orderId,
          status: t.orderStatusEvent.status,
          at: t.orderStatusEvent.at,
          actorKind: t.orderStatusEvent.actorKind,
          actorId: t.orderStatusEvent.actorId,
          staffCode: t.staffProfile.code,
          staffName: t.staffProfile.fullName,
        })
        .from(t.orderStatusEvent)
        .leftJoin(t.staffProfile, eq(t.staffProfile.userId, t.orderStatusEvent.actorId))
        .where(inArray(t.orderStatusEvent.orderId, ids))
        .orderBy(asc(t.orderStatusEvent.at))
    : [];
  const payments = full
    ? await db.select().from(t.payment).where(inArray(t.payment.orderId, ids))
    : [];
  // Refunds with who made them (name, role, staff ID: MGR-15), and cancellation requests (4.6).
  const refunds = full
    ? await db
        .select({
          orderId: t.refund.orderId,
          amount: t.refund.amount,
          kind: t.refund.kind,
          status: t.refund.status,
          reason: t.refund.reason,
          at: t.refund.completedAt,
          byCode: t.staffProfile.code,
          byName: t.staffProfile.fullName,
          byRole: t.staffProfile.role,
        })
        .from(t.refund)
        .leftJoin(t.staffProfile, eq(t.staffProfile.userId, t.refund.decidedBy))
        .where(inArray(t.refund.orderId, ids))
        .orderBy(asc(t.refund.requestedAt))
    : [];
  const requests = full
    ? await db
        .select()
        .from(t.cancellationRequest)
        .where(inArray(t.cancellationRequest.orderId, ids))
        .orderBy(asc(t.cancellationRequest.requestedAt))
    : [];
  const customerIds = [...new Set(rows.map((o) => o.customerId).filter((x): x is string => !!x))];
  const customers = customerIds.length
    ? await db
        .select({
          userId: t.customerProfile.userId,
          code: t.customerProfile.code,
          name: t.customerProfile.name,
        })
        .from(t.customerProfile)
        .where(inArray(t.customerProfile.userId, customerIds))
    : [];
  const addressIds = [...new Set(rows.map((o) => o.addressId).filter((x): x is string => !!x))];
  const addresses =
    full && addressIds.length
      ? await db
          .select({
            id: t.address.id,
            label: t.address.label,
            street: t.address.street,
            landmark: t.address.landmark,
            phone: t.address.contactPhone,
            lat: t.address.lat,
            lng: t.address.lng,
            neighbourhood: t.neighbourhood.name,
          })
          .from(t.address)
          .innerJoin(t.neighbourhood, eq(t.neighbourhood.id, t.address.neighbourhoodId))
          .where(inArray(t.address.id, addressIds))
      : [];
  // The rider carrying each order, so the board's handoff view and the order list show who has it.
  const riders = await db
    .select({
      orderId: t.delivery.orderId,
      code: t.staffProfile.code,
      name: t.staffProfile.fullName,
    })
    .from(t.delivery)
    .innerJoin(t.staffProfile, eq(t.staffProfile.userId, t.delivery.riderId))
    .where(inArray(t.delivery.orderId, ids));
  const enteredIds = [...new Set(rows.map((o) => o.enteredBy).filter((x): x is string => !!x))];
  const enterers = enteredIds.length
    ? await db
        .select({
          userId: t.staffProfile.userId,
          code: t.staffProfile.code,
          name: t.staffProfile.fullName,
        })
        .from(t.staffProfile)
        .where(inArray(t.staffProfile.userId, enteredIds))
    : [];

  return rows.map((o) => {
    const own = items.filter((i) => i.orderId === o.id);
    const customer = customers.find((c) => c.userId === o.customerId);
    const address = addresses.find((a) => a.id === o.addressId);
    const pay = payments.find((p) => p.orderId === o.id);
    const by = enterers.find((e) => e.userId === o.enteredBy);
    const rider = riders.find((r) => r.orderId === o.id);
    return {
      id: o.id,
      number: o.number,
      businessDate: o.businessDate,
      channel: o.channel,
      type: o.type,
      status: o.status,
      exception: o.exception,
      foodTotal: o.foodTotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      paymentMethod: o.paymentMethod,
      label: o.label,
      placedAt: o.placedAt,
      readyAt: o.readyAt,
      load: own.reduce((sum, i) => sum + i.load * i.quantity, 0),
      items: own.map(itemView),
      customer: customer
        ? {
            code: customer.code,
            name: customer.name,
            ...(address
              ? {
                  phone: address.phone,
                  address: {
                    label: address.label,
                    street: address.street,
                    landmark: address.landmark,
                    neighbourhood: address.neighbourhood,
                    lat: address.lat,
                    lng: address.lng,
                  },
                }
              : {}),
          }
        : null,
      enteredBy: by ? { code: by.code, name: by.name } : null,
      rider: rider ? { code: rider.code, name: rider.name } : null,
      ...(full
        ? {
            payment: pay
              ? {
                  method: pay.method,
                  amount: pay.amount,
                  cashReceived: pay.cashReceived,
                  changeDue: pay.changeDue,
                  demoRef: pay.demoRef,
                }
              : null,
            refunds: refunds
              .filter((r) => r.orderId === o.id)
              .map((r) => ({
                amount: r.amount,
                kind: r.kind,
                status: r.status,
                reason: r.reason,
                at: r.at,
                by: r.byCode ? { code: r.byCode, name: r.byName, role: r.byRole } : null,
              })),
            cancellationRequest: (() => {
              const req = requests.filter((r) => r.orderId === o.id).at(-1);
              return req
                ? {
                    id: req.id,
                    status: req.status,
                    reason: req.reason,
                    requestedAt: req.requestedAt,
                  }
                : null;
            })(),
            events: events
              .filter((e) => e.orderId === o.id)
              .map((e) => ({
                status: e.status,
                at: e.at,
                by:
                  e.actorKind === "staff"
                    ? { kind: "staff" as const, code: e.staffCode, name: e.staffName }
                    : { kind: e.actorKind },
              })),
          }
        : {}),
      version: o.version,
    };
  });
}

/** One order with everything, for the order detail screen. */
export async function orderDetail(db: Db, orderId: string) {
  const [o] = await db.select().from(t.order).where(eq(t.order.id, orderId));
  return o ? (await loadOrders(db, [o], true))[0]! : null;
}

/**
 * What a customer sees of their own orders (CUS-08, CUS-10, CUS-13): the lines, totals, timeline,
 * and the delivery code while a delivery is on its way. No staff names or codes. A page of
 * orders loads in a few queries, not a few per order.
 */
/** Statuses in which the customer sees the rider's position on the map (CUS-09, after pickup). */
export const ON_THE_WAY = ["picked_up", "arriving"] as const;
/** A position older than this isn't shown: the rider's phone has stopped sending. */
const POSITION_FRESH_MS = 10 * 60_000;

/**
 * The rider of each order still being carried, as the customer sees them (CUS-09, 6.0): first
 * name, which stop this order is, and, once picked up, the last position (7.4).
 */
async function customerRiders(db: Db, rows: OrderRow[]) {
  const ids = rows
    .filter((o) => ["rider_accepted", ...ON_THE_WAY].includes(o.status))
    .map((o) => o.id);
  if (!ids.length) return [];
  const found = await db
    .select({
      orderId: t.delivery.orderId,
      riderId: t.delivery.riderId,
      stop: t.delivery.stopNumber,
      name: t.staffProfile.fullName,
      lat: t.riderState.lat,
      lng: t.riderState.lng,
      at: t.riderState.locatedAt,
    })
    .from(t.delivery)
    .innerJoin(t.staffProfile, eq(t.staffProfile.userId, t.delivery.riderId))
    .leftJoin(t.riderState, eq(t.riderState.userId, t.delivery.riderId))
    .where(inArray(t.delivery.orderId, ids));
  const riderIds = [...new Set(found.map((r) => r.riderId))];
  const stops = riderIds.length
    ? await db
        .select({ riderId: t.delivery.riderId, n: count() })
        .from(t.delivery)
        .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
        .where(
          and(
            inArray(t.delivery.riderId, riderIds),
            inArray(t.order.status, ["rider_accepted", ...ON_THE_WAY]),
          ),
        )
        .groupBy(t.delivery.riderId)
    : [];
  return found.map((r) => ({
    orderId: r.orderId,
    firstName: r.name.split(" ")[0] ?? r.name,
    stop: r.stop,
    stops: stops.find((x) => x.riderId === r.riderId)?.n ?? 1,
    position:
      r.lat != null && r.lng != null && r.at && Date.now() - r.at.getTime() < POSITION_FRESH_MS
        ? { lat: r.lat, lng: r.lng, at: r.at.toISOString() }
        : null,
  }));
}

export async function customerViews(db: Db, secret: string, rows: OrderRow[]) {
  const full = await loadOrders(db, rows, true);
  const riders = await customerRiders(db, rows);
  return Promise.all(
    rows.map(async (o, i) => {
      const f = full[i]!;
      const live = !(FINISHED as readonly string[]).includes(o.status);
      const r = riders.find((x) => x.orderId === o.id);
      return {
        id: o.id,
        number: o.number,
        type: o.type,
        status: o.status,
        exception: o.exception,
        foodTotal: o.foodTotal,
        deliveryFee: o.deliveryFee,
        total: o.total,
        paymentMethod: o.paymentMethod,
        placedAt: o.placedAt,
        items: f.items.map(({ station: _s, ticked: _t, ...item }) => item),
        address: f.customer && "address" in f.customer ? f.customer.address : null,
        events: f.events!.map((e) => ({ status: e.status, at: e.at })),
        deliveryCode: o.type === "delivery" && live ? await deliveryCode(secret, o.id) : null,
        // Refund status without staff details, and the request's state (4.6).
        refunds: f.refunds!.map((r) => ({
          amount: r.amount,
          kind: r.kind,
          status: r.status,
          at: r.at,
        })),
        cancellationRequest: f.cancellationRequest
          ? { status: f.cancellationRequest.status }
          : null,
        canCancel: (CUSTOMER_CAN_CANCEL as readonly string[]).includes(o.status),
        rider: r
          ? {
              firstName: r.firstName,
              stop: r.stop,
              stops: r.stops,
              // The position only after pickup (CUS-09), never while waiting at the kitchen.
              position: (ON_THE_WAY as readonly string[]).includes(o.status) ? r.position : null,
            }
          : null,
        version: o.version,
      };
    }),
  );
}

export const customerView = async (db: Db, secret: string, o: OrderRow) =>
  (await customerViews(db, secret, [o]))[0]!;
