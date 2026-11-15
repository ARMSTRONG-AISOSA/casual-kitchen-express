import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertMessages, orderMessages, send } from "../live/publish";
import { clearAlerts, openAlert } from "../orders/alerts";
import {
  AFTER_PICKUP,
  BEFORE_READY,
  CANCELLABLE,
  cancelOrder,
  recentCancellations,
  recordRefund,
  refunded,
} from "../orders/cancel";
import { touch } from "../orders/store";
import { customerView, orderDetail } from "../orders/view";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

const reason = z.string().trim().min(2, "Pick or type a reason").max(200);
/** Every cancellation and refund needs its confirmation tick first (4.6, MGR-15). */
const ticked = z.literal(true, { error: "Tick the box to confirm" });
const idParam = zValidator("param", z.object({ id: z.uuid() }));
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

type Refused = { status: 400 | 403 | 404 | 409; error: string; mustRequest?: boolean };
type Cancelled = { order: typeof t.order.$inferSelect; alerts: string[] };
const isRefused = (r: unknown): r is Refused => typeof r === "object" && r !== null && "error" in r;

/**
 * The customer's side of cancelling (CUS-20, 4.6) and rating (CUS-18), mounted at /me/orders.
 */
export const myOrderActions = new Hono<Ctx>()
  /** POST /me/orders/:id/cancel: before the kitchen acknowledges, with a reason and the tick. */
  .post(
    "/:id/cancel",
    requireRole("customer"),
    idParam,
    zValidator("json", z.object({ reason, confirm: ticked })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | Cancelled> => {
        const [o] = await tx
          .select()
          .from(t.order)
          .where(and(eq(t.order.id, id), eq(t.order.customerId, actor.id)));
        if (!o) return { status: 404 as const, error: "That order isn’t yours" };
        if (o.status !== "placed" && o.status !== "confirmed")
          return {
            status: 409 as const,
            error: "The kitchen has your order now. You can send a cancellation request.",
            mustRequest: true,
          };
        // After the set number of cancellations in 7 days, only a request is possible (4.6, MGR-35).
        const [s] = await tx
          .select({ limit: t.setting.cancellationLimit })
          .from(t.setting)
          .where(eq(t.setting.id, 1));
        const recent = await recentCancellations(tx, actor.id);
        if (recent >= (s?.limit ?? 3))
          return {
            status: 409 as const,
            error: `You’ve cancelled ${recent} orders in the last 7 days, so this one needs a request. The restaurant decides.`,
            mustRequest: true,
          };
        // A full refund, delivery fee included, because it's before pickup (4.6).
        const done = await cancelOrder(
          tx,
          id,
          ["placed", "confirmed"],
          { kind: "customer", id: actor.id, decidedBy: null, requestedBy: actor.id },
          body.reason,
          o.total,
        );
        if (!done)
          return {
            status: 409 as const,
            error: "The kitchen has your order now. You can send a cancellation request.",
            mustRequest: true,
          };
        return done;
      });
      if (isRefused(result))
        return c.json(
          { error: result.error, mustRequest: result.mustRequest ?? false },
          result.status,
        );
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await customerView(db, c.env.BETTER_AUTH_SECRET, result.order) });
    },
  )

  /** POST /me/orders/:id/cancellation-request: once acknowledged, a dispatch officer or manager decides (DSP-06). */
  .post(
    "/:id/cancellation-request",
    requireRole("customer"),
    idParam,
    zValidator("json", z.object({ reason, confirm: ticked })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | Cancelled> => {
        const [o] = await tx
          .select()
          .from(t.order)
          .where(and(eq(t.order.id, id), eq(t.order.customerId, actor.id)))
          .for("update");
        if (!o) return { status: 404 as const, error: "That order isn’t yours" };
        if (!BEFORE_READY.includes(o.status))
          return {
            status: 409 as const,
            error:
              "Your order is ready, so it can’t be cancelled now. You can contact the restaurant.",
          };
        const [pending] = await tx
          .select({ id: t.cancellationRequest.id })
          .from(t.cancellationRequest)
          .where(
            and(eq(t.cancellationRequest.orderId, id), eq(t.cancellationRequest.status, "pending")),
          );
        if (pending)
          return {
            status: 409 as const,
            error: "You’ve already asked. The restaurant will decide shortly.",
          };
        const [req] = await tx
          .insert(t.cancellationRequest)
          .values({ orderId: id, customerId: actor.id, reason: body.reason })
          .returning();
        const alert = await openAlert(tx, "cancellation_request", id, req!.id);
        const [updated] = await tx
          .update(t.order)
          .set(touch())
          .where(eq(t.order.id, id))
          .returning();
        return { order: updated!, alerts: alert ? [alert] : [] };
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await customerView(db, c.env.BETTER_AUTH_SECRET, result.order) }, 201);
    },
  )

  /** POST /me/orders/:id/rating: one tap after delivery or collection (CUS-18), once per order. */
  .post(
    "/:id/rating",
    requireRole("customer"),
    idParam,
    zValidator("json", z.object({ stars: z.number().int().min(1).max(5) })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const [o] = await db
        .select()
        .from(t.order)
        .where(and(eq(t.order.id, id), eq(t.order.customerId, actor.id)));
      if (!o) return c.json({ error: "That order isn’t yours" }, 404);
      if (o.status !== "delivered" && o.status !== "collected")
        return c.json({ error: "You can rate an order once you have it" }, 409);
      const [made] = await db
        .insert(t.rating)
        .values({ orderId: id, customerId: actor.id, stars: c.req.valid("json").stars })
        .onConflictDoNothing()
        .returning();
      if (!made) return c.json({ error: "You’ve already rated this order" }, 409);
      return c.json({ rating: { stars: made.stars } }, 201);
    },
  );

