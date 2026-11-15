import { router } from "expo-router";

// Task screens open over the tabs. These clear them, so the back button never returns to a
// finished step (such as code entry after a delivery), and screens never pile up: navigating to
// the tabs from a screen on top opened a whole new set of tabs each time (15 November 2026: six
// trips between the Queue and My deliveries kept the back button cycling and used 90 MB more).

export function toDeliveries() {
  if (router.canDismiss()) router.dismissAll();
  router.push("/deliveries");
}

export function toQueue() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate("/(tabs)/queue");
}

export function toTabs() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate("/(tabs)");
}
