import { router } from "expo-router";

// Task screens open over the tabs. These clear them, so the back button never returns to a
// finished step (such as code entry after a delivery).

export function toDeliveries() {
  if (router.canDismiss()) router.dismissAll();
  router.push("/deliveries");
}

export function toQueue() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate("/(tabs)/queue");
}
