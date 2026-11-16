import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { deliveryCode as deliveryCodeRule } from "@cke/validation";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertMessages, orderMessages, riderMessages, send } from "../live/publish";
import { clearAlerts, openAlert } from "../orders/alerts";
import { watNow } from "../orders/clock";
import { codeHash, MAX_CODE_ATTEMPTS } from "../orders/code";
import {
  CARRYING,
  fits,
  queueOrders,
  riderDeliveries,
  riderLoad,
  ridersPanel,
} from "../orders/riders";
import { advance, touch, type Tx } from "../orders/store";
import { ON_THE_WAY, orderDetail } from "../orders/view";
import { latestChange } from "./orders";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };
type Refused = { status: 400 | 404 | 409 | 429; error: string; attemptsLeft?: number };
const isRefused = (r: unknown): r is Refused => typeof r === "object" && r !== null && "error" in r;
const orderParam = zValidator("param", z.object({ orderId: z.uuid() }));

/**
 * Gives a ready delivery to a rider: from the queue (the rider accepts, RID-04) or from dispatch
 * (DSP-05, `assignedBy`). The order row is locked first, so when two riders tap Accept at the same
 * moment one wins and the other is told it's gone (10, race handling). The rider's own row is
 * locked next, so two of their own accepts can't both squeeze past the capacity rules (section 6).
 */
async function takeOrder(
  tx: Tx,
  orderId: string,
  riderId: string,
  assignedBy: string | null,
): Promise<Refused | { ok: true }> {
  const [o] = await tx.select().from(t.order).where(eq(t.order.id, orderId)).for("update");
  if (!o || o.type !== "delivery")
    return { status: 404, error: "That order isn’t waiting for a rider" };
  await tx.insert(t.riderState).values({ userId: riderId }).onConflictDoNothing();
  await tx.select().from(t.riderState).where(eq(t.riderState.userId, riderId)).for("update");
  const r = await riderLoad(tx, riderId);
  if (!r.online)
    return {
      status: 409,
      error: assignedBy ? "That rider is offline" : "Go online to take orders",
    };
  const [item] = await queueOrders(tx, [orderId]);
  if (!item)
    return {
      status: 409,
      error: assignedBy ? "A rider already has that order" : "Another rider took this order",
    };
  if (!fits(r, item))
    return {
      status: 409,
      error: assignedBy
        ? "That order doesn’t fit what the rider is carrying"
        : "This order doesn’t fit what you’re carrying",
    };
  await tx.insert(t.delivery).values({
    orderId,
    riderId,
    batchGroup: r.orders[0]?.group ?? crypto.randomUUID(),
    stopNumber: r.orders.length + 1,
    assignedBy,
    distanceM: item.distanceM,
  });
  // Recorded against the rider who accepted, or the dispatch officer who assigned it (4.5).
  await advance(tx, orderId, ["ready"], "rider_accepted", {
    kind: "staff",
    id: assignedBy ?? riderId,
  });
  return { ok: true };
}

/** Clears the rider's last position (7.1 rule 3: kept only while an order is on the way). */
const NO_POSITION = { lat: null, lng: null, locatedAt: null };

/** The rider's own delivery that is still being carried, locked for the change. */
async function myDelivery(tx: Tx, orderId: string, riderId: string) {
  const [row] = await tx
    .select({ order: t.order, delivery: t.delivery })
    .from(t.delivery)
    .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
    .where(and(eq(t.delivery.orderId, orderId), eq(t.delivery.riderId, riderId)))
    .for("update");
  return row ?? null;
}

