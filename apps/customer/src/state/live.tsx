import {
  ApiError,
  type Bootstrap,
  type CustomerLiveMessage,
  type MyAddress,
  type MyOrder,
} from "@cke/api-client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { api } from "../api";
import { sessionCookie } from "../auth";
import { registerPush } from "../push";
import { refreshCatalog } from "./catalog";
import { MENU, PROTEINS, SWALLOWS, type ProteinId, type SwallowId } from "../data/menu";
import { useToast } from "../ui/toast";
import {
  itemsText,
  makeLine,
  useStore,
  type Address,
  type Line,
  type Order,
  type PastOrder,
} from "./store";

// The customer app on live data (build step 6c, architecture.md 10 and 14.4). Once signed in it
// loads the order in progress, the order history, and the address book; keeps one WebSocket to the
// live hub, where each change to the customer's own orders arrives (tracking moves on by itself);
// and asks again when the app comes back from the background. Checkout, cancelling, requests, and
// ratings go to the API, which prices every order itself and answers in plain English.

/** The step each status reaches on the tracking screen (data/order.ts). */
const DELIVERY_STEP: Partial<Record<MyOrder["status"], number>> = {
  placed: 0,
  confirmed: 1,
  acknowledged: 2,
  preparing: 3,
  ready: 4,
  rider_accepted: 5,
  picked_up: 6,
  arriving: 7,
  delivered: 8,
};
const PICKUP_STEP: Partial<Record<MyOrder["status"], number>> = {
  placed: 0,
  confirmed: 1,
  acknowledged: 2,
  preparing: 3,
  ready_for_collection: 4,
  collected: 5,
};

const PROTEIN_BY_NAME = Object.fromEntries(PROTEINS.map((p) => [p.label, p.id])) as Record<
  string,
  ProteinId
>;
const SWALLOW_BY_NAME = Object.fromEntries(SWALLOWS.map((x) => [x.label, x.id])) as Record<
  string,
  SwallowId
>;

/** An order line from the API as the app's cart line, so "Order this again" works. */
function toLine(i: MyOrder["items"][number]): Line {
  const soup = /^(.*) \((.+)\)$/.exec(i.name);
  const base = soup ? soup[1]! : i.name;
  const it = MENU.find((m) => m.name === base);
  const opt = i.options[0];
  if (!it) return { id: i.name, opt: {}, qty: i.quantity, unit: i.unitPrice, label: opt ?? "" };
  return makeLine(
    it.id,
    it.opts === "protein"
      ? { protein: PROTEIN_BY_NAME[opt ?? ""] ?? "none" }
      : it.opts === "soup"
        ? { soup: soup?.[2], swallow: SWALLOW_BY_NAME[opt ?? ""] ?? "eba" }
        : soup
          ? { soup: soup[2] }
          : {},
    i.quantity,
  );
}

/** A customer's order from the API as the app's tracking order. */
export function fromMyOrder(v: MyOrder): Order {
  const mode = v.type;
  const steps = mode === "delivery" ? DELIVERY_STEP : PICKUP_STEP;
  const cancelled = v.status === "cancelled";
  // Cancelled: the last step it reached before that.
  const reached = v.events.map((e) => steps[e.status]).filter((x): x is number => x !== undefined);
  const stage = cancelled ? Math.max(0, ...reached) : (steps[v.status] ?? 0);
  const stepAt: (number | undefined)[] = [];
  for (const e of v.events) {
    const i = steps[e.status];
    if (i !== undefined && stepAt[i] === undefined) stepAt[i] = new Date(e.at).getTime();
  }
  const lines = v.items.map(toLine);
  const refund = v.refunds.length
    ? v.refunds.every((r) => r.status === "completed")
      ? ("completed" as const)
      : ("pending" as const)
    : undefined;
  return {
    no: v.number,
    id: v.id,
    mode,
    food: v.foodTotal,
    fee: v.deliveryFee,
    total: v.total,
    stage,
    items: itemsText(lines),
    lines,
    pay: v.paymentMethod === "transfer" ? "transfer" : "card",
    placedAt: new Date(v.placedAt).getTime(),
    cancelled,
    refund,
    requested: v.cancellationRequest?.status === "pending",
    code: v.deliveryCode,
    stepAt,
    canCancel: v.canCancel,
    pin: v.address ? { lat: v.address.lat, lng: v.address.lng } : undefined,
    rider: v.rider
      ? {
          firstName: v.rider.firstName,
          stop: v.rider.stop,
          stops: v.rider.stops,
          position: v.rider.position
            ? { lat: v.rider.position.lat, lng: v.rider.position.lng }
            : null,
        }
      : null,
  };
}

