import { DEFAULTS } from "@cke/validation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  AREAS,
  MENU,
  OWED_EARLIER,
  PAYOUTS,
  PEOPLE,
  ROLE_LABEL,
  RIDERS_ONLINE,
  SOUPS,
  orderLoad,
  orderTotal,
  seedAlerts,
  seedAudit,
  seedCashUps,
  seedMonthCloses,
  seedOrders,
  type Alert,
  type AuditEntry,
  type CashUp,
  type Line,
  type MenuItem,
  type MonthClose,
  type Order,
  type Payout,
  type Person,
  type Rider,
  type Role,
} from "../data/seed";

// Demo state for the Business and Kitchen app. Later this comes from the API and the live connection.

export type Settings = {
  paused: boolean;
  areas: Record<string, boolean>;
  budget: number;
  batchKm: number;
  tracking: "light" | "milestones";
  cancelLimit: number;
  fee: number;
  riderPay: number;
  /** The WhatsApp number behind "Contact the restaurant" in the customer app (MGR-36). */
  whatsapp: string;
};

export type StaffPhoto = {
  uri: string;
  sourceKind: "business" | "internet" | null;
  author: string | null;
  licence: string | null;
  sourceUrl: string | null;
};

export type WalkInDraft = {
  lines: Record<string, number>;
  type: "eatin" | "takeaway";
  name: string;
};

export type State = {
  userId: string | null;
  themePref: "light" | "dark" | "system";
  people: Person[];
  menu: MenuItem[];
  orders: Order[];
  riders: Rider[];
  alerts: Alert[];
  settings: Settings;
  cashUps: CashUp[];
  /** Today's cash-up (ACC-04): counted at close, then signed off in Finance. */
  today: {
    counted: number | null;
    countedBy?: string;
    signedOffBy?: string;
    signedOffAt?: number;
    note?: string;
  };
  payouts: Payout[];
  owedEarlier: Record<string, number>;
  /** Every refund, with who made it (name, role, staff ID) (MGR-15). Shown in Reports, Refunds. */
  refunds: Refund[];
  audit: AuditEntry[];
  /** Closed months, each with who closed it and when (ACC-07). */
  monthCloses: MonthClose[];
  draft: WalkInDraft;
  /**
   * The soup rotation and today's soup (KIT-17). From the API when connected (ids set), otherwise
   * the demo list. Managers add and remove soups on Menu; kitchen staff pick today's on Sold out.
   */
  soups: { id?: string; name: string }[];
  soupToday: string;
  /** Where the menu data came from: the API, or the demo data in the app. */
  catalogFrom: "api" | "demo";
  /** Photo addresses by dish or soup name, from the API. Empty means no photos. */
  photos: Record<string, string>;
  /** Database IDs of the menu items, by name, for changing their photos. */
  catalogIds: Record<string, string>;
  /** Each staff member's photo and its credit, by staff code (from the API). */
  staffPhotos: Record<string, StaffPhoto>;
  walkInSeq: number;
  onlineSeq: number;
};

export const initial = (): State => ({
  userId: null,
  themePref: "light",
  people: PEOPLE,
  menu: MENU,
  orders: seedOrders(),
  riders: RIDERS_ONLINE,
  alerts: seedAlerts(),
  settings: {
    paused: false,
    areas: Object.fromEntries(AREAS.map((a) => [a, true])),
    budget: DEFAULTS.capacityBudget,
    batchKm: 1.5,
    tracking: "light",
    cancelLimit: DEFAULTS.cancellationLimit,
    fee: DEFAULTS.deliveryFee,
    riderPay: DEFAULTS.riderPay,
    whatsapp: "2349095466063",
  },
  cashUps: seedCashUps(),
  today: { counted: null },
  payouts: PAYOUTS,
  owedEarlier: OWED_EARLIER,
  refunds: [],
  audit: seedAudit(),
  monthCloses: seedMonthCloses(),
  draft: { lines: {}, type: "takeaway", name: "" },
  soups: SOUPS.map((name) => ({ name })),
  soupToday: "Egusi",
  catalogFrom: "demo",
  photos: {},
  catalogIds: {},
  staffPhotos: {},
  walkInSeq: 7,
  onlineSeq: 2180,
});

