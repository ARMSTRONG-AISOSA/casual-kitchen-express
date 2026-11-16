import Constants from "expo-constants";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "./api";

// Push notifications for riders (RID-14, RID-23, architecture.md 10, step 6d): a new ready order
// that fits, and an order dispatch assigns, while the app is in the background or closed. The
// sound plays through these notifications (design.md 5, owner decision 12 November 2026): with
// Sound on they use the "queue" channel and its tone, with Sound off the quiet channel, which still
// vibrates. While the app is open the live connection already vibrates, so a push isn't shown.

let saved: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function channels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("queue", {
    name: "New orders",
    description: "A new order ready for you, or one dispatch gives you",
    importance: AndroidImportance.HIGH,
    sound: "cke_chime.wav",
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync("queue-quiet", {
    name: "New orders (sound off)",
    description: "The same, without the tone, when Sound is off in Settings",
    importance: AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
}

/** Saves this phone's push token with the rider's Sound setting. Call again when Sound changes. */
export async function registerPush(sound: boolean) {
  if (!api) return;
  try {
    await channels();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.savePushToken(data, "rider", sound);
    saved = data;
  } catch {
    // No push on this phone: the queue still updates while the app is open.
  }
}

/** Before signing out: this phone stops getting the rider's notifications. */
export async function unregisterPush() {
  const token = saved;
  saved = null;
  if (token && api) await api.removePushToken(token).catch(() => {});
}

/** Tapping a notification opens the queue, or My deliveries for an assigned order. */
export function PushTaps() {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const open = (last?.notification.request.content.data as { open?: string } | undefined)?.open;
    if (open === "queue") router.push("/(tabs)/queue");
    else if (open === "deliveries") router.push("/deliveries");
  }, [last]);
  return null;
}
