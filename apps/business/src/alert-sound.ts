import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { Platform } from "react-native";

// The alert beep (MGR-14, owner decision 15 November 2026): when an alert timer runs out, every
// Business app device that shows Alerts plays a short urgent tone, once per alert, if the beep is
// on in Settings, Alerts. It's a local notification on its own Android channel, so it sounds even
// when the screen is off or the app is in the background. No push service is involved: the app
// already hears about new alerts over the live connection (architecture.md 10).

// Android keeps a channel's sound once it's made, so a new tone needs a new channel ID.
const CHANNEL = "alerts-v1";
let ready: Promise<boolean> | null = null;

// Show the notification and play its sound while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
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
