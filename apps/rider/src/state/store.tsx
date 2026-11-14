import type { Me } from "@cke/api-client";
import { DEFAULTS } from "@cke/validation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Vibration } from "react-native";
import { QUEUE, clockTime, earlierToday, orderLoad, type QueueOrder } from "../data/orders";

// Demo state for the rider app. Later this comes from the API and the live connection.

export type Carried = QueueOrder & { picked: boolean };
export type Done = { no: string; area: string; time: string; pay: number };

export type State = {
  signedIn: boolean;
  /** The signed-in rider from the API (GET /me); null in the demo. */
  me: Me | null;
  /** True at the first sign-in and after a manager resets the password (RID-20). */
  mustSetPassword: boolean;
  online: boolean;
  themePref: "light" | "dark" | "system";
  sound: boolean;
  vibrate: boolean;
  /** Pay per delivery, set by the manager (architecture.md 18.2). */
  pay: number;
  /** Capacity budget, set by the manager (architecture.md 6). */
  budget: number;
  queue: QueueOrder[];
  /** Orders the rider carries, in stop order. */
  carrying: Carried[];
  delivered: Done[];
  codeTries: number;
  /** Preview only: another rider wins the next accept. */
  raceLost: boolean;
  newOrder: boolean;
};

export const MAX_ORDERS = 3;

export const initial = (): State => ({
  signedIn: false,
  me: null,
  mustSetPassword: true,
  online: false,
  themePref: "light",
  sound: true,
  vibrate: true,
  pay: DEFAULTS.riderPay,
  budget: DEFAULTS.capacityBudget,
  queue: QUEUE,
  carrying: [],
  delivered: earlierToday().map((d) => ({ ...d, pay: DEFAULTS.riderPay })),
  codeTries: 0,
  raceLost: false,
  newOrder: true,
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
  const reset = useCallback(() => setS(initial()), []);
  const value = useMemo(() => ({ s, set, reset }), [s, set, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

/* ---------- capacity (architecture.md 6) ---------- */

export const usedLoad = (s: State) => s.carrying.reduce((a, o) => a + orderLoad(o), 0);

/** An order fits when the rider has fewer than three orders and the combined load fits the budget. */
export const fits = (s: State, o: QueueOrder) =>
  s.carrying.length < MAX_ORDERS && usedLoad(s) + orderLoad(o) <= s.budget;

export function accept(s: State, no: string): Partial<State> {
  const o = s.queue.find((q) => q.no === no);
  if (!o || !fits(s, o)) return {};
  // Stops in the suggested order, nearest first. Orders not yet picked up come first.
  const carrying = [...s.carrying, { ...o, picked: false }].sort(
    (a, b) => Number(a.picked) - Number(b.picked) || a.km - b.km,
  );
  return { carrying, queue: s.queue.filter((q) => q.no !== no), newOrder: false };
}

/** Picking up collects every bag waiting at the kitchen in one go. */
export const pickUpAll = (s: State): Partial<State> => ({
  carrying: s.carrying.map((o) => ({ ...o, picked: true })),
});

export function completeNext(s: State): Partial<State> {
  const [first, ...rest] = s.carrying;
  if (!first) return {};
  const time = clockTime(Date.now());
  return {
    carrying: rest,
    codeTries: 0,
    delivered: [{ no: first.no, area: first.area, time, pay: s.pay }, ...s.delivered],
  };
}

/** Puts the current stop back in the queue for another rider (RID-12). */
export function releaseNext(s: State): Partial<State> {
  const [first, ...rest] = s.carrying;
  if (!first) return {};
  const { picked: _picked, ...order } = first;
  return { carrying: rest, codeTries: 0, queue: [order, ...s.queue] };
}

/** Moves a later stop to the front (the rider can change the suggested order). */
export function deliverFirst(s: State, no: string): Partial<State> {
  const o = s.carrying.find((c) => c.no === no);
  if (!o) return {};
  return { carrying: [o, ...s.carrying.filter((c) => c.no !== no)] };
}

/** Strong alert for new orders and status changes (RID-14). Sound comes with push notifications later. */
export function alertRider(s: State) {
  if (s.vibrate) Vibration.vibrate([0, 250, 120, 250]);
}