/** Stores the rider's pay with the delivery when it's delivered (18.2). */
async function finishDelivery(tx: Tx, orderId: string, manualBy: string | null) {
  const [s] = await tx
    .select({ pay: t.setting.riderPay })
    .from(t.setting)
    .where(eq(t.setting.id, 1));
  await tx
    .update(t.delivery)
    .set({ deliveredAt: new Date(), riderPay: s?.pay ?? 1000, manualCompletionBy: manualBy })
    .where(eq(t.delivery.orderId, orderId));
  await tx
    .update(t.helpRequest)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: manualBy,
      resolution: manualBy ? "manual_completion" : null,
    })
    .where(and(eq(t.helpRequest.orderId, orderId), eq(t.helpRequest.status, "open")));
  // Nothing else on the way: the last position isn't kept (7.1 rule 3).
  const [d] = await tx
    .select({ riderId: t.delivery.riderId })
    .from(t.delivery)
    .where(eq(t.delivery.orderId, orderId));
  if (d) {
    const [still] = await tx
      .select({ id: t.order.id })
      .from(t.delivery)
      .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
      .where(and(eq(t.delivery.riderId, d.riderId), inArray(t.order.status, [...ON_THE_WAY])))
      .limit(1);
    if (!still)
      await tx.update(t.riderState).set(NO_POSITION).where(eq(t.riderState.userId, d.riderId));
  }
  return clearAlerts(tx, orderId, ["stuck", "help_request", "unaccepted"], manualBy);
}

/** Numbers the remaining stops 1, 2, 3 after one leaves. */
async function renumber(tx: Tx, riderId: string) {
  const rest = await tx
    .select({ orderId: t.delivery.orderId })
    .from(t.delivery)
    .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
    .where(and(eq(t.delivery.riderId, riderId), inArray(t.order.status, [...CARRYING])))
    .orderBy(asc(t.delivery.stopNumber));
  for (const [i, d] of rest.entries())
    await tx
      .update(t.delivery)
      .set({ stopNumber: i + 1 })
      .where(eq(t.delivery.orderId, d.orderId));
}