/**
 * Staff cancelling, refunding, and flagging an item (4.6, MGR-15, KIT-09), mounted at /orders.
 * Each refund records the person signed in with their name, role, and staff ID (MGR-15).
 */
export const orderActions = new Hono<Ctx>()
  /** POST /orders/:id/cancel: managers at any stage; kitchen staff only walk-ins before Ready. */
  .post(
    "/:id/cancel",
    requireRole("kitchen", "manager"),
    idParam,
    zValidator(
      "json",
      z.object({ reason, confirm: ticked, refundAmount: z.number().int().min(0).optional() }),
    ),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | Cancelled> => {
        const [o] = await tx.select().from(t.order).where(eq(t.order.id, id)).for("update");
        if (!o) return { status: 404 as const, error: "That order doesn’t exist" };
        const left = o.total - (await refunded(tx, id));
        let from = CANCELLABLE;
        let amount: number;
        if (actor.role === "kitchen") {
          if (o.channel !== "walkin")
            return { status: 403 as const, error: "Ask a manager to cancel an online order" };
          from = BEFORE_READY; // walk-ins can be cancelled by staff before they're ready (4.6)
          amount = left;
        } else if (AFTER_PICKUP.includes(o.status)) {
          // After pickup, the manager decides how much to refund (4.6).
          if (body.refundAmount === undefined)
            return { status: 400 as const, error: "Choose how much to refund" };
          amount = body.refundAmount;
        } else {
          amount = body.refundAmount ?? left; // before pickup the delivery fee goes back too
        }
        if (amount > left)
          return { status: 400 as const, error: `The most that can be refunded is ${naira(left)}` };
        const done = await cancelOrder(
          tx,
          id,
          from,
          { kind: "staff", id: actor.id, decidedBy: actor.id, requestedBy: actor.id },
          body.reason,
          amount,
        );
        if (!done)
          return {
            status: 409 as const,
            error:
              actor.role === "kitchen"
                ? "It’s ready now. Ask a manager."
                : "That order is already finished",
          };
        return done;
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await orderDetail(db, id) });
    },
  )

  /** POST /orders/:id/refunds: a full or partial refund on any order (managers, MGR-15). */
  .post(
    "/:id/refunds",
    requireRole("manager"),
    idParam,
    zValidator("json", z.object({ amount: z.number().int().min(1), reason, confirm: ticked })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | { alerts: string[] }> => {
        const [o] = await tx.select().from(t.order).where(eq(t.order.id, id)).for("update");
        if (!o) return { status: 404 as const, error: "That order doesn’t exist" };
        const left = o.total - (await refunded(tx, id));
        if (body.amount > left)
          return { status: 400 as const, error: `The most that can be refunded is ${naira(left)}` };
        await recordRefund(tx, o, {
          amount: body.amount,
          reason: body.reason,
          requestedBy: actor.id,
          decidedBy: actor.id,
        });
        // An item that couldn't be made is settled by its refund (4.6).
        const alerts = await clearAlerts(tx, id, ["item_unavailable"], actor.id);
        await tx
          .update(t.order)
          .set({ ...(o.exception === "item_unavailable" ? { exception: null } : {}), ...touch() })
          .where(eq(t.order.id, id));
        return { alerts };
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await orderDetail(db, id) }, 201);
    },
  )

  /** POST /orders/:id/item-unavailable: the kitchen can't make a line; a manager decides (KIT-09). */
  .post(
    "/:id/item-unavailable",
    requireRole("kitchen", "manager"),
    idParam,
    zValidator("json", z.object({ itemId: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const { itemId } = c.req.valid("json");
      const result = await db.transaction(async (tx): Promise<Refused | { alerts: string[] }> => {
        const [line] = await tx
          .select({ name: t.orderItem.name, number: t.order.number, status: t.order.status })
          .from(t.orderItem)
          .innerJoin(t.order, eq(t.order.id, t.orderItem.orderId))
          .where(and(eq(t.orderItem.id, itemId), eq(t.orderItem.orderId, id)));
        if (!line) return { status: 404 as const, error: "That item isn’t on this order" };
        if (!CANCELLABLE.includes(line.status))
          return { status: 409 as const, error: "That order is already finished" };
        await tx
          .update(t.order)
          .set({ exception: "item_unavailable", ...touch() })
          .where(eq(t.order.id, id));
        const alert = await openAlert(tx, "item_unavailable", id);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "other",
          action: `Flagged ${line.name} as unavailable on ${line.number}`,
          target: `order:${id}`,
        });
        return { alerts: alert ? [alert] : [] };
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await orderDetail(db, id) });
    },
  );