const FINISHED = ["delivered", "collected", "cancelled"];

function dateLabel(ms: number) {
  const day = (d: Date) => d.toDateString();
  const now = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (day(new Date(ms)) === day(now)) return "Today";
  if (day(new Date(ms)) === day(yesterday)) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** A finished order as a row in Order history. */
export function toPast(v: MyOrder): PastOrder {
  const o = fromMyOrder(v);
  const refunded = v.refunds.reduce((a, r) => a + r.amount, 0);
  return {
    no: o.no,
    date: dateLabel(o.placedAt),
    items: o.items,
    total: o.total,
    status:
      v.status === "cancelled"
        ? refunded
          ? "Cancelled, refunded"
          : "Cancelled"
        : v.status === "delivered"
          ? "Delivered"
          : "Collected",
    lines: o.lines,
  };
}

const toAddress = (a: MyAddress): Address => ({
  label: (["Home", "Work"].includes(a.label) ? a.label : "Other") as Address["label"],
  area: a.neighbourhood,
  landmark: a.landmark ?? a.street ?? "",
  phone: a.contactPhone,
  pin: { lat: a.lat, lng: a.lng },
});

let reloadNow: () => Promise<void> = async () => {};
let catalog: Bootstrap | null = null;

export function CustomerLive() {
  const { s, set } = useStore();
  const on = !!api && s.signedIn;
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tries = useRef(0);

  const load = useCallback(async () => {
    if (!api) return;
    const [progress, history, book, b] = await Promise.all([
      api.myOrders("progress"),
      api.myOrders("history"),
      api.addresses(),
      api.bootstrap(),
    ]);
    catalog = b;
    const current = progress.orders[0];
    const home = book.addresses.find((a) => a.isDefault) ?? book.addresses[0];
    set((st) => {
      // A just-finished order stays on tracking (Rate, Order this again) until the customer
      // leaves it; Order history then shows it from there (archiveOrder), so it isn't listed twice.
      const kept =
        !current && st.live && st.order?.id
          ? history.orders.find((o) => o.id === st.order!.id)
          : undefined;
      return {
        live: true,
        fee: b.settings.deliveryFee,
        open: b.settings.paused ? "paused" : st.open,
        // Tracking follows the order already shown if it's still going, else the newest.
        order: (() => {
          const shown = progress.orders.find((o) => o.id === st.order?.id);
          if (shown) return fromMyOrder(shown);
          return current ? fromMyOrder(current) : kept ? fromMyOrder(kept) : null;
        })(),
        others: progress.orders
          .filter(
            (o) => o.id !== (progress.orders.find((x) => x.id === st.order?.id) ?? current)?.id,
          )
          .map(fromMyOrder),
        history: history.orders.filter((o) => o.id !== kept?.id).map(toPast),
        hasAddress: !!home,
        addressId: home?.id,
        address: home ? toAddress(home) : st.address,
        returning: history.orders.length > 0 || !!current || st.returning,
        recentCancels: 0,
      };
    });
  }, [set]);

  useEffect(() => {
    reloadNow = load;
  }, [load]);

  useEffect(() => {
    if (!on) {
      set((st) => (st.live ? { live: false } : {}));
      return;
    }
    // This phone's push token, for order updates in the background (CUS-11).
    void registerPush();
    let stopped = false;
    const close = () => {
      if (retry.current) clearTimeout(retry.current);
      retry.current = null;
      const ws = socket.current;
      socket.current = null;
      ws?.close();
    };
    const open = () => {
      if (stopped || socket.current || !api) return;
      const ws = new (
        WebSocket as unknown as new (
          url: string,
          protocols: string[] | undefined,
          options: { headers: Record<string, string> },
        ) => WebSocket
      )(api.liveUrl(), undefined, { headers: { Cookie: sessionCookie() } });
      socket.current = ws;
      ws.onopen = () => {
        tries.current = 0;
        void load().catch(() => {});
      };
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(String(e.data)) as CustomerLiveMessage;
          if (m.type === "rider-location") {
            // The rider moved (about every 45 seconds, CUS-09): only the marker changes.
            const at = { lat: m.lat, lng: m.lng };
            const move = (o: Order): Order =>
              o.id === m.orderId && o.rider ? { ...o, rider: { ...o.rider, position: at } } : o;
            set((st) => ({
              order: st.order && move(st.order),
              others: st.others.map(move),
            }));
          } else if (m.type === "order" && m.order) {
            const v = m.order;
            set((st) => {
              const o = fromMyOrder(v);
              const finished = FINISHED.includes(v.status);
              const history = finished
                ? [toPast(v), ...st.history.filter((h) => h.no !== v.number)]
                : st.history;
              // The order on tracking: it updates in place (a finished one stays for Rate).
              if (st.order?.id === v.id) return { order: o, history };
              const others = st.others.filter((x) => x.id !== v.id);
              if (finished) return { others, history }; // another order finished
              // A new or changed order still going: tracking takes it if the one shown is done.
              const shownDone =
                !st.order ||
                !!st.order.cancelled ||
                st.order.stage >= (st.order.mode === "delivery" ? 8 : 5);
              if (shownDone) {
                // The finished order it replaces stays in history.
                const prev = st.order;
                const keep =
                  prev && !history.some((h) => h.no === prev.no)
                    ? [
                        {
                          no: prev.no,
                          date: "Today",
                          items: prev.items,
                          total: prev.total,
                          status: prev.cancelled
                            ? prev.refund
                              ? "Cancelled, refunded"
                              : "Cancelled"
                            : prev.mode === "delivery"
                              ? "Delivered"
                              : "Collected",
                          lines: prev.lines,
                        },
                      ]
                    : [];
                return { order: o, others, history: [...keep, ...history] };
              }
              return { others: [o, ...others], history };
            });
          } else if (m.type === "reload") {
            // Reset demo data (MGR-29): orders were cleared and the menu rebuilt, so the basket's
            // dishes no longer exist. Start the basket again and load what's true now.
            if (m.reason === "reset") {
              set({ cart: [] });
              void refreshCatalog();
            }
            void reloadNow().catch(() => {});
          } else if (m.type === "catalog") {
            void api?.bootstrap().then((b) => {
              catalog = b;
              set((st) => ({
                fee: b.settings.deliveryFee,
                open: b.settings.paused ? "paused" : st.open,
              }));
            });
          }
        } catch {
          // A message the app doesn't understand yet.
        }
      };
      ws.onclose = () => {
        if (socket.current !== ws) return;
        socket.current = null;
        if (stopped || AppState.currentState !== "active") return;
        const wait = Math.min(30_000, 1000 * 2 ** tries.current++);
        retry.current = setTimeout(open, wait);
      };
    };
    void load()
      .catch(() => {})
      .finally(open);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") open();
      else close();
    });
    return () => {
      stopped = true;
      sub.remove();
      close();
    };
  }, [on, load, set]);

  return null;
}