/** The rider app (architecture.md 5.2, section 6), mounted at /rider. Riders only. */
export const rider = new Hono<Ctx>()
  /** PUT /rider/online: one tap; going offline is blocked while carrying an order (RID-02). */
  .put(
    "/online",
    requireRole("rider"),
    zValidator("json", z.object({ online: z.boolean() })),
    async (c) => {
      const db = c.get("db");
      const me = c.get("actor");
      const { online } = c.req.valid("json");
      const r = await riderLoad(db, me.id);
      if (!online && r.orders.length)
        return c.json({ error: "Deliver or release your orders before going offline" }, 409);
      await db
        .insert(t.riderState)
        .values({ userId: me.id, online })
        .onConflictDoUpdate({
          target: t.riderState.userId,
          // Offline keeps no position (7.1 rule 3).
          set: { online, ...(online ? {} : NO_POSITION), ...touch() },
        });
      send(c, await riderMessages(db, [me.id]));
      return c.json({ online });
    },
  )

  /**
   * PUT /rider/location: the rider's position while an order is on the way (RID-17, 7.1). Sent
   * about every 45 seconds and only after moving about 100 m, so it is cheap. Each customer whose
   * order the rider has picked up gets it on the live connection (CUS-09). With nothing picked up,
   * or with Milestones only set, it answers `tracking: false` and keeps nothing, and the app stops.
   */
  .put(
    "/location",
    requireRole("rider"),
    zValidator(
      "json",
      z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    ),
    async (c) => {
      const db = c.get("db");
      const me = c.get("actor");
      const { lat, lng } = c.req.valid("json");
      const [s] = await db
        .select({ mode: t.setting.trackingMode })
        .from(t.setting)
        .where(eq(t.setting.id, 1));
      const onTheWay =
        s?.mode === "milestones"
          ? []
          : await db
              .select({ orderId: t.order.id, customerId: t.order.customerId })
              .from(t.delivery)
              .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
              .where(and(eq(t.delivery.riderId, me.id), inArray(t.order.status, [...ON_THE_WAY])));
      if (!onTheWay.length) {
        await db.update(t.riderState).set(NO_POSITION).where(eq(t.riderState.userId, me.id));
        return c.json({ tracking: false });
      }
      const now = new Date();
      // The position isn't a change other screens catch up on, so the change number stays.
      await db
        .update(t.riderState)
        .set({ lat, lng, locatedAt: now })
        .where(eq(t.riderState.userId, me.id));
      send(
        c,
        onTheWay
          .filter((o) => o.customerId)
          .map((o) => ({
            to: [`customer:${o.customerId}`],
            data: { type: "rider-location", orderId: o.orderId, lat, lng, at: now.toISOString() },
          })),
      );
      return c.json({ tracking: true });
    },
  )

  /** GET /rider/queue: ready orders that fit what the rider carries, and how many don't (RID-03, RID-05). */
  .get("/queue", requireRole("rider"), async (c) => {
    const db = c.get("db");
    const r = await riderLoad(db, c.get("actor").id);
    const all = r.online ? await queueOrders(db) : [];
    const fitting = all.filter((q) => fits(r, q));
    return c.json({
      online: r.online,
      carrying: r.orders.length,
      load: r.load,
      budget: r.budget,
      orders: fitting.map(({ lat: _lat, lng: _lng, ...card }) => card), // no map in the rider app
      hidden: all.length - fitting.length,
      latest: await latestChange(db),
    });
  })

  /** POST /rider/queue/:orderId/accept: first to accept wins (RID-04). */
  .post("/queue/:orderId/accept", requireRole("rider"), orderParam, async (c) => {
    const db = c.get("db");
    const me = c.get("actor");
    const { orderId } = c.req.valid("param");
    const result = await db.transaction((tx) => takeOrder(tx, orderId, me.id, null));
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId]));
    return c.json({ deliveries: await riderDeliveries(db, me.id) });
  })

  /** GET /rider/deliveries: the stops in order, one primary action at a time (RID-06). */
  .get("/deliveries", requireRole("rider"), async (c) => {
    const db = c.get("db");
    return c.json({
      deliveries: await riderDeliveries(db, c.get("actor").id),
      latest: await latestChange(db),
    });
  })

  /** PUT /rider/deliveries/order: the rider changes the suggested stop order (section 6). */
  .put(
    "/deliveries/order",
    requireRole("rider"),
    zValidator("json", z.object({ orderIds: z.array(z.uuid()).min(1).max(3) })),
    async (c) => {
      const db = c.get("db");
      const me = c.get("actor");
      const { orderIds } = c.req.valid("json");
      const ok = await db.transaction(async (tx) => {
        const current = (await riderDeliveries(tx, me.id)).map((d) => d.orderId);
        if (current.length !== orderIds.length || !current.every((id) => orderIds.includes(id)))
          return false;
        for (const [i, id] of orderIds.entries())
          await tx
            .update(t.delivery)
            .set({ stopNumber: i + 1 })
            .where(eq(t.delivery.orderId, id));
        await tx.update(t.order).set(touch()).where(inArray(t.order.id, orderIds));
        return true;
      });
      if (!ok) return c.json({ error: "Send every stop you’re carrying, once each" }, 400);
      send(c, await orderMessages(db, c.env.BETTER_AUTH_SECRET, orderIds));
      return c.json({ deliveries: await riderDeliveries(db, me.id) });
    },
  )

  /** POST /rider/deliveries/:orderId/picked-up: matched the order number at the kitchen (RID-07). */
  .post("/deliveries/:orderId/picked-up", requireRole("rider"), orderParam, async (c) => {
    const db = c.get("db");
    const me = c.get("actor");
    const { orderId } = c.req.valid("param");
    const result = await db.transaction(async (tx) => {
      if (!(await myDelivery(tx, orderId, me.id)))
        return { status: 404 as const, error: "That order isn’t yours" };
      const now = new Date();
      const o = await advance(
        tx,
        orderId,
        ["rider_accepted"],
        "picked_up",
        { kind: "staff", id: me.id },
        { pickedUpAt: now },
      );
      if (!o) return { status: 409 as const, error: "That order has already been picked up" };
      await tx.update(t.delivery).set({ pickedUpAt: now }).where(eq(t.delivery.orderId, orderId));
      return { ok: true };
    });
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId]));
    return c.json({ deliveries: await riderDeliveries(db, me.id) });
  })

  /** POST /rider/deliveries/:orderId/arriving: within about 300 m of the address (4.1, status 8). */
  .post("/deliveries/:orderId/arriving", requireRole("rider"), orderParam, async (c) => {
    const db = c.get("db");
    const me = c.get("actor");
    const { orderId } = c.req.valid("param");
    const result = await db.transaction(async (tx) => {
      if (!(await myDelivery(tx, orderId, me.id)))
        return { status: 404 as const, error: "That order isn’t yours" };
      const o = await advance(tx, orderId, ["picked_up"], "arriving", { kind: "staff", id: me.id });
      return o ? { ok: true } : { status: 409 as const, error: "Pick the order up first" };
    });
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId]));
    return c.json({ deliveries: await riderDeliveries(db, me.id) });
  })

  /** POST /rider/deliveries/:orderId/deliver: the customer's 4-digit code completes it (RID-10, 4.4). */
  .post(
    "/deliveries/:orderId/deliver",
    requireRole("rider"),
    orderParam,
    zValidator("json", z.object({ code: deliveryCodeRule })),
    async (c) => {
      const db = c.get("db");
      const me = c.get("actor");
      const { orderId } = c.req.valid("param");
      const { code } = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | { alerts: string[] }> => {
        const mine = await myDelivery(tx, orderId, me.id);
        if (!mine) return { status: 404, error: "That order isn’t yours" };
        const o = mine.order;
        if (o.status !== "picked_up" && o.status !== "arriving")
          return { status: 409, error: "Pick the order up first" };
        if (o.codeAttempts >= MAX_CODE_ATTEMPTS)
          return {
            status: 429,
            error: "Too many wrong codes. Tap Need help and dispatch will sort it out.",
            attemptsLeft: 0,
          };
        if ((await codeHash(orderId, code)) !== o.deliveryCodeHash) {
          await tx
            .update(t.order)
            .set({ codeAttempts: o.codeAttempts + 1 })
            .where(eq(t.order.id, orderId));
          const left = MAX_CODE_ATTEMPTS - o.codeAttempts - 1;
          return {
            status: 400,
            error: left
              ? "That code isn’t right. Check it with the customer."
              : "Too many wrong codes. Tap Need help.",
            attemptsLeft: left,
          };
        }
        await advance(
          tx,
          orderId,
          ["picked_up", "arriving"],
          "delivered",
          { kind: "staff", id: me.id },
          { deliveredAt: new Date() },
        );
        const alerts = await finishDelivery(tx, orderId, null);
        await renumber(tx, me.id);
        return { alerts };
      });
      if (isRefused(result))
        return c.json({ error: result.error, attemptsLeft: result.attemptsLeft }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ deliveries: await riderDeliveries(db, me.id) });
    },
  )

  /** POST /rider/deliveries/:orderId/help: an unreachable customer or a code problem (RID-11, DSP-04). */
  .post(
    "/deliveries/:orderId/help",
    requireRole("rider"),
    orderParam,
    zValidator("json", z.object({ reason: z.enum(t.helpReason.enumValues) })),
    async (c) => {
      const db = c.get("db");
      const me = c.get("actor");
      const { orderId } = c.req.valid("param");
      const { reason } = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | { alerts: string[] }> => {
        const mine = await myDelivery(tx, orderId, me.id);
        if (!mine || !(CARRYING as readonly string[]).includes(mine.order.status))
          return { status: 404, error: "That order isn’t one you’re carrying" };
        const [open] = await tx
          .select({ id: t.helpRequest.id })
          .from(t.helpRequest)
          .where(and(eq(t.helpRequest.orderId, orderId), eq(t.helpRequest.status, "open")));
        if (open)
          return { status: 409, error: "Dispatch already has your request. They’ll call you." };
        const [req] = await tx
          .insert(t.helpRequest)
          .values({ orderId, riderId: me.id, reason })
          .returning();
        const alert = await openAlert(tx, "help_request", orderId, req!.id);
        await tx
          .update(t.order)
          .set({ exception: "delivery_issue", ...touch() })
          .where(eq(t.order.id, orderId));
        return { alerts: alert ? [alert] : [] };
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ ok: true }, 201);
    },
  )

  /** POST /rider/deliveries/:orderId/release: hands an order back to the queue before pickup (RID-12). */
  .post("/deliveries/:orderId/release", requireRole("rider"), orderParam, async (c) => {
    const db = c.get("db");
    const me = c.get("actor");
    const { orderId } = c.req.valid("param");
    const result = await db.transaction(async (tx) => {
      const mine = await myDelivery(tx, orderId, me.id);
      if (!mine) return { status: 404 as const, error: "That order isn’t yours" };
      if (mine.order.status !== "rider_accepted")
        return { status: 409 as const, error: "You’ve picked it up. Tap Need help instead." };
      await tx.delete(t.delivery).where(eq(t.delivery.orderId, orderId));
      await advance(tx, orderId, ["rider_accepted"], "ready", { kind: "staff", id: me.id });
      await renumber(tx, me.id);
      return { ok: true };
    });
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, [
      ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [orderId])),
      ...(await riderMessages(db, [me.id])),
    ]);
    return c.json({ deliveries: await riderDeliveries(db, me.id) });
  })

  /**
   * GET /rider/earnings: today, this week, this month, and all time; what's owed by day; today's
   * deliveries with each one's pay; and the payout history (RID-13, RID-18, 18.2).
   */
  .get("/earnings", requireRole("rider"), async (c) => {
    const db = c.get("db");
    const me = c.get("actor");
    const today = watNow().date;
    const d = new Date(`${today}T00:00:00Z`);
    const weekStart = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000)
      .toISOString()
      .slice(0, 10); // Monday
    const monthStart = `${today.slice(0, 7)}-01`;
    const mine = and(eq(t.delivery.riderId, me.id), isNotNull(t.delivery.deliveredAt));
    const sum = (from?: string) =>
      db
        .select({
          n: sql<number>`count(*)::int`,
          pay: sql<number>`coalesce(sum(${t.delivery.riderPay}), 0)::int`,
        })
        .from(t.delivery)
        .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
        .where(and(mine, from ? gte(t.order.businessDate, from) : undefined))
        .then((r) => r[0]!);
    const [todayT, week, month, all, todays, payouts] = await Promise.all([
      sum(today),
      sum(weekStart),
      sum(monthStart),
      sum(),
      db
        .select({
          number: t.order.number,
          deliveredAt: t.delivery.deliveredAt,
          pay: t.delivery.riderPay,
        })
        .from(t.delivery)
        .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
        .where(and(mine, eq(t.order.businessDate, today)))
        .orderBy(desc(t.delivery.deliveredAt)),
      db
        .select()
        .from(t.payout)
        .where(eq(t.payout.riderId, me.id))
        .orderBy(desc(t.payout.periodEnd)),
    ]);
    // Owed: everything delivered after the last paid period, by day.
    const lastPaid = payouts.find((p) => p.status === "paid")?.periodEnd ?? "1970-01-01";
    const owedByDay = await db
      .select({
        day: t.order.businessDate,
        n: sql<number>`count(*)::int`,
        pay: sql<number>`coalesce(sum(${t.delivery.riderPay}), 0)::int`,
      })
      .from(t.delivery)
      .innerJoin(t.order, eq(t.order.id, t.delivery.orderId))
      .where(and(mine, sql`${t.order.businessDate} > ${lastPaid}`))
      .groupBy(t.order.businessDate)
      .orderBy(desc(t.order.businessDate));
    return c.json({
      today: todayT,
      week,
      month,
      allTime: all,
      owed: { total: owedByDay.reduce((s, x) => s + x.pay, 0), days: owedByDay },
      todaysDeliveries: todays,
      payouts: payouts.map((p) => ({
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        deliveries: p.deliveries,
        amount: p.amount,
        status: p.status,
        paidAt: p.paidAt,
      })),
    });
  });

