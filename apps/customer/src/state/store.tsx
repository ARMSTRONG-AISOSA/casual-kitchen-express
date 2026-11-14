import { router } from "expo-router";
import { DEFAULTS } from "@cke/validation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  dishName,
  findItem,
  usesSoup,
  PROTEINS,
  SOUPS,
  SWALLOWS,
  type MenuItem,
  type ProteinId,
  type SwallowId,
} from "../data/menu";
import type { Point } from "../data/geo";

// In-app state for building the screens against mock data. It moves to the API
// (with TanStack Query) once the backend exists.

/** `soup` is the soup's name, as shown to the customer. */
export type Options = { protein?: ProteinId; soup?: string; swallow?: SwallowId };
export type Line = { id: string; opt: Options; qty: number; unit: number; label: string };
export type Address = {
  label: "Home" | "Work" | "Other";
  area: string;
  landmark: string;
  phone: string;
  pin: Point;
};
export type Order = {
  no: string;
  mode: "delivery" | "pickup";
  food: number;
  fee: number;
  total: number;
  stage: number;
  items: string;
  lines: Line[];
  pay: "card" | "transfer";
  /** When the order was placed, in milliseconds. */
  placedAt: number;
  cancelled?: boolean;
  refund?: "pending" | "completed";
  requested?: boolean;
};
export type PastOrder = {
  no: string;
  date: string;
  items: string;
  total: number;
  status: string;
  lines: Line[];
};

export type State = {
  themePref: "light" | "dark" | "system";
  returning: boolean;
  signedIn: boolean;
  deactivated: boolean;
  name: string;
  email: string;
  gender: string;
  customerId: string;
  photo: boolean;
  /** The profile photo to show: the API’s address, or the picked file in the demo. Empty: initials. */
  photoUri: string;
  hasAddress: boolean;
  address: Address;
  savedCard: boolean;
  cart: Line[];
  mode: "delivery" | "pickup";
  open: "open" | "closed" | "paused";
  /** The soup rotation and today's soup, set in the Business app (KIT-17). */
  soups: string[];
  soupToday: string;
  /** Where the menu data came from: the API, or the demo data in the app. */
  catalogFrom: "api" | "demo";
  /** Photo addresses by dish or soup name, from the API. Empty means placeholders. */
  photos: Record<string, string>;
  fee: number;
  pay: "card" | "transfer";
  order: Order | null;
  history: PastOrder[];
  recentCancels: number;
};

const firstTime = {
  returning: false,
  signedIn: false,
  name: "",
  email: "",
  gender: "",
  customerId: "",
  hasAddress: false,
  savedCard: false,
  history: [] as PastOrder[],
};

export const initialState: State = {
  themePref: "light",
  deactivated: false,
  photo: false,
  photoUri: "",
  address: {
    label: "Home",
    area: "Ekosodin",
    landmark: "Blue gate after Ekosodin Market",
    phone: "0803 555 0142",
    pin: [168, 122],
  },
  cart: [],
  mode: "delivery",
  open: "open",
  soups: SOUPS,
  soupToday: "Egusi",
  catalogFrom: "demo",
  photos: {},
  fee: DEFAULTS.deliveryFee,
  pay: "card",
  order: null,
  recentCancels: 0,
  ...firstTime,
};

/* ---------- menu and cart helpers ---------- */

/** Default options: chicken for rice meals, and today's soup with eba. */
export function defaults(it: MenuItem, soup = "Egusi"): Options {
  if (it.opts === "protein") return { protein: "chicken" };
  if (it.opts === "soup") return { soup, swallow: "eba" };
  // Extra soup and Home Plate keep the soup they were ordered with, even if it changes later.
  if (usesSoup(it)) return { soup };
  return {};
}

export function unitPrice(it: MenuItem, opt: Options): number {
  if (it.opts !== "protein") return it.price;
  return it.price + (PROTEINS.find((p) => p.id === opt.protein)?.price ?? 0);
}

export function optLabel(it: MenuItem, opt: Options): string {
  if (it.opts === "protein") {
    if (opt.protein === "none") return "No protein";
    const p = PROTEINS.find((x) => x.id === opt.protein);
    return p ? "With " + p.label.toLowerCase() : "";
  }
  if (it.opts === "soup") {
    const soup = opt.soup ?? "";
    const swallow = SWALLOWS.find((x) => x.id === opt.swallow)?.label.toLowerCase() ?? "";
    return `${soup}, ${swallow}`;
  }
  if (it.id === "homeplate" && opt.soup) return `With ${opt.soup.toLowerCase()}`;
  return "";
}

export function makeLine(id: string, opt?: Options, qty = 1): Line {
  const it = findItem(id);
  if (!it) throw new Error(`Unknown menu item ${id}`);
  const o = opt ?? defaults(it);
  return { id, opt: o, qty, unit: unitPrice(it, o), label: optLabel(it, o) };
}

