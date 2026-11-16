import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { Platform } from "react-native";

// The alert beep (MGR-14, owner decision 15 November 2026): when an alert timer runs out, every
// Business app device that shows Alerts plays a short urgent tone, once per alert, if the beep is
// on in Settings, Alerts. It's a local notification on its own Android channel, so it sounds even
// when the screen is off. While the app is in the background the live connection is closed, so the
// API sends the same beep as a push notification on this channel (architecture.md 10).

// The new-order chime (design.md 6.2, KIT-02) works the same way on its own channel and tone: a
// pleasant double chime when a new online order arrives, if the chime is on in Settings, Alerts.

// Android keeps a channel's sound once it's made, so a new tone needs a new channel ID.
const CHANNEL = "alerts-v1";
// orders-v1 was made on the test tablet before the chime was in the app, with the phone's default
// sound, so it's removed and orders-v2 carries the chime.
const ORDERS = "orders-v2";
let ready: Promise<boolean> | null = null;

// Show the beep and the chime while the app is open too. A push notification (step 6d) is for
// when the app is in the background: while it's open the live connection has already played the
// same thing, so a push arriving then is kept quiet.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const push = (n.request.trigger as { type?: string } | null)?.type === "push";
    return {
      shouldShowBanner: !push,
      shouldShowList: !push,
      shouldPlaySound: !push,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

/** Makes the channel and asks for permission, once. Resolves to whether the beep can play. */
export function prepareAlertSound() {
  ready ??= (async () => {
    if (Platform.OS !== "android") return false;
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Order alerts",
      description:
        "Orders waiting too long: no rider, not acknowledged, in the kitchen, or on the road",
      importance: AndroidImportance.HIGH,
      sound: "cke_alert.wav",
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.deleteNotificationChannelAsync("orders-v1").catch(() => {});
    await Notifications.setNotificationChannelAsync(ORDERS, {
      name: "New online orders",
      description: "A chime when a new online order arrives on the board",
      importance: AndroidImportance.HIGH,
      sound: "cke_chime.wav",
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
    // A new online order while the chime is off still arrives by push, without the tone.
    await Notifications.setNotificationChannelAsync("orders-quiet", {
      name: "New online orders (quiet)",
      description: "New online orders while the chime is off in Settings, Alerts",
      importance: AndroidImportance.DEFAULT,
      sound: null,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  })().catch(() => false);
  return ready;
}

/** Whether Android lets the app play the beep (false when notifications are turned off for it). */
export async function alertSoundAllowed() {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Plays the alert tone with a short line saying what it's about. */
export async function beep(title: string, body: string) {
  // Notifications may have been turned on in Android's settings since the first check.
  if (!(await prepareAlertSound()) && !(await alertSoundAllowed())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "cke_alert.wav" },
      trigger: { channelId: CHANNEL },
    });
  } catch {
    // A notification that couldn't be shown; the alert is still on the Alerts screen.
  }
}

/** Plays the new-order chime with the order's number and what's in it. */
export async function chime(title: string, body: string) {
  if (!(await prepareAlertSound()) && !(await alertSoundAllowed())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "cke_chime.wav", data: { open: "board" } },
      trigger: { channelId: ORDERS },
    });
  } catch {
    // A notification that couldn't be shown; the order is still on the board.
  }
}