/** GET /riders: the live riders panel for dispatch officers and managers (DSP-03, MGR-02). */
export const riders = new Hono<Ctx>().get("/", requireRole("dispatch", "manager"), async (c) => {
  const db = c.get("db");
  return c.json({ riders: await ridersPanel(db), latest: await latestChange(db) });
});

/** POST /orders/:id/assign: dispatch gives a waiting order to an online rider it fits (DSP-05, RID-23). */
export const assign = new Hono<Ctx>().post(
  "/:id/assign",
  requireRole("dispatch", "manager"),
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator("json", z.object({ riderCode: z.string().regex(/^R-\d{3,}$/) })),
  async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const { id } = c.req.valid("param");
    const [r] = await db
      .select({ userId: t.staffProfile.userId })
      .from(t.staffProfile)
      .where(
        and(
          eq(t.staffProfile.code, c.req.valid("json").riderCode),
          eq(t.staffProfile.role, "rider"),
          eq(t.staffProfile.status, "active"),
        ),
      );
    if (!r) return c.json({ error: "That rider isn’t on the staff list" }, 404);
    const result = await db.transaction(async (tx) => {
      const taken = await takeOrder(tx, id, r.userId, actor.id);
      if (isRefused(taken)) return taken;
      return { alerts: await clearAlerts(tx, id, ["unaccepted"], actor.id) };
    });
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, [
      ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
      ...(await alertMessages(db, result.alerts)),
    ]);
    return c.json({ order: await orderDetail(db, id) });
  },
);

