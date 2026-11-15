import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { beep, chime, prepareAlertSound } from "../alert-sound";
import { checkAlerts, myRole, useStore } from "../state/store";
import type { Order } from "../data/seed";
import { goTo } from "./nav";

// Watches the alert timers while someone is signed in (MGR-14). In the demo the app runs the
// timed check itself every 20 seconds; once connected, the API's check sends new alerts over the
// live connection with a beep flag instead. Either way, a new timer alert beeps once on every
// device that shows Alerts (kitchen, dispatch, managers) when the beep is on in Settings, Alerts.
// Tapping the notification opens Alerts.

const CHECK_MS = 20_000;

export function AlertWatch() {
  const { s, set } = useStore();
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const role = myRole(s);
  const hears = role !== "accounts";
  const sound = s.settings.alerts.sound || s.settings.alerts.chime;

  // Ask for permission to play the beep at sign-in, not in the middle of a rush.
  useEffect(() => {
    if (hears && sound) void prepareAlertSound();
  }, [hears, sound]);

  useEffect(() => {
    // The chime's notification opens the board; the beep's opens Alerts.
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      goTo(r.notification.request.content.data?.open === "board" ? "/board" : "/alerts"),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Live, the API runs the timed check and flags the beep (state/live.tsx); this is the demo's.
    if (s.live) return;
    const id = setInterval(() => {
      const found = checkAlerts(latest.current);
      if (!found) return;
      set((st) => checkAlerts(st)?.patch ?? {});
      const st = latest.current;
      if (!st.settings.alerts.sound || myRole(st) === "accounts") return;
      for (const a of found.opened)
        void beep(a.kind === "unaccepted" ? "Waiting for a rider" : "Order running late", a.text);
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [set, s.live]);

  // New online orders chime once each (in the demo, the practice orders and auto-play's; once
  // connected, the live connection's order messages marked chime).
  const heard = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (s.live) return; // live, the chime comes with the order's message
    const online = s.orders.filter((o) => o.channel === "online" && o.status === "new");
    if (!heard.current) {
      heard.current = new Set(online.map((o) => o.no)); // what's already there at sign-in is not new
      return;
    }
    const fresh = online.filter((o) => !heard.current!.has(o.no));
    for (const o of fresh) heard.current.add(o.no);
    if (!fresh.length || !s.settings.alerts.chime || !hears) return;
    for (const o of fresh) void chime(`New online order ${o.no}`, summary(o));
  }, [s.orders, s.settings.alerts.chime, hears, s.live]);

  return null;
}

const summary = (o: Order) =>
  `${o.type === "delivery" ? "Delivery" : "Pickup"}: ${o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}`;