type Update = Partial<State> | ((s: State) => Partial<State>);
type Store = { s: State; set: (u: Update) => void; reset: () => void };

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const set = useCallback(
    (u: Update) => setS((prev) => ({ ...prev, ...(typeof u === "function" ? u(prev) : u) })),
    [],
  );
  const reset = useCallback(
    () => setS((prev) => ({ ...initial(), userId: prev.userId, themePref: prev.themePref })),
    [],
  );
  const value = useMemo(() => ({ s, set, reset }), [s, set, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

/* ---------- people and roles ---------- */

export const person = (s: State, id?: string) => s.people.find((p) => p.id === id);
export const me = (s: State) => person(s, s.userId ?? undefined);
export const myRole = (s: State): Role => (me(s)?.role as Role) ?? "kitchen";
export const nameOf = (s: State, id?: string) =>
  id === "System" ? "System" : (person(s, id)?.name ?? id ?? "");
export const firstName = (s: State, id?: string) => nameOf(s, id).split(" ")[0];

/* ---------- audit ---------- */

export const log = (s: State, kind: AuditEntry["kind"], action: string): Pick<State, "audit"> => ({
  audit: [{ at: Date.now(), who: s.userId ?? "System", kind, action }, ...s.audit],
});

/* ---------- orders ---------- */

export const findOrder = (s: State, no?: string) => s.orders.find((o) => o.no === no);

function patchOrder(
  s: State,
  no: string,
  patch: (o: Order) => Partial<Order>,
  event?: string,
): Partial<State> {
  return {
    orders: s.orders.map((o) =>
      o.no === no
        ? {
            ...o,
            ...patch(o),
            events: event
              ? [...o.events, { label: event, at: Date.now(), by: s.userId ?? "System" }]
              : o.events,
          }
        : o,
    ),
  };
}

export const acknowledge = (s: State, no: string) =>
  patchOrder(s, no, () => ({ status: "preparing" }), "Acknowledged");

export const tick = (s: State, no: string, i: number) =>
  patchOrder(s, no, (o) => ({
    lines: o.lines.map((l, j) => (j === i ? { ...l, ticked: !l.ticked } : l)),
  }));

export const markReady = (s: State, no: string) =>
  patchOrder(
    s,
    no,
    (o) => ({ status: "ready", lines: o.lines.map((l) => ({ ...l, ticked: true })) }),
    "Ready",
  );

export const markCollected = (s: State, no: string) =>
  patchOrder(s, no, () => ({ status: "done" }), "Collected");

export type Refund = {
  orderNo: string;
  channel: Order["channel"];
  amount: number;
  kind: "full" | "partial";
  reason: string;
  at: number;
  /** Who made the refund: their staff ID, name, and role when they made it. */
  by: string;
  byName: string;
  byRole: string;
};

/** The person signed in, as recorded on money actions: “Efosa Igbinedion, Manager (M-001)”. */
export function actorLabel(s: State) {
  const p = me(s);
  return p ? `${p.name}, ${ROLE_LABEL[p.role as Role] ?? p.role} (${p.id})` : "System";
}

/** Records a refund with who made it, and writes it to the audit trail (MGR-15, ACC-05). */
export function recordRefund(
  s: State,
  o: Order,
  amount: number,
  kind: Refund["kind"],
  reason: string,
): Pick<State, "refunds" | "audit"> {
  const p = me(s);
  const r: Refund = {
    orderNo: o.no,
    channel: o.channel,
    amount,
    kind,
    reason,
    at: Date.now(),
    by: p?.id ?? "System",
    byName: p?.name ?? "System",
    byRole: p ? (ROLE_LABEL[p.role as Role] ?? p.role) : "System",
  };
  return {
    refunds: [r, ...s.refunds],
    ...log(
      s,
      "money",
      `${kind === "full" ? "Refunded" : "Partly refunded"} ${o.no}: ₦${amount.toLocaleString("en-US")} (${reason}). By ${actorLabel(s)}`,
    ),
  };
}

export function cancelOrder(s: State, no: string, reason: string): Partial<State> {
  const o = findOrder(s, no);
  if (!o) return {};
  return {
    ...patchOrder(
      s,
      no,
      () => ({ status: "cancelled", refunded: orderTotal(o) }),
      `Cancelled and refunded: ${reason}`,
    ),
    ...recordRefund(s, o, orderTotal(o), "full", `Cancelled: ${reason}`),
  };
}

export function partialRefund(s: State, no: string, amount: number, reason: string) {
  const o = findOrder(s, no);
  if (!o) return {};
  return {
    ...patchOrder(s, no, () => ({ refunded: amount }), `Partly refunded: ${reason}`),
    ...recordRefund(s, o, amount, "partial", reason),
  };
}

export const clearAlert = (s: State, id: string) => ({
  alerts: s.alerts.filter((a) => a.id !== id),
});

/* ---------- riders ---------- */

export const riderOrders = (s: State, riderId: string) =>
  s.orders.filter((o) => o.riderId === riderId && (o.status === "ready" || o.status === "out"));

export const riderLoad = (s: State, riderId: string) =>
  riderOrders(s, riderId).reduce((a, o) => a + orderLoad(o), 0);

export const riderFits = (s: State, riderId: string, o: Order) =>
  riderOrders(s, riderId).length < 3 && riderLoad(s, riderId) + orderLoad(o) <= s.settings.budget;

export function assignRider(s: State, no: string, riderId: string): Partial<State> {
  const after = patchOrder(
    s,
    no,
    () => ({ riderId }),
    `Assigned to ${nameOf(s, riderId)} by dispatch`,
  );
  return {
    ...after,
    alerts: s.alerts.filter((a) => !(a.kind === "unaccepted" && a.orderNo === no)),
    ...log(s, "account", `Assigned ${no} to ${riderId}`),
  };
}

/* ---------- soup dishes (KIT-17) ---------- */

/**
 * A dish's name with today's soup in it, for the walk-in tiles, tickets, and sold-out list:
 * “Efo riro with eba”, “Extra efo riro”. Other dishes keep their name.
 */
export function dishName(m: Pick<MenuItem, "id" | "name">, soup: string) {
  if (!soup) return m.name;
  if (m.id === "soup") return `${soup} with eba`;
  if (m.id === "xsoup") return `Extra ${soup.toLowerCase()}`;
  return m.name;
}

/* ---------- walk-in ---------- */

export const draftLines = (s: State): Line[] =>
  Object.entries(s.draft.lines)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => {
      const m = s.menu.find((x) => x.id === id)!;
      return { name: dishName(m, s.soupToday), qty, station: m.station, ticked: false };
    });

export const draftTotal = (s: State) =>
  Object.entries(s.draft.lines).reduce(
    (a, [id, q]) => a + (s.menu.find((m) => m.id === id)?.price ?? 0) * q,
    0,
  );

export function placeWalkIn(s: State, pay: Order["pay"], cashReceived?: number): Partial<State> {
  const no = `W-${String(s.walkInSeq).padStart(3, "0")}`;
  const order: Order = {
    no,
    channel: "walkin",
    type: s.draft.type,
    status: "new",
    lines: draftLines(s),
    food: draftTotal(s),
    fee: 0,
    pay,
    cashReceived,
    placedAt: Date.now(),
    name: s.draft.name.trim() || undefined,
    enteredBy: s.userId ?? undefined,
    events: [{ label: "Placed at the counter", at: Date.now(), by: s.userId ?? "System" }],
  };
  return {
    orders: [order, ...s.orders],
    walkInSeq: s.walkInSeq + 1,
    draft: { lines: {}, type: "takeaway", name: "" },
  };
}

/** Cash expected in the drawer today: walk-in cash payments minus cash refunds (ACC-04). */
export const cashExpectedToday = (s: State) =>
  s.orders
    .filter((o) => o.channel === "walkin" && o.pay === "cash")
    .reduce((a, o) => a + (o.status === "cancelled" ? 0 : orderTotal(o)), 0);

/* ---------- money ---------- */

export const deliveredToday = (s: State, riderId: string) =>
  s.orders.filter((o) => o.riderId === riderId && o.status === "done").length;

export const owedDeliveries = (s: State, riderId: string) =>
  (s.owedEarlier[riderId] ?? 0) + deliveredToday(s, riderId);

export function payRider(s: State, riderId: string): Partial<State> {
  const n = owedDeliveries(s, riderId);
  const amount = n * s.settings.riderPay;
  return {
    payouts: [
      {
        riderId,
        period: "Week to Thu 12 Nov",
        deliveries: n,
        amount,
        paidBy: s.userId ?? "System",
      },
      ...s.payouts,
    ],
    owedEarlier: { ...s.owedEarlier, [riderId]: -deliveredToday(s, riderId) },
    ...log(
      s,
      "money",
      `Paid ${riderId} ₦${amount.toLocaleString("en-US")} for the week to Thu 12 Nov`,
    ),
  };
}

/** A clock time in the app’s style, such as “9:05 am”. */
export function clock(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const minsAgo = (ms: number) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  return m === 0 ? "just now" : `${m} min`;
};
