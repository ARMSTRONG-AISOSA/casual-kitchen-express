import type { AlertView, OrderRow, OrderStatus, StaffOrder } from "@cke/api-client";
import type { Alert, Line, Order, Station } from "../data/seed";

// Turns the API's records into the shapes the Business app's screens already use (build step 6),
// so every screen works the same on live data as on the demo data.

/** The board's three stages, then out for delivery and done (design.md 6.2). */
export function stageOf(s: OrderStatus): Order["status"] {
  switch (s) {
    case "placed":
    case "confirmed":
      return "new";
    case "acknowledged":
    case "preparing":
      return "preparing";
    case "ready":
    case "ready_for_collection":
    case "rider_accepted":
      return "ready";
    case "picked_up":
    case "arriving":
      return "out";
    case "delivered":
    case "collected":
      return "done";
    case "cancelled":
      return "cancelled";
  }
}

const TYPE: Record<StaffOrder["type"], Order["type"]> = {
  delivery: "delivery",
  pickup: "pickup",
  eat_in: "eatin",
  take_away: "takeaway",
};

const STATION: Record<StaffOrder["items"][number]["station"], Station> = {
  rice: "Rice",
  soups_and_swallows: "Soups and swallows",
  snacks_and_drinks: "Snacks and drinks",
};

/** Timeline labels, in the app's words. */
export const EVENT_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Payment confirmed",
  acknowledged: "Acknowledged",
  preparing: "Preparing",
  ready: "Ready",
  ready_for_collection: "Ready for collection",
  rider_accepted: "Rider accepted",
  picked_up: "Picked up",
  arriving: "Arriving",
  delivered: "Delivered",
  collected: "Collected",
  cancelled: "Cancelled",
};

/**
 * A line's name as the kitchen reads it: "Jollof rice with chicken", "Jollof rice, no protein",
 * "Efo riro with eba" (a soup dish takes today's soup), "Extra efo riro".
 */
export function lineName(name: string, options: string[] = []) {
  const soup = /^(.*) \((.+)\)$/.exec(name);
  if (soup) {
    const [, dish, variety] = soup;
    if (/^extra soup$/i.test(dish!)) return `Extra ${variety!.toLowerCase()}`;
    const swallow = options[0];
    return swallow ? `${variety} with ${swallow.toLowerCase()}` : `${variety} (${dish})`;
  }
  const opt = options[0];
  if (!opt) return name;
  return /^no /i.test(opt) ? `${name}, ${opt.toLowerCase()}` : `${name} with ${opt.toLowerCase()}`;
}

const ms = (x: string | null | undefined) => (x ? new Date(x).getTime() : 0);

/** A staff order (the board, the live connection, or the detail) as the app's Order. */
export function mapOrder(o: StaffOrder, prev?: Order): Order {
  const lines: Line[] = o.items.map((i) => ({
    id: i.id,
    name: lineName(i.name, i.options),
    qty: i.quantity,
    station: STATION[i.station],
    ticked: i.ticked,
  }));
  const refunds = o.refunds?.map((r) => ({
    amount: r.amount,
    kind: r.kind,
    reason: r.reason,
    at: ms(r.at),
    by: r.by?.code ?? "System",
    byName: r.by?.name ?? "System",
    byRole: r.by?.role ?? "",
  }));
  return {
    no: o.number,
    id: o.id,
    channel: o.channel,
    type: TYPE[o.type],
    status: stageOf(o.status),
    lines: lines.length || !prev ? lines : prev.lines,
    food: o.foodTotal,
    fee: o.deliveryFee,
    pay: o.paymentMethod,
    cashReceived: o.payment?.cashReceived ?? prev?.cashReceived,
    placedAt: ms(o.placedAt),
    customerId: o.customer?.code,
    practice: o.practice,
    // Practice orders (Demo controls, 18.4) say so wherever the name shows.
    name: o.practice
      ? o.channel === "walkin"
        ? "Practice"
        : `Practice: ${o.customer?.name ?? "demo customer"}`
      : o.channel === "walkin"
        ? (o.label ?? undefined)
        : o.customer?.name,
    customerPhone: o.customer?.phone ?? prev?.customerPhone,
    address: o.customer?.address ?? prev?.address,
    riderId: o.rider?.code,
    riderName: o.rider?.name,
    enteredBy: o.enteredBy?.code,
    load: o.load,
    exception: o.exception,
    events: o.events
      ? o.events.map((e) => ({
          label:
            o.channel === "walkin" && e.status === "placed"
              ? "Placed at the counter"
              : EVENT_LABEL[e.status],
          at: ms(e.at),
          by: e.by.kind === "staff" ? (e.by.code ?? "") : "System",
          byName:
            e.by.kind === "staff"
              ? (e.by.name ?? undefined)
              : e.by.kind === "customer"
                ? "Customer"
                : "System",
        }))
      : (prev?.events ?? [{ label: "Placed", at: ms(o.placedAt), by: "System" }]),
    refunded: refunds ? refunds.reduce((a, r) => a + r.amount, 0) : prev?.refunded,
    refunds: refunds ?? prev?.refunds,
    partial: false,
  };
}

/** A row from the order list (any range): no lines until the detail is opened. */
export function mapRow(r: OrderRow, prev?: Order): Order {
  if (prev && !prev.partial) return { ...prev, status: stageOf(r.status), exception: r.exception };
  return {
    no: r.number,
    id: r.id,
    practice: r.practice,
    channel: r.channel,
    type: TYPE[r.type],
    status: stageOf(r.status),
    lines: [],
    food: r.total,
    fee: 0,
    pay: r.paymentMethod,
    placedAt: ms(r.placedAt),
    customerId: r.customerCode ?? undefined,
    name: r.channel === "walkin" ? (r.label ?? undefined) : (r.customerName ?? undefined),
    enteredBy: r.enteredByCode ?? undefined,
    exception: r.exception,
    events: [{ label: "Placed", at: ms(r.placedAt), by: r.enteredByCode ?? "System" }],
    partial: true,
  };
}

const first = (name?: string | null) => (name ?? "").split(" ")[0] || "Someone";

const HELP: Record<string, string> = {
  customer_unreachable: "the customer can’t be reached",
  code_problem: "the code doesn’t work",
  other: "something else",
};

/** An alert card in the app's words (design.md 6.4). Null for kinds the app doesn't show. */
export function mapAlert(a: AlertView): Alert | null {
  const no = a.order?.number ?? "";
  const status = a.order?.status;
  const base = {
    id: a.id,
    orderNo: no,
    at: ms(a.createdAt),
    requestId: a.requestId ?? undefined,
    orderId: a.order?.id,
  };
  switch (a.kind) {
    case "unaccepted":
      return { ...base, kind: "unaccepted", text: `No rider has taken ${no} yet.` };
    case "stuck":
      return {
        ...base,
        kind: "late",
        text:
          status === "placed" || status === "confirmed"
            ? `${no} hasn’t been acknowledged in time.`
            : status === "picked_up" || status === "arriving"
              ? `${no} is taking too long on the road.`
              : `${no} is taking too long in the kitchen.`,
      };
    case "help_request":
      return {
        ...base,
        kind: "help",
        text: `${first(a.rider?.name)} needs help with ${no}: ${HELP[a.reason ?? "other"] ?? a.reason}.`,
      };
    case "cancellation_request":
      return {
        ...base,
        kind: "cancel",
        text: `${first(a.customerName)} asked to cancel ${no}: ${a.reason ?? ""}`,
      };
    case "item_unavailable":
      return { ...base, kind: "unavailable", text: `An item on ${no} is unavailable.` };
  }
}