/** Dispatch officers and managers decide customers' cancellation requests (DSP-06). */
export const cancellationRequests = new Hono<Ctx>()
  /** POST /cancellation-requests/:id/approve: refunded in full if the food isn't ready yet (4.6). */
  .post(
    "/:id/approve",
    requireRole("dispatch", "manager"),
    idParam,
    zValidator("json", z.object({ confirm: ticked })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const result = await db.transaction(async (tx): Promise<Refused | Cancelled> => {
        const [req] = await tx
          .select()
          .from(t.cancellationRequest)
          .where(eq(t.cancellationRequest.id, id))
          .for("update");
        if (!req || req.status !== "pending")
          return { status: 409 as const, error: "That request has already been decided" };
        const [o] = await tx.select().from(t.order).where(eq(t.order.id, req.orderId));
        const done = await cancelOrder(
          tx,
          req.orderId,
          BEFORE_READY,
          { kind: "staff", id: actor.id, decidedBy: actor.id, requestedBy: req.customerId },
          `Customer request: ${req.reason}`,
          o!.total - (await refunded(tx, req.orderId)),
        );
        if (!done)
          return {
            status: 409 as const,
            error:
              "The food is ready now, so a manager decides. Open the order to cancel it there.",
          };
        return done;
      });
      if (isRefused(result)) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [result.order.id])),
        ...(await alertMessages(db, result.alerts)),
      ]);
      return c.json({ order: await orderDetail(db, result.order.id) });
    },
  )

  /** POST /cancellation-requests/:id/decline: the order carries on. */
  .post("/:id/decline", requireRole("dispatch", "manager"), idParam, async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const { id } = c.req.valid("param");
    const result = await db.transaction(
      async (tx): Promise<Refused | { orderId: string; alerts: string[] }> => {
        const [req] = await tx
          .update(t.cancellationRequest)
          .set({ status: "declined", decidedBy: actor.id, decidedAt: new Date() })
          .where(and(eq(t.cancellationRequest.id, id), eq(t.cancellationRequest.status, "pending")))
          .returning();
        if (!req) return { status: 409 as const, error: "That request has already been decided" };
        const alerts = await clearAlerts(tx, req.orderId, ["cancellation_request"], actor.id);
        await tx.update(t.order).set(touch()).where(eq(t.order.id, req.orderId));
        return { orderId: req.orderId, alerts };
      },
    );
    if (isRefused(result)) return c.json({ error: result.error }, result.status);
    send(c, [
      ...(await orderMessages(db, c.env.BETTER_AUTH_SECRET, [result.orderId])),
      ...(await alertMessages(db, result.alerts)),
    ]);
    return c.json({ order: await orderDetail(db, result.orderId) });
  });
