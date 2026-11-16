import { and, eq, inArray, sql } from "drizzle-orm";
import { connect, type Db } from "../db/client";
import * as t from "../db/schema";
import { alertViews } from "../orders/alerts";
import { fits, queueOrders, riderLoad } from "../orders/riders";

// Push notifications through Expo's push service, with Firebase for Android (architecture.md
// 10 and 11). The live connection stays the main channel while an app is open; push reaches
// phones and tablets when the app is in the background or closed. Push is the only channel:
// no email or SMS. Each order status is announced once: the order row remembers the last status
// a push went out for, and claiming the next one is a single update, so two changes arriving
// together can't send the same notification twice.

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

/** One message in Expo's format. `channelId` picks the Android channel the app created. */
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  channelId: string;
  sound?: "default" | null;
  priority: "high" | "default";
  data: Record<string, string>;
};

/** A real Expo push token. Anything else (a test token) is never sent. */
const isExpoToken = (x: string) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(x);

/** The customer's notification for each status (4.1 and 4.2, the "Push notification" column). */
function customerText(
  o: typeof t.order.$inferSelect,
  rider: string | null,
): { title: string; body: string } | null {
  switch (o.status) {
    // Placed and confirmed happen together (the payment is simulated), so one notification.
    case "confirmed":
      return {
        title: `Order ${o.number} placed`,
        body: "Payment confirmed. We’ll tell you when the kitchen has it.",
      };
    case "acknowledged":
      return { title: "The kitchen has your order", body: `${o.number} is being prepared.` };
    case "rider_accepted":
      return {
        title: rider ? `Rider assigned: ${rider}` : "Rider assigned",
        body: `${rider ?? "Your rider"} will pick up ${o.number} shortly.`,
      };
    case "picked_up":
      return {
        title: "On the way",
        body: `${rider ?? "Your rider"} has your order. Follow them on the map.`,
      };
    case "arriving":
      return { title: "Arriving soon", body: "Have your 4-digit code ready for the rider." };
    case "delivered":
      return { title: "Delivered", body: `Enjoy your meal. Tap to rate ${o.number}.` };
    case "ready_for_collection":
      return { title: "Ready for collection", body: `Show ${o.number} at the counter.` };
    case "cancelled":
      return { title: `Order ${o.number} cancelled`, body: "Open the app to see your refund." };
    default:
      return null; // preparing, ready, collected: no notification (4.1)
  }
}

/** The push tokens of these people for one app. */
async function tokensOf(db: Db, app: "customer" | "rider" | "business", userIds: string[]) {
  if (!userIds.length) return [];
  return db
    .select({ token: t.pushToken.token, userId: t.pushToken.userId, sound: t.pushToken.sound })
    .from(t.pushToken)
    .where(and(eq(t.pushToken.app, app), inArray(t.pushToken.userId, userIds)));
}

/** Business app tokens of signed-in staff in these roles. */
async function staffTokens(db: Db, roles: string[]) {
  return db
    .select({ token: t.pushToken.token })
    .from(t.pushToken)
    .innerJoin(t.user, eq(t.user.id, t.pushToken.userId))
    .where(and(eq(t.pushToken.app, "business"), inArray(t.user.role, roles)));
}

/**
 * The notifications for orders whose status changed since the last push: the customer's status,
 * a new online order for the kitchen (with the chime when it's on, KIT-02), a ready delivery for
 * online riders it fits (RID-14), and an order a dispatch officer assigned to a rider (RID-23).
 */
