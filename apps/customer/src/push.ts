import Constants from "expo-constants";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { useStore } from "./state/store";

// Push notifications for the customer (CUS-11, architecture.md 4.1 and 10, step 6d): each order
// step marked for a notification, while the app is in the background or closed. While the app is
// open the tracking screen already moves by itself, so a push arriving then isn't shown.

const CHANNEL = "orders";
let saved: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Saves this phone's push token for the signed-in customer. Quietly does nothing if refused. */
export async function registerPush() {
  if (!api) return;
  try {
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Your orders",
        description:
          "When the kitchen has your order, your rider is on the way, and it’s delivered",
        importance: AndroidImportance.HIGH,
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
      });
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.savePushToken(data, "customer");
    saved = data;
  } catch {
    // No push on this phone: tracking still updates while the app is open.
  }
}

/** Before signing out: this phone stops getting the customer's notifications. */
export async function unregisterPush() {
  const token = saved;
  saved = null;
  if (token && api) await api.removePushToken(token).catch(() => {});
}

/** Tapping a notification opens that order's tracking. */
export function PushTaps() {
  const { set } = useStore();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const data = last?.notification.request.content.data as { open?: string; orderId?: string };
    if (data?.open !== "track") return;
    // Another order in progress becomes the one on tracking.
    set((st) => {
      if (!data.orderId || st.order?.id === data.orderId) return {};
      const o = st.others.find((x) => x.id === data.orderId);
      if (!o) return {};
      return {
        order: o,
        others: [...(st.order ? [st.order] : []), ...st.others.filter((x) => x !== o)],
      };
    });
    router.push("/track");
  }, [last, set]);
  return null;
}
