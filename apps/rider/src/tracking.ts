import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { RiderDelivery } from "@cke/api-client";
import { api } from "./api";

// Light location tracking during a delivery (RID-17, architecture.md 7.1 and 7.3). Only while an
// order is picked up and on its way: balanced accuracy, about every 45 seconds, and only after
// moving about 100 metres (slower when the battery is low or battery saver is on). It runs as an
// Android foreground service with a visible "Delivery in progress" notification, so it keeps going
// while the rider is in their navigation app, and it stops when the last order is delivered.
// "Arriving soon" comes from an operating-system geofence about 300 metres around each address;
// if the rider hasn't allowed location all the time (needed for geofences), the same distance is
// checked on each position update instead. With Milestones only set, no position is sent.

const MOVE_TASK = "cke-delivery-location";
const ARRIVE_TASK = "cke-arrival";
const ARRIVE_M = 300;

const NORMAL = { timeInterval: 45_000, distanceInterval: 100 };
const SAVING = { timeInterval: 120_000, distanceInterval: 250 };

export type Stop = { orderId: string; lat: number; lng: number };

let stops: Stop[] = [];
let geofencing = false;
let saving: boolean | null = null;
const arrived = new Set<string>();
let onDeliveries: ((d: RiderDelivery[]) => void) | null = null;
let askedBackground = false;

/** The app's state hears about an "Arriving soon" the phone noticed by itself. */
export function onArrival(fn: ((d: RiderDelivery[]) => void) | null) {
  onDeliveries = fn;
}

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

async function arrive(orderId: string) {
  if (arrived.has(orderId) || !api) return;
  arrived.add(orderId);
  try {
    const { deliveries } = await api.arriving(orderId);
    onDeliveries?.(deliveries);
  } catch {
    // Already arriving, or delivered: nothing to do.
  }
}

/** Battery saver on, or under 15%: slower updates (7.1 rule 12). */
async function lowPower() {
  try {
    const p = await Battery.getPowerStateAsync();
    return p.lowPowerMode || (p.batteryLevel >= 0 && p.batteryLevel < 0.15);
  } catch {
    return false;
  }
}

async function startMoving() {
  saving = await lowPower();
  await Location.startLocationUpdatesAsync(MOVE_TASK, {
    accuracy: Location.Accuracy.Balanced,
    ...(saving ? SAVING : NORMAL),
    deferredUpdatesInterval: (saving ? SAVING : NORMAL).timeInterval,
    mayShowUserSettingsDialog: false,
    foregroundService: {
      notificationTitle: "Delivery in progress",
      notificationBody: "CKE shares your location with your customer until you deliver.",
      notificationColor: "#C83F2D",
      killServiceOnDestroy: true,
    },
  });
}

async function stopMoving() {
  if (await Location.hasStartedLocationUpdatesAsync(MOVE_TASK).catch(() => false))
    await Location.stopLocationUpdatesAsync(MOVE_TASK).catch(() => {});
  saving = null;
}

async function stopGeofence() {
  if (await Location.hasStartedGeofencingAsync(ARRIVE_TASK).catch(() => false))
    await Location.stopGeofencingAsync(ARRIVE_TASK).catch(() => {});
  geofencing = false;
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  MOVE_TASK,
  async ({ data, error }) => {
    if (error || !data || !api) return;
    const last = data.locations.at(-1);
    if (!last) return;
    const here = { lat: last.coords.latitude, lng: last.coords.longitude };
    // No geofence allowed: check the distance to each address here instead.
    if (!geofencing) for (const s of stops) if (metres(here, s) <= ARRIVE_M) void arrive(s.orderId);
    try {
      const { tracking } = await api.riderLocation(here.lat, here.lng);
      if (!tracking) await stopMoving(); // nothing on the way, or Milestones only
    } catch {
      // Offline for a moment: the next update tries again.
    }
    // The battery changed enough to switch speed: start again with the other settings.
    const low = await lowPower();
    if (saving !== null && low !== saving) {
      await stopMoving();
      await startMoving().catch(() => {});
    }
  },
);

TaskManager.defineTask<{
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}>(ARRIVE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  if (data.eventType === Location.GeofencingEventType.Enter && data.region.identifier)
    void arrive(data.region.identifier);
});

export type TrackingResult = "on" | "off" | "denied";

/**
 * Starts, updates, or stops tracking for the orders on the way. `onTheWay` is true while any order
 * is picked up or arriving: the position is shared until the last delivery (7.1), including the
 * last few hundred metres after "Arriving soon". `next` are the picked-up orders not yet arriving,
 * which get an arrival geofence. Permission is asked once, in two steps (17.1): while using the
 * app, then all the time (for the arrival geofence). Called again whenever the deliveries change.
 */
export async function syncTracking(
  next: Stop[],
  onTheWay: boolean,
  mode: "light" | "milestones",
  canAsk: boolean,
) {
  stops = next;
  for (const id of [...arrived]) if (!next.some((s) => s.orderId === id)) arrived.delete(id);
  if (!onTheWay) {
    await Promise.all([stopMoving(), stopGeofence()]);
    return "off" as TrackingResult;
  }

  let fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted && fg.canAskAgain && canAsk)
    fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return "denied" as TrackingResult;

  let bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted && bg.canAskAgain && canAsk && !askedBackground) {
    askedBackground = true;
    bg = await Location.requestBackgroundPermissionsAsync();
  }

  if (mode === "light") {
    if (!(await Location.hasStartedLocationUpdatesAsync(MOVE_TASK).catch(() => false)))
      await startMoving();
  } else await stopMoving();

  if (bg.granted && next.length) {
    // Starting again replaces the regions with the current stops.
    await Location.startGeofencingAsync(
      ARRIVE_TASK,
      next.map((s) => ({
        identifier: s.orderId,
        latitude: s.lat,
        longitude: s.lng,
        radius: ARRIVE_M,
        notifyOnEnter: true,
        notifyOnExit: false,
      })),
    );
    geofencing = true;
  } else await stopGeofence();
  return "on" as TrackingResult;
}

/** Signing out or going offline: everything stops. */
export const stopTracking = () => syncTracking([], false, "light", false);