export function addLine(cart: Line[], line: Line): Line[] {
  const key = JSON.stringify([line.id, line.opt]);
  const found = cart.find((c) => JSON.stringify([c.id, c.opt]) === key);
  if (found) return cart.map((c) => (c === found ? { ...c, qty: c.qty + line.qty } : c));
  return [...cart, line];
}

export const cartCount = (cart: Line[]) => cart.reduce((a, c) => a + c.qty, 0);
export const cartFood = (cart: Line[]) => cart.reduce((a, c) => a + c.qty * c.unit, 0);
/** A short summary such as “2 × Jollof rice (with beef), Meat pie”. */
export const itemsText = (lines: Line[]) =>
  lines
    .map((l) => {
      const it = findItem(l.id);
      const name = it ? dishName(it, l.opt.soup) : l.id;
      const opt = l.label ? ` (${l.label.charAt(0).toLowerCase()}${l.label.slice(1)})` : "";
      return `${l.qty > 1 ? `${l.qty} × ` : ""}${name}${opt}`;
    })
    .join(", ");

/* ---------- demo customer types ---------- */

export function returningCustomer(): Partial<State> {
  return {
    returning: true,
    signedIn: true,
    name: "Ada Okoro",
    email: "ada.okoro@gmail.com",
    gender: "Female",
    customerId: "C-00418",
    hasAddress: true,
    savedCard: true,
    history: [
      {
        no: "O-2148",
        date: "Yesterday",
        items: "Classic Jollof Combo, Meat pie",
        total: 4800 + 1200 + DEFAULTS.deliveryFee,
        status: "Delivered",
        lines: [makeLine("classic"), makeLine("meatpie")],
      },
      {
        no: "O-1851",
        date: "Mon 2 Nov",
        items: "Soup of the day (egusi, pounded yam)",
        total: 3000 + DEFAULTS.deliveryFee,
        status: "Delivered",
        lines: [makeLine("soup", { soup: "egusi", swallow: "poundo" })],
      },
      {
        no: "O-1760",
        date: "Fri 30 Oct",
        items: "Office Lunch Combo",
        total: 4100 + DEFAULTS.deliveryFee,
        status: "Delivered",
        lines: [makeLine("office")],
      },
      {
        no: "O-1633",
        date: "Tue 27 Oct",
        items: "Fried rice with beef",
        total: 3200 + DEFAULTS.deliveryFee,
        status: "Cancelled, refunded",
        lines: [makeLine("fried", { protein: "beef" })],
      },
    ],
  };
}

export const firstTimeCustomer = (): Partial<State> => ({ ...firstTime });

/* ---------- context ---------- */

type Update = Partial<State> | ((s: State) => Partial<State>);
type Store = { s: State; set: (u: Update) => void; reset: () => void };

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initialState);
  const set = useCallback(
    (u: Update) => setS((prev) => ({ ...prev, ...(typeof u === "function" ? u(prev) : u) })),
    [],
  );
  const reset = useCallback(
    () => setS((prev) => ({ ...initialState, themePref: prev.themePref })),
    [],
  );
  const value = useMemo(() => ({ s, set, reset }), [s, set, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Places the order from the cart (simulated payment). Returns the new order. */
/** Online numbers run on from the demo's last order (O-2172) and never repeat. */
function nextOrderNo(s: State) {
  const used = [s.order?.no, ...s.history.map((h) => h.no)].map((n) => Number(n?.slice(2)) || 0);
  return `O-${Math.max(2172, ...used) + 1}`;
}

export function placeOrder(s: State): Partial<State> {
  const food = cartFood(s.cart);
  const fee = s.mode === "delivery" ? s.fee : 0;
  const order: Order = {
    no: nextOrderNo(s),
    mode: s.mode,
    food,
    fee,
    total: food + fee,
    stage: 1,
    items: itemsText(s.cart),
    lines: s.cart,
    pay: s.pay,
    placedAt: Date.now(),
  };
  // After the first order the customer is returning, so the optional gender question isn't asked again.
  return { order, cart: [], returning: true, savedCard: s.savedCard || s.pay === "card" };
}

/**
 * After paying, clear Your order, Checkout, and Pay off the back stack, so the phone's back button
 * from Paid or tracking goes to the menu, not to an empty checkout.
 */
export function showPaid() {
  if (router.canDismiss()) router.dismissAll();
  router.push("/paid");
}

/** Moves the current order into Order history (once it's finished or cancelled). */
export function archiveOrder(s: State): Partial<State> {
  const o = s.order;
  if (!o) return {};
  const status = o.cancelled
    ? "Cancelled, refunded"
    : o.mode === "delivery"
      ? "Delivered"
      : "Collected";
  return {
    order: null,
    history: [
      { no: o.no, date: "Today", items: o.items, total: o.total, status, lines: o.lines },
      ...s.history,
    ],
  };
}
