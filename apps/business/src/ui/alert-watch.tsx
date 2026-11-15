import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { beep, prepareAlertSound } from "../alert-sound";
import { checkAlerts, myRole, useStore } from "../state/store";
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
  const sound = s.settings.alerts.sound;

  // Ask for permission to play the beep at sign-in, not in the middle of a rush.
  useEffect(() => {
    if (hears && sound) void prepareAlertSound();
  }, [hears, sound]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => goTo("/alerts"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
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
  }, [set]);

  return null;
}