export async function orderPushes(db: Db, orderIds: string[]): Promise<PushMessage[]> {
  const ids = [...new Set(orderIds)];
  if (!ids.length) return [];
  const claimed = await db
    .update(t.order)
    .set({ pushedStatus: sql`${t.order.status}` })
    .where(
      and(
        inArray(t.order.id, ids),
        sql`${t.order.pushedStatus} is distinct from ${t.order.status}`,
      ),
    )
    .returning();
  if (!claimed.length) return [];

  const out: PushMessage[] = [];
  const deliveries = await db
    .select({
      orderId: t.delivery.orderId,
      riderId: t.delivery.riderId,
      assignedBy: t.delivery.assignedBy,
      name: t.staffProfile.fullName,
    })
    .from(t.delivery)
    .innerJoin(t.staffProfile, eq(t.staffProfile.userId, t.delivery.riderId))
    .where(
      inArray(
        t.delivery.orderId,
        claimed.map((o) => o.id),
      ),
    );

  // Customers.
  const online = claimed.filter((o) => o.customerId);
  const customerTokens = await tokensOf(
    db,
    "customer",
    online.map((o) => o.customerId!),
  );
  for (const o of online) {
    const d = deliveries.find((x) => x.orderId === o.id);
    const text = customerText(o, d ? (d.name.split(" ")[0] ?? d.name) : null);
    if (!text) continue;
    for (const k of customerTokens.filter((x) => x.userId === o.customerId))
      out.push({
        to: k.token,
        ...text,
        channelId: "orders",
        priority: "high",
        data: { open: "track", orderId: o.id },
      });
  }

  // The kitchen: a new online order, with the chime when Settings, Alerts has it on.
  const fresh = claimed.filter((o) => o.channel === "online" && o.status === "confirmed");
  if (fresh.length) {
    const [s] = await db
      .select({ chime: t.setting.alertChime })
      .from(t.setting)
      .where(eq(t.setting.id, 1));
    const staff = await staffTokens(db, ["kitchen", "dispatch", "manager"]);
    for (const o of fresh)
      for (const k of staff)
        out.push({
          to: k.token,
          title: `New online order ${o.number}`,
          body:
            o.type === "delivery"
              ? "Delivery. Open the board to start it."
              : "Pickup. Open the board to start it.",
          channelId: s?.chime ? "orders-v2" : "orders-quiet",
          priority: "high",
          data: { open: "board", orderId: o.id },
        });
  }

  // Riders: a delivery became ready, so each online rider it fits hears about it.
  const ready = claimed.filter((o) => o.type === "delivery" && o.status === "ready");
  if (ready.length) {
    const items = await queueOrders(
      db,
      ready.map((o) => o.id),
    );
    const onlineRiders = await db
      .select({ userId: t.riderState.userId })
      .from(t.riderState)
      .where(eq(t.riderState.online, true));
    const tokens = await tokensOf(
      db,
      "rider",
      onlineRiders.map((r) => r.userId),
    );
    const riderIds = [...new Set(tokens.map((k) => k.userId))];
    const loads = await Promise.all(riderIds.map((id) => riderLoad(db, id)));
    for (const item of items)
      riderIds.forEach((id, i) => {
        if (!fits(loads[i]!, item)) return;
        for (const k of tokens.filter((x) => x.userId === id))
          out.push({
            to: k.token,
            title: "New order ready",
            body: `${item.number}, ${item.neighbourhood}, ${(item.distanceM / 1000).toFixed(1)} km`,
            channelId: k.sound ? "queue" : "queue-quiet",
            priority: "high",
            data: { open: "queue", orderId: item.orderId },
          });
      });
  }

  // A rider given an order by dispatch (RID-23).
  const assigned = claimed.filter((o) => o.status === "rider_accepted");
  for (const o of assigned) {
    const d = deliveries.find((x) => x.orderId === o.id && x.assignedBy);
    if (!d) continue;
    for (const k of await tokensOf(db, "rider", [d.riderId]))
      out.push({
        to: k.token,
        title: "Order assigned to you",
        body: `Dispatch gave you ${o.number}. Pick it up at the kitchen.`,
        channelId: k.sound ? "queue" : "queue-quiet",
        priority: "high",
        data: { open: "deliveries", orderId: o.id },
      });
  }
  return out;
}

/** The beep for timed alerts, once per alert, to staff who see Alerts (MGR-14). */
export async function alertPushes(db: Db, alertIds: string[]): Promise<PushMessage[]> {
  if (!alertIds.length) return [];
  const views = await alertViews(db, { ids: alertIds });
  const staff = await staffTokens(db, ["kitchen", "dispatch", "manager"]);
  const out: PushMessage[] = [];
  for (const a of views) {
    const number = a.order?.number ?? "An order";
    const text =
      a.kind === "unaccepted"
        ? { title: "Waiting for a rider", body: `${number} is ready and no rider has taken it.` }
        : { title: "Order running late", body: `${number} has been in one stage too long.` };
    for (const k of staff)
      out.push({
        to: k.token,
        ...text,
        channelId: "alerts-v1",
        priority: "high",
        data: { open: "alerts" },
      });
  }
  return out;
}

/**
 * Sends to Expo in batches of 100 (Expo's limit). A token Expo says is no longer registered (the
 * app was uninstalled) is deleted. Test tokens are never sent. Runs after the reply.
 */
export async function sendPush(env: Env, messages: PushMessage[]) {
  const real = messages.filter((m) => isExpoToken(m.to));
  for (let i = 0; i < real.length; i += 100) {
    const batch = real.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (!res.ok) continue;
      const { data } = (await res.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      const gone = (data ?? [])
        .map((r, j) =>
          r.status === "error" && r.details?.error === "DeviceNotRegistered" ? batch[j]!.to : null,
        )
        .filter((x): x is string => !!x);
      if (gone.length) {
        // The request's own connection is closed by now, so this opens one.
        const { db, close } = await connect(env);
        try {
          await db.delete(t.pushToken).where(inArray(t.pushToken.token, gone));
        } finally {
          await close();
        }
      }
    } catch {
      // Push is a convenience on top of the live connection; the apps still catch up.
    }
  }
}
