import {
  ApiError,
  type QueueCard,
  type RiderDelivery,
  type RiderLiveMessage,
} from "@cke/api-client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { KITCHEN_PIN } from "@cke/validation";
import { AppState } from "react-native";
import { api } from "../api";
import { sessionCookie } from "../auth";
import { HELP_REASONS, clockTime, type QueueOrder } from "../data/orders";
import { registerPush } from "../push";
import { onArrival, stopTracking, syncTracking } from "../tracking";
import { useToast } from "../ui/toast";
import {
  accept,
  alertRider,
  completeNext,
  deliverFirst,
  pickUpAll,
  releaseNext,
  useStore,
  type Carried,
  type State,
} from "./store";

// The rider app on live data (build step 6b, architecture.md 10 and 14.4). Once a rider is signed
// in it loads the queue, their deliveries, and their earnings, keeps one WebSocket to the live hub,
// and re-reads the queue when it changes (the server decides what fits: the count, the load, and
// the batch distance, section 6). After a dropped connection or a return from the background it
// asks only for what changed. Every action goes to the API, which answers in plain English when
// it can't be done (another rider took the order, a wrong code).

// The kitchen's pin, for the distance to each stop (the API's KITCHEN).
const KITCHEN = KITCHEN_PIN;
function kmFrom(lat: number, lng: number) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((lat - KITCHEN.lat) * r) / 2) ** 2 +
    Math.cos(KITCHEN.lat * r) * Math.cos(lat * r) * Math.sin(((lng - KITCHEN.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const minsSince = (iso: string | null) =>
  iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : 0;

/** A queue card as the app's order. The address and customer come once it's accepted. */
export const fromCard = (c: QueueCard): QueueOrder => ({
  no: c.number,
  id: c.orderId,
  area: c.neighbourhood,
  landmark: "",
  address: "",
  customer: "",
  phone: "",
  km: c.distanceM / 1000,
  readyMins: minsSince(c.readyAt),
  items: [],
  load: c.load,
});

/** One of the rider's stops as the app's order. */
export const fromDelivery = (d: RiderDelivery): Carried => ({
  no: d.number,
  id: d.orderId,
  area: d.address?.neighbourhood ?? "",
  landmark: d.address?.landmark ?? "",
  address: [d.address?.street, d.address?.neighbourhood, "Benin City"].filter(Boolean).join(", "),
  customer: d.customerFirstName,
  phone: d.phone ?? "",
  km: d.address ? kmFrom(d.address.lat, d.address.lng) : 0,
  readyMins: 0,
  items: [],
  itemCount: d.items,
  load: d.load,
  picked: d.picked,
  assigned: d.assignedByDispatch,
  pin: d.address ? { lat: d.address.lat, lng: d.address.lng } : undefined,
  arriving: d.status === "arriving",
});

let refresh: () => Promise<void> = async () => {};

export function RiderLive() {
  const { s, set } = useStore();
  const on = !!api && !!s.me && s.signedIn && !s.mustSetPassword;
  const latest = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tries = useRef(0);
  const queueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const known = useRef<Set<string>>(new Set());
  const primed = useRef(false); // the first load shows what's waiting without vibrating
  const vibrate = useRef(s.vibrate);
  useEffect(() => {
    vibrate.current = s.vibrate;
  });

  /** The queue as it is now. A new order that fits vibrates the phone (RID-14). */
  const loadQueue = useCallback(async () => {
    if (!api) return;
    const q = await api.riderQueue();
    latest.current = Math.max(latest.current, q.latest);
    const fresh = q.orders.filter((o) => !known.current.has(o.orderId));
    const first = !primed.current;
    primed.current = true;
    known.current = new Set(q.orders.map((o) => o.orderId));
    set((st) => ({
      online: q.online,
      budget: q.budget,
      hidden: q.hidden,
      queue: q.orders.map(fromCard),
      newOrder: fresh.length > 0 ? true : st.newOrder && q.orders.length > 0,
    }));
    if (fresh.length && q.online && !first && vibrate.current)
      alertRider({ vibrate: true } as State);
  }, [set]);

  const loadAll = useCallback(async () => {
    if (!api) return;
    const [d, e, b] = await Promise.all([
      api.riderDeliveries(),
      api.riderEarnings(),
      api.bootstrap(),
    ]);
    latest.current = Math.max(latest.current, d.latest);
    set({
      live: true,
      carrying: d.deliveries.map(fromDelivery),
      earnings: e,
      pay: b.settings.riderPay,
      tracking: b.settings.trackingMode,
      delivered: e.todaysDeliveries.map((x) => ({
        no: x.number,
        area: "",
        time: clockTime(new Date(x.deliveredAt).getTime()),
        pay: x.pay,
      })),
    });
    await loadQueue();
  }, [set, loadQueue]);

  useEffect(() => {
    refresh = loadAll;
  }, [loadAll]);

  const apply = useCallback(
    (m: RiderLiveMessage) => {
      if (m.type === "queue") {
        // Re-read the queue a moment later, so a burst of changes costs one call.
        if (queueTimer.current) clearTimeout(queueTimer.current);
        queueTimer.current = setTimeout(() => void loadQueue().catch(() => {}), 300);
      } else if (m.type === "delivery") {
        const d = fromDelivery(m.delivery);
        set((st) => ({
          carrying: m.removed
            ? st.carrying.filter((c) => c.no !== d.no)
            : st.carrying.some((c) => c.no === d.no)
              ? st.carrying.map((c) => (c.no === d.no ? d : c))
              : [...st.carrying, d],
        }));
        // Assigned by dispatch: it's new to the rider, so the phone vibrates.
        if (!m.removed && m.delivery.assignedByDispatch && vibrate.current)
          alertRider({ vibrate: true } as State);
        if (m.removed) void api?.riderEarnings().then((e) => set({ earnings: e }));
      } else if (m.type === "reload") {
        // Practice orders were removed (Demo controls): the queue and deliveries as they are now.
        void refresh().catch(() => {});
      } else if (m.type === "catalog") {
        // A setting changed: pay per delivery or the tracking mode.
        void api
          ?.bootstrap()
          .then((b) => set({ pay: b.settings.riderPay, tracking: b.settings.trackingMode }));
      }
    },
    [set, loadQueue],
  );

  // Light tracking while orders are on the way (RID-17): the picked-up stops not yet arriving.
  const stopsKey = s.live
    ? s.carrying
        .filter((c) => c.picked && !c.arriving && c.pin && c.id)
        .map((c) => `${c.id}:${c.pin!.lat},${c.pin!.lng}`)
        .join("|")
    : "";
  // Shared until the last delivery, arriving included (7.1); only geofences skip arriving orders.
  const onTheWay = s.live && s.carrying.some((c) => c.picked && c.id);
  // This phone's push token, with the Sound setting choosing the channel (RID-14).
  useEffect(() => {
    if (on) void registerPush(s.sound);
  }, [on, s.sound]);
  useEffect(() => {
    onArrival((d) => set({ carrying: d.map(fromDelivery) }));
    return () => onArrival(null);
  }, [set]);
  useEffect(() => {
    const stops = stopsKey
      ? stopsKey.split("|").map((x) => {
          const [orderId, at] = x.split(":");
          const [lat, lng] = at!.split(",").map(Number);
          return { orderId: orderId!, lat: lat!, lng: lng! };
        })
      : [];
    void syncTracking(stops, onTheWay, s.tracking, AppState.currentState === "active")
      .then((r) =>
        set((st) =>
          st.locationDenied === (r === "denied") ? {} : { locationDenied: r === "denied" },
        ),
      )
      .catch(() => {});
  }, [stopsKey, onTheWay, s.tracking, set]);

  useEffect(() => {
    if (!on) {
      set((st) => (st.live ? { live: false } : {}));
      void stopTracking().catch(() => {});
      return;
    }
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
        // Catch up on anything missed while away: the queue and deliveries as they are now.
        void loadAll().catch(() => {});
      };
      ws.onmessage = (e) => {
        try {
          apply(JSON.parse(String(e.data)) as RiderLiveMessage);
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
    void loadAll()
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
  }, [on, loadAll, apply, set]);

  return null;
}

const HELP_CODES = ["customer_unreachable", "code_problem", "other"] as const;

/**
 * Every rider action, demo or live. Each resolves to whether it went through, so the screen moves
 * on only when the API agreed.
 */
export function useRiderOps() {
  const { s, set } = useStore();
  const toast = useToast();
  const live = s.live && !!api;

  const fail = useCallback(
    (e: unknown) => {
      toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
      void refresh().catch(() => {});
      return false;
    },
    [toast],
  );
  const deliveries = useCallback(
    (d: RiderDelivery[]) => set({ carrying: d.map(fromDelivery) }),
    [set],
  );

  return useMemo(
    () => ({
      live,

      setOnline: async (online: boolean) => {
        if (!live) {
          set({ online, newOrder: online && s.queue.length > 0 });
          return true;
        }
        try {
          await api!.riderOnline(online);
          set({ online });
          await refresh();
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Resolves to "taken" when it's the rider's, "gone" when another rider won (RID-04). */
      accept: async (o: QueueOrder): Promise<"taken" | "gone" | "failed"> => {
        if (!live) {
          set((st) => accept(st, o.no));
          return "taken";
        }
        try {
          deliveries((await api!.acceptOrder(o.id!)).deliveries);
          set((st) => ({ queue: st.queue.filter((q) => q.no !== o.no), newOrder: false }));
          return "taken";
        } catch (e) {
          if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
            set((st) => ({ queue: st.queue.filter((q) => q.no !== o.no) }));
            return "gone";
          }
          fail(e);
          return "failed";
        }
      },

      pickUpAll: async () => {
        if (!live) {
          set((st) => pickUpAll(st));
          return true;
        }
        try {
          let last: RiderDelivery[] | null = null;
          for (const o of s.carrying.filter((c) => !c.picked))
            last = (await api!.pickedUp(o.id!)).deliveries;
          if (last) deliveries(last);
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** The customer's code for the next stop: "ok", or the API's sentence when it's wrong. */
      deliver: async (code: string): Promise<{ ok: true } | { ok: false; message: string }> => {
        const o = s.carrying[0];
        if (!live) return { ok: false, message: "" };
        try {
          deliveries((await api!.deliver(o!.id!, code)).deliveries);
          set({ codeTries: 0 });
          void api!.riderEarnings().then((e) =>
            set((st) => ({
              earnings: e,
              delivered: [
                { no: o!.no, area: o!.area, time: clockTime(Date.now()), pay: st.pay },
                ...st.delivered,
              ],
            })),
          );
          return { ok: true };
        } catch (e) {
          return {
            ok: false,
            message: e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.",
          };
        }
      },

      /** Need help with the current stop: tells dispatch, who can complete it or keep it open. */
      help: async (reason: string) => {
        const o = s.carrying[0];
        if (!live || !o?.id) return true;
        const code = HELP_CODES[Math.max(0, HELP_REASONS.indexOf(reason))] ?? "other";
        try {
          await api!.riderHelp(o.id, code);
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Puts the current stop back in the queue for another rider (RID-12; before pickup). */
      release: async () => {
        if (!live) {
          set((st) => releaseNext(st));
          return true;
        }
        const o = s.carrying[0];
        try {
          deliveries((await api!.release(o!.id!)).deliveries);
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Moves a later stop to the front (the rider can change the suggested order). */
      deliverFirst: async (no: string) => {
        set((st) => deliverFirst(st, no));
        if (!live) return true;
        const order = [
          s.carrying.find((c) => c.no === no)!,
          ...s.carrying.filter((c) => c.no !== no),
        ].map((c) => c.id!);
        try {
          deliveries((await api!.reorderDeliveries(order)).deliveries);
          return true;
        } catch (e) {
          return fail(e);
        }
      },

      /** Demo only: the next stop delivered with the demo code. */
      completeDemo: () => set((st) => completeNext(st)),
    }),
    [live, set, s.queue.length, s.carrying, deliveries, fail],
  );
}
