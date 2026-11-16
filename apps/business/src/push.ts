import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { prepareAlertSound } from "./alert-sound";

// Push notifications for the Business app (architecture.md 10, step 6d): new online orders for
// the kitchen and the alert beep, while the app is in the background or closed. The device's Expo
// push token is saved for the signed-in person and removed when they sign out.

let saved: string | null = null;

/** Saves this tablet's push token for the signed-in person. Quietly does nothing if refused. */
export async function registerPush() {
  if (!api) return;
  try {
    if (!(await prepareAlertSound())) return; // the channels, and permission
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.savePushToken(data, "business");
    saved = data;
  } catch {
    // No push on this device (no Google Play services, or offline): the live connection still works.
  }
}

/** Before signing out: this device stops getting the signed-in person's notifications. */
export async function unregisterPush() {
  const token = saved;
  saved = null;
  if (token && api) await api.removePushToken(token).catch(() => {});
}