/** The API's menu item for an app dish, and the option a cart line chose. */
function lineFor(l: Line) {
  const it = MENU.find((m) => m.id === l.id);
  const item = catalog?.menu.flatMap((c) => c.items).find((i) => i.name === it?.name);
  if (!item) return null;
  const want =
    l.opt.protein !== undefined
      ? PROTEINS.find((p) => p.id === l.opt.protein)?.label
      : l.opt.swallow !== undefined
        ? SWALLOWS.find((x) => x.id === l.opt.swallow)?.label
        : undefined;
  const option = want ? item.options.find((o) => o.name === want) : undefined;
  return { itemId: item.id, ...(option ? { optionId: option.id } : {}), quantity: l.qty };
}

/** Every customer action, demo or live. Each resolves to whether it went through. */
export function useCustomerOps() {
  const { s, set } = useStore();
  const toast = useToast();
  const live = s.live && !!api;

  const fail = useCallback(
    (e: unknown) => {
      toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
      return false;
    },
    [toast],
  );

  return useMemo(
    () => ({
      live,

      /** Checkout (CUS-05, CUS-07): the API prices it and confirms the simulated payment. */
      placeOrder: async (): Promise<boolean> => {
        if (!live) return false;
        try {
          if (!catalog) catalog = await api!.bootstrap();
          const items = s.cart.map(lineFor);
          if (items.some((x) => !x)) {
            toast("Something in your order is no longer on the menu. Remove it to continue.");
            return false;
          }
          if (s.mode === "delivery" && !s.addressId) {
            toast("Add your delivery address first");
            return false;
          }
          const { order } = await api!.placeOrder({
            type: s.mode,
            ...(s.mode === "delivery" ? { addressId: s.addressId } : {}),
            payment: s.pay,
            items: items as { itemId: string; optionId?: string; quantity: number }[],
          });
          set((st) => ({
            order: fromMyOrder(order),
            cart: [],
            returning: true,
            savedCard: st.savedCard || st.pay === "card",
          }));
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Cancel before the kitchen acknowledges; refunded in full (4.6). */
      cancel: async (reason: string) => {
        const id = s.order?.id;
        if (!live || !id) return false;
        try {
          const { order } = await api!.cancelMine(id, reason);
          set({ order: fromMyOrder(order) });
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      request: async (reason: string) => {
        const id = s.order?.id;
        if (!live || !id) return false;
        try {
          const { order } = await api!.requestCancel(id, reason);
          set({ order: fromMyOrder(order) });
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      rate: async (stars: number) => {
        const id = s.order?.id;
        if (!live || !id) return true;
        try {
          await api!.rate(id, stars);
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Saves the delivery address to the address book (CUS-14) and makes it the default. */
      saveAddress: async (a: Address): Promise<boolean> => {
        if (!live) {
          set({ address: a, hasAddress: true });
          return true;
        }
        if (!catalog) catalog = await api!.bootstrap();
        const area = catalog.areas.find((x) => x.name === a.area);
        if (!area) {
          toast("Pick your area from the list");
          return false;
        }
        const body = {
          label: a.label,
          landmark: a.landmark || undefined,
          neighbourhoodId: area.id,
          contactPhone: a.phone,
          lat: a.pin.lat,
          lng: a.pin.lng,
          isDefault: true,
        };
        try {
          const res = s.addressId
            ? await api!.editAddress(s.addressId, body)
            : await api!.addAddress(body);
          const home = res.addresses.find((x) => x.isDefault) ?? res.addresses[0];
          set((st) => ({
            hasAddress: true,
            addressId: home?.id,
            address: home ? toAddress(home) : a,
          }));
          return true;
        } catch (e) {
          return fail(e);
        }
      },
    }),
    [live, s.cart, s.mode, s.addressId, s.pay, s.order?.id, set, toast, fail],
  );
}

export const reloadCustomer = () => reloadNow();
