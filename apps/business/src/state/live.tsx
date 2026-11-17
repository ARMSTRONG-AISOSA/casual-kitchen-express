import type { DemoResetState, LiveMessage, SettingsView, StaffOrder } from "@cke/api-client";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { beep, chime } from "../alert-sound";
import { api } from "../api";
import { sessionCookie } from "../auth";
import { registerPush } from "../push";
import type { Order } from "../data/seed";
import { refreshCatalog, refreshPeople } from "./catalog";
import { lineName, mapAlert, mapOrder, mapRow } from "./mapping";
import { myRole, useStore, type Settings, type State } from "./store";

// The Business app on live data (build step 6, architecture.md 10 and 14.4). When someone signs
// in, it loads what their role may see in one call each: the board, the alerts, the riders panel,
// the settings, and today's orders. Then it keeps one WebSocket open to the live hub and applies
// each change as it arrives, so watching a screen costs no API calls. After a dropped connection
// or a return from the background it asks only for what changed (GET /changes?since=N). The beep
// (MGR-14) and the new-order chime (KIT-02) play when the server marks a message with them.

const today = () => {
  // The business day in West Africa Time (UTC+1 all year).
  const d = new Date(Date.now() + 60 * 60_000);
  return d.toISOString().slice(0, 10);
};

/** Merges orders into the list by order number, newest version wins. */
function mergeOrders(list: Order[], incoming: Order[]) {
  const byNo = new Map(list.map((o) => [o.no, o]));
  for (const o of incoming) byNo.set(o.no, o);
  return [...byNo.values()].sort((a, b) => b.placedAt - a.placedAt);
}

const settingsFrom = (v: SettingsView, prev: Settings): Partial<State> => ({
  settings: {
    ...prev,
    paused: v.settings.paused,
    areas: Object.fromEntries(v.areas.map((a) => [a.name, a.inRange])),
    budget: v.settings.capacityBudget,
    batchKm: v.settings.batchDistanceM / 1000,
    tracking: v.settings.trackingMode,
    cancelLimit: v.settings.cancellationLimit,
    fee: v.settings.deliveryFee,
    riderPay: v.settings.riderPay,
    whatsapp: v.settings.whatsappNumber,
    alerts: {
      sound: v.alerts.sound,
      chime: v.alerts.chime,
      rider: v.alerts.rider,
      acknowledge: v.alerts.acknowledge,
      kitchen: v.alerts.kitchen,
      road: v.alerts.road,
    },
    alertsSavedAt: v.alerts.updatedAt ? new Date(v.alerts.updatedAt).getTime() : undefined,
    alertsSavedBy: v.alerts.updatedBy?.code,
  },
  areaIds: Object.fromEntries(v.areas.map((a) => [a.name, a.id])),
});

/** Demo controls listens here for Reset demo data's progress (MGR-29). */
const demoResetListeners = new Set<(r: DemoResetState) => void>();
export function onDemoReset(f: (r: DemoResetState) => void) {
  demoResetListeners.add(f);
  return () => {
    demoResetListeners.delete(f);
  };
}

/** Loads everything the person's role may see. Shared with actions that need a fresh copy. */
let reloadNow: () => Promise<void> = async () => {};
export const reloadLive = () => reloadNow();

