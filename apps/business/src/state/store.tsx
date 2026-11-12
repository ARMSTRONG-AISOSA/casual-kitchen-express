import { DEFAULTS } from "@cke/validation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  AREAS,
  MENU,
  OWED_EARLIER,
  PAYOUTS,
  PEOPLE,
  RIDERS_ONLINE,
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
  audit: AuditEntry[];
  /** Closed months, each with who closed it and when (ACC-07). */
  monthCloses: MonthClose[];
  draft: WalkInDraft;
  /** Today's soup, set each morning by kitchen staff (Sold out) or a manager (Menu) (KIT-17). */
  soupToday: string;
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
  audit: seedAudit(),
  monthCloses: seedMonthCloses(),
  draft: { lines: {}, type: "takeaway", name: "" },
  soupToday: "Egusi",
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

export function cancelOrder(s: State, no: string, reason: string): Partial<State> {
  const o = findOrder(s, no);
  if (!o) return {};
  return {
    ...patchOrder(
      s,
      no,
      () => ({ status: "cancelled", refunded: orderTotal(o) }),
      `Cancelled: ${reason}`,
    ),
    ...log(
      s,
      "money",
      `Cancelled ${no} and refunded ₦${orderTotal(o).toLocaleString("en-US")} (${reason})`,
    ),
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

/* ---------- walk-in ---------- */

export const draftLines = (s: State): Line[] =>
  Object.entries(s.draft.lines)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => {
      const m = s.menu.find((x) => x.id === id)!;
      return { name: m.name, qty, station: m.station, ticked: false };
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