/** POST /help-requests/:id/resolve: approve a manual completion or keep the order open (DSP-04, MGR-16). */
export const helpRequests = new Hono<Ctx>().post(
  "/:id/resolve",
  requireRole("dispatch", "manager"),
  zValidator("param", z.object({ id: z.uuid() })),
  zValidator("json", z.object({ resolution: z.enum(t.helpResolution.enumValues) })),
  async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const { id } = c.req.valid("param");
    const { resolution } = c.req.valid("json");
    const result = await db.transaction(
      async (tx): Promise<Refused | { orderId: string; alerts: string[] }> => {
        const [req] = await tx
          .select()
          .from(t.helpRequest)
          .where(eq(t.helpRequest.id, id))
          .for("update");
        if (!req || req.status !== "open")
          return { status: 409, error: "That request has already been resolved" };
        const [o] = await tx.select().from(t.order).where(eq(t.order.id, req.orderId));
        let alerts: string[];
        if (resolution === "manual_completion") {
          const done = await advance(
            tx,
            req.orderId,
            [...CARRYING],
            "delivered",
            { kind: "staff", id: actor.id },
            { deliveredAt: new Date(), exception: null },
          );
          if (!done) return { status: 409, error: "That order is no longer out for delivery" };
          alerts = await finishDelivery(tx, req.orderId, actor.id);
          await renumber(tx, req.riderId);
          await tx.insert(t.auditLog).values({
            actorId: actor.id,
            kind: "other",
            action: `Approved a manual completion for ${o!.number}`,
            target: `order:${req.orderId}`,
            after: { reason: req.reason },
          });
        } else {
          await tx
            .update(t.helpRequest)
            .set({ status: "resolved", resolution, resolvedBy: actor.id, resolvedAt: new Date() })
            .where(eq(t.helpRequest.id, id));
          await tx
            .update(t.order)
            .set({ exception: null, ...touch() })
            .where(eq(t.order.id, req.orderId));
          alerts = await clearAlerts(tx, req.orderId, ["help_request"], actor.id);
        }
        return { orderId: req.orderId, alerts };
      },
    );
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, [
      ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [result.orderId])),
      ...(await alertMessages(db, result.alerts)),
    ]);
    return c.json({ order: await orderDetail(db, result.orderId) });
  },
);