export function LiveSync() {
  const { s, set } = useStore();
  const role = s.userId ? myRole(s) : null;
  const on = !!api && !!s.userId;
  const latest = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tries = useRef(0);
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  });

  const load = useCallback(async () => {
    if (!api || !roleRef.current) return;
    const r = roleRef.current;
    const sees = (...roles: string[]) => roles.includes(r);
    const [board, alerts, riders, settings, list] = await Promise.all([
      sees("kitchen", "dispatch", "manager") ? api.board() : null,
      sees("kitchen", "dispatch", "manager") ? api.alerts() : null,
      sees("dispatch", "manager") ? api.riders() : null,
      sees("dispatch", "manager") ? api.settings() : null,
      sees("dispatch", "accounts", "manager") ? api.orderList({ from: today() }) : null,
    ]);
    // Orders out with riders aren't on the board: fetch those few in full (DSP-03).
    const onBoard = new Set(board?.orders.map((o) => o.id));
    const carried = (riders?.riders ?? [])
      .flatMap((x) => x.carrying.map((c) => c.orderId))
      .filter((id) => !onBoard.has(id));
    const out = await Promise.all(carried.map((id) => api!.order(id).then((x) => x.order)));
    if (board) latest.current = Math.max(latest.current, board.latest);
    set((st) => {
      const full = [...(board?.orders ?? []), ...out].map((o) => mapOrder(o));
      const fullNos = new Set(full.map((o) => o.no));
      const rows = (list?.orders ?? [])
        .filter((row) => !fullNos.has(row.number))
        .map((row) =>
          mapRow(
            row,
            st.orders.find((o) => o.no === row.number && st.live),
          ),
        );
      return {
        live: true,
        orders: [...full, ...rows].sort((a, b) => b.placedAt - a.placedAt),
        alerts: alerts ? alerts.alerts.flatMap((a) => mapAlert(a) ?? []) : [],
        alertKeys: [],
        riders: riders
          ? riders.riders.map((x) => ({
              id: x.code,
              online: x.online,
              name: x.name,
              phone: x.phone,
            }))
          : st.riders,
        refunds: [],
        ...(settings ? settingsFrom(settings, st.settings) : {}),
      };
    });
  }, [set]);

  // Applies one message from the live connection.
  const apply = useCallback(
    (m: LiveMessage) => {
      const hears = roleRef.current !== "accounts";
      if (m.type === "order") {
        latest.current = Math.max(latest.current, m.version);
        set((st) => ({
          orders: mergeOrders(st.orders, [
            mapOrder(
              m.order,
              st.orders.find((o) => o.no === m.order.number),
            ),
          ]),
        }));
        if (m.chime && hears) void chime(`New online order ${m.order.number}`, summary(m.order));
      } else if (m.type === "alert") {
        latest.current = Math.max(latest.current, m.version);
        const a = mapAlert(m.alert);
        set((st) => ({
          alerts:
            m.alert.cleared || !a
              ? st.alerts.filter((x) => x.id !== m.alert.id)
              : [a, ...st.alerts.filter((x) => x.id !== a.id)],
        }));
        if (m.beep && a && hears)
          void beep(a.kind === "unaccepted" ? "Waiting for a rider" : "Order running late", a.text);
      } else if (m.type === "rider") {
        const r = m.rider;
        set((st) => ({
          riders: [
            ...st.riders.filter((x) => x.id !== r.code),
            { id: r.code, online: r.online, name: r.name, phone: r.phone },
          ].sort((a, b) => a.id.localeCompare(b.id)),
        }));
      } else if (m.type === "catalog") {
        void refreshCatalog();
        if (roleRef.current === "dispatch" || roleRef.current === "manager")
          void api?.settings().then((v) => set((st) => settingsFrom(v, st.settings)));
      } else if (m.type === "reload") {
        // Practice orders were removed, or Reset demo data finished (Demo controls): load what's
        // true now. After a full reset the staff list changed too.
        void load().catch(() => {});
        if (m.reason === "reset") void refreshPeople();
      } else if (m.type === "demo-reset") {
        demoResetListeners.forEach((f) => f(m.reset));
      } else if (m.type === "alert-settings") {
        const v = m.alerts;
        set((st) => ({
          settings: {
            ...st.settings,
            alerts: {
              sound: v.sound,
              chime: v.chime,
              rider: v.rider,
              acknowledge: v.acknowledge,
              kitchen: v.kitchen,
              road: v.road,
            },
            alertsSavedAt: v.updatedAt ? new Date(v.updatedAt).getTime() : undefined,
            alertsSavedBy: v.updatedBy?.code,
          },
        }));
      }
    },
    [set, load],
  );

  // Catches up after a gap: only what changed, or a full reload after a long one.
  const catchUp = useCallback(async () => {
    if (!api) return;
    if (!latest.current) return load();
    const c = await api.changes(latest.current);
    if (c.reload) return load();
    latest.current = Math.max(latest.current, c.latest);
    set((st) => ({
      orders: mergeOrders(
        st.orders,
        c.orders.map((o) =>
          mapOrder(
            o,
            st.orders.find((x) => x.no === o.number),
          ),
        ),
      ),
      alerts: [
        ...c.alerts.flatMap((a) => (!a.cleared ? (mapAlert(a) ?? []) : [])),
        ...st.alerts.filter((x) => !c.alerts.some((a) => a.id === x.id)),
      ],
    }));
  }, [load, set]);

  useEffect(() => {
    reloadNow = load;
  }, [load]);

  useEffect(() => {
    if (!on) {
      set((st) => (st.live ? { live: false } : {}));
      return;
    }
    // This tablet's push token, for the new-order chime and the beep in the background (10).
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
      // React Native's WebSocket takes headers, so the session cookie signs it in.
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
        void catchUp().catch(() => {});
      };
      ws.onmessage = (e) => {
        try {
          apply(JSON.parse(String(e.data)) as LiveMessage);
        } catch {
          // A message the app doesn't understand yet.
        }
      };
      ws.onclose = () => {
        if (socket.current !== ws) return;
        socket.current = null;
        if (stopped || AppState.currentState !== "active") return;
        // Try again: quickly at first, then at most every 30 seconds.
        const wait = Math.min(30_000, 1000 * 2 ** tries.current++);
        retry.current = setTimeout(open, wait);
      };
    };
    void load()
      .catch(() => {})
      .finally(open);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") open();
      else close(); // the hub keeps nothing open for a tablet in the background
    });
    return () => {
      stopped = true;
      sub.remove();
      close();
    };
  }, [on, s.userId, load, catchUp, apply, set]);

  return null;
}

const summary = (o: StaffOrder) =>
  `${o.type === "delivery" ? "Delivery" : "Pickup"}: ${o.items
    .map((i) => `${i.quantity} × ${lineName(i.name, i.options)}`)
    .join(", ")}`;
