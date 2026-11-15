import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import { ensureCustomer } from "../auth/customer";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { clockLabel, isOpen, todaysHours, watNow } from "../orders/clock";
import { codeHash, deliveryCode } from "../orders/code";
import { orderLines, priceLines } from "../orders/lines";
import { advance, insertOrder, touch, type Status } from "../orders/store";
import { customerView, customerViews, FINISHED, loadOrders, orderDetail } from "../orders/view";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** Statuses on the kitchen board: New, Preparing, and Ready with the handoff view (KIT-01, KIT-06). */
export const BOARD: Status[] = [
  "confirmed",
  "acknowledged",
  "preparing",
  "ready",
  "rider_accepted",
  "ready_for_collection",
];

const demoRef = () => `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const staffActor = (a: Actor) => ({ kind: "staff" as const, id: a.id });
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** The latest change number, for an app to ask for changes after it (14.4, decision 4). */
export async function latestChange(db: Db) {
  const [row] = (
    await db.execute<{ v: number }>(sql`select last_value::bigint as v from change_seq`)
  ).rows as [{ v: number | string }];
  return Number(row.v);
}

/** Whether a point lies inside the delivery boundary polygon, [lng, lat] corners (4.7). */
function insideBoundary(polygon: [number, number][], lng: number, lat: number) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Hides a customer's phone and address from roles that don't contact customers (12, privacy). */
function forRole<T extends { customer: { code: string; name: string } | null }>(
  o: T,
  role: Actor["role"],
) {
  if (role === "dispatch" || role === "manager" || !o.customer) return o;
  return { ...o, customer: { code: o.customer.code, name: o.customer.name } };
}

const place = z.object({
  type: z.enum(["delivery", "pickup"]),
  addressId: z.uuid().optional(),
  payment: z.enum(["card", "transfer"]),
  items: orderLines,
});

const walkIn = z.object({
  type: z.enum(["eat_in", "take_away"]),
  label: z.string().trim().max(30).optional(),
  items: orderLines,
  payment: z.discriminatedUnion("method", [
    z.object({ method: z.literal("cash"), received: z.number().int().min(0).max(10_000_000) }),
    z.object({ method: z.enum(["card", "transfer"]) }),
  ]),
});

const listQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  channel: z.enum(["online", "walkin"]).optional(),
  status: z.string().optional(), // comma-separated statuses
  payment: z.enum(["card", "transfer", "cash"]).optional(),
  staff: z
    .string()
    .regex(/^[RKDAM]-\d{3,}$/)
    .optional(),
  q: z.string().trim().max(20).optional(), // an order number or a customer ID
  sort: z.enum(["placed", "amount"]).default("placed"),
  cursor: z.string().max(200).optional(),
});

const PAGE = 150;

/**
 * Orders for staff (architecture.md 4, 4.5, 4.8): walk-in entry, the kitchen's steps, the board,
 * the order list, and the order detail. Each step is recorded against the person signed in.
 */
export const orders = new Hono<Ctx>()
  /** POST /orders/walk-in: an order taken at the counter, paid by cash or online (KIT-13, KIT-14). */
  .post("/walk-in", requireRole("kitchen", "manager"), zValidator("json", walkIn), async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const body = c.req.valid("json");
    const now = watNow();
    const { walkin } = await todaysHours(db, now.date);
    if (!isOpen(walkin, now.time))
      return c.json(
        {
          error: `Walk-in orders are taken from ${clockLabel(walkin.opens)} to ${clockLabel(walkin.closes)}`,
        },
        409,
      );
    const priced = await priceLines(db, body.items);
    if (!priced.ok) return c.json({ error: priced.error }, 409);
    const total = priced.foodTotal;
    const cash = body.payment.method === "cash" ? body.payment : null;
    if (cash && cash.received < total)
      return c.json({ error: `The cash received can’t be less than ${naira(total)}` }, 400);
    const o = await insertOrder(
      db,
      {
        businessDate: now.date,
        channel: "walkin",
        type: body.type,
        status: "confirmed",
        foodTotal: total,
        deliveryFee: 0,
        total,
        paymentMethod: body.payment.method,
        enteredBy: actor.id,
        label: body.label || null,
        soupVarietyId: priced.soupVarietyId,
        placedAt: new Date(),
      },
      priced.lines,
      {
        method: body.payment.method,
        demoRef: demoRef(),
        amount: total,
        cashReceived: cash?.received ?? null,
        changeDue: cash ? cash.received - total : null,
        takenBy: actor.id,
      },
      [
        { status: "placed", actorKind: "staff", actorId: actor.id },
        { status: "confirmed", actorKind: "staff", actorId: actor.id },
      ],
    );
    return c.json({ order: await orderDetail(db, o.id) }, 201);
  })

  /** GET /orders/board: every order still in the kitchen, with its lines (KIT-01). */
  .get("/board", requireRole("kitchen", "dispatch", "manager"), async (c) => {
    const db = c.get("db");
    const rows = await db
      .select()
      .from(t.order)
      .where(inArray(t.order.status, BOARD))
      .orderBy(asc(t.order.placedAt));
    const latest = await latestChange(db);
    const role = c.get("actor").role;
    return c.json({
      orders: (await loadOrders(db, rows, false)).map((o) => forRole(o, role)),
      latest,
    });
  })

  /**
   * GET /orders: any date range, filtered and sorted on the server, 150 at a time with a cursor
   * (MGR-15, MGR-33; 9, "Order list at any range"). Shows the count and total value of the range.
   */
  .get(
    "/",
    requireRole("dispatch", "accounts", "manager"),
    zValidator("query", listQuery),
    async (c) => {
      const db = c.get("db");
      const f = c.req.valid("query");
      const today = watNow().date;
      const where: SQL[] = [
        gte(t.order.businessDate, f.from ?? today),
        lte(t.order.businessDate, f.to ?? f.from ?? today),
      ];
      if (f.channel) where.push(eq(t.order.channel, f.channel));
      if (f.payment) where.push(eq(t.order.paymentMethod, f.payment));
      if (f.status) {
        const list = f.status
          .split(",")
          .filter((s): s is Status => (t.orderStatus.enumValues as readonly string[]).includes(s));
        if (list.length) where.push(inArray(t.order.status, list));
      }
      if (f.staff) {
        // Orders the staff member entered or moved along (4.5).
        where.push(sql`exists (select 1 from staff_profile sp where sp.code = ${f.staff} and (
        sp.user_id = ${t.order.enteredBy} or exists (select 1 from order_status_event e
        where e.order_id = ${t.order.id} and e.actor_id = sp.user_id)))`);
      }
      if (f.q) {
        const q = f.q.toUpperCase();
        where.push(
          q.startsWith("C-")
            ? sql`${t.order.customerId} in (select user_id from customer_profile where code = ${q})`
            : eq(t.order.number, q),
        );
      }
      const base = and(...where)!;
      const [totals] = (await db
        .select({
          count: sql<number>`count(*)::int`,
          value: sql<number>`coalesce(sum(${t.order.total}), 0)::int`,
        })
        .from(t.order)
        .where(base)) as [{ count: number; value: number }];

      // Keyset paging: newest (or largest) first, then by ID, so pages never repeat or skip.
      const sortCol = f.sort === "amount" ? t.order.total : t.order.placedAt;
      let page = base;
      if (f.cursor) {
        const [v, id] = JSON.parse(atob(f.cursor)) as [string | number, string];
        const value = f.sort === "amount" ? Number(v) : new Date(v);
        page = and(
          base,
          or(lt(sortCol, value as never), and(eq(sortCol, value as never), lt(t.order.id, id))),
        )!;
      }
      const rows = await db
        .select({
          id: t.order.id,
          number: t.order.number,
          businessDate: t.order.businessDate,
          channel: t.order.channel,
          type: t.order.type,
          status: t.order.status,
          exception: t.order.exception,
          total: t.order.total,
          paymentMethod: t.order.paymentMethod,
          placedAt: t.order.placedAt,
          label: t.order.label,
          customerCode: t.customerProfile.code,
          customerName: t.customerProfile.name,
          enteredByCode: t.staffProfile.code,
        })
        .from(t.order)
        .leftJoin(t.customerProfile, eq(t.customerProfile.userId, t.order.customerId))
        .leftJoin(t.staffProfile, eq(t.staffProfile.userId, t.order.enteredBy))
        .where(page)
        .orderBy(desc(sortCol), desc(t.order.id))
        .limit(PAGE + 1);
      const more = rows.length > PAGE;
      const shown = rows.slice(0, PAGE);
      const last = shown.at(-1);
      const nextCursor =
        more && last
          ? btoa(
              JSON.stringify([
                f.sort === "amount" ? last.total : last.placedAt.toISOString(),
                last.id,
              ]),
            )
          : null;
      return c.json({ orders: shown, count: totals.count, totalValue: totals.value, nextCursor });
    },
  )

  /** GET /orders/:id: the full order with its timeline, payment, and customer card (MGR-24). */
  .get(
    "/:id",
    requireRole("kitchen", "dispatch", "accounts", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const o = await orderDetail(c.get("db"), c.req.valid("param").id);
      if (!o) return c.json({ error: "That order doesn’t exist" }, 404);
      return c.json({ order: forRole(o, c.get("actor").role) });
    },
  )

  /** POST /orders/:id/acknowledge: the kitchen has the order (KIT-03). */
  .post(
    "/:id/acknowledge",
    requireRole("kitchen", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const { id } = c.req.valid("param");
      const o = await db.transaction((tx) =>
        advance(tx, id, ["placed", "confirmed"], "acknowledged", staffActor(c.get("actor")), {
          acknowledgedAt: new Date(),
        }),
      );
      if (!o) return c.json({ error: "That order has already moved on" }, 409);
      return c.json({ order: forRole((await orderDetail(db, id))!, c.get("actor").role) });
    },
  )

  /** PUT /orders/:id/items/:itemId: ticks a line by station; the first tick starts preparing (KIT-04). */
  .put(
    "/:id/items/:itemId",
    requireRole("kitchen", "manager"),
    zValidator("param", z.object({ id: z.uuid(), itemId: z.uuid() })),
    zValidator("json", z.object({ ticked: z.boolean() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id, itemId } = c.req.valid("param");
      const { ticked } = c.req.valid("json");
      const result = await db.transaction(async (tx) => {
        const [o] = await tx.select().from(t.order).where(eq(t.order.id, id)).for("update");
        if (!o) return { status: 404 as const, error: "That order doesn’t exist" };
        if (o.status !== "acknowledged" && o.status !== "preparing")
          return { status: 409 as const, error: "Acknowledge the order before ticking items" };
        const [line] = await tx
          .update(t.orderItem)
          .set({ ticked })
          .where(and(eq(t.orderItem.id, itemId), eq(t.orderItem.orderId, id)))
          .returning();
        if (!line) return { status: 404 as const, error: "That item isn’t on this order" };
        // The first tick tells the customer the food is being prepared (4.1, status 4).
        if (ticked && o.status === "acknowledged")
          await advance(tx, id, ["acknowledged"], "preparing", staffActor(actor));
        else await tx.update(t.order).set(touch()).where(eq(t.order.id, id));
        return null;
      });
      if (result) return c.json({ error: result.error }, result.status);
      return c.json({ order: forRole((await orderDetail(db, id))!, actor.role) });
    },
  )

  /** POST /orders/:id/ready: packed. Deliveries enter the rider queue; others wait to be collected (KIT-05, KIT-07). */
  .post(
    "/:id/ready",
    requireRole("kitchen", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const o = await db.transaction(async (tx) => {
        const [row] = await tx
          .select({ type: t.order.type })
          .from(t.order)
          .where(eq(t.order.id, id));
        if (!row) return null;
        return advance(
          tx,
          id,
          ["acknowledged", "preparing"],
          row.type === "delivery" ? "ready" : "ready_for_collection",
          staffActor(actor),
          {
            readyAt: new Date(),
          },
        );
      });
      if (!o)
        return c.json({ error: "Acknowledge the order first, or it has already moved on" }, 409);
      return c.json({ order: forRole((await orderDetail(db, id))!, actor.role) });
    },
  )

  /** POST /orders/:id/collected: a pickup or walk-in order has been handed over (KIT-07). */
  .post(
    "/:id/collected",
    requireRole("kitchen", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const o = await db.transaction((tx) =>
        advance(tx, id, ["ready_for_collection"], "collected", staffActor(actor), {
          collectedAt: new Date(),
        }),
      );
      if (!o) return c.json({ error: "That order isn’t waiting to be collected" }, 409);
      return c.json({ order: forRole((await orderDetail(db, id))!, actor.role) });
    },
  );

/**
 * A customer's own orders (CUS-05, CUS-07, CUS-08, CUS-10, CUS-13), mounted at /me/orders.
 * Payment is simulated: the order is confirmed straight away and no card details exist (18.1).
 */
export const myOrders = new Hono<Ctx>()
  /** POST /me/orders: checkout. Prices, hours, the pause, and the delivery range are checked here. */
  .post("/", requireRole("customer"), zValidator("json", place), async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const body = c.req.valid("json");
    const profile = await ensureCustomer(db, actor);
    if (profile.status !== "active") return c.json({ error: "This account is deactivated" }, 403);

    const now = watNow();
    const { setting, online, paused } = await todaysHours(db, now.date);
    if (paused)
      return c.json(
        { error: "New orders are paused for a short while. You can still look at the menu." },
        409,
      );
    if (!isOpen(online, now.time))
      return c.json(
        {
          error: `Online orders are open from ${clockLabel(online.opens)} to ${clockLabel(online.closes)}`,
        },
        409,
      );

    let neighbourhoodId: string | null = null;
    if (body.type === "delivery") {
      if (!body.addressId) return c.json({ error: "Add a delivery address to continue" }, 400);
      const [a] = await db
        .select({
          id: t.address.id,
          lat: t.address.lat,
          lng: t.address.lng,
          neighbourhoodId: t.address.neighbourhoodId,
          inRange: t.neighbourhood.inRange,
        })
        .from(t.address)
        .innerJoin(t.neighbourhood, eq(t.neighbourhood.id, t.address.neighbourhoodId))
        .where(
          and(
            eq(t.address.id, body.addressId),
            eq(t.address.userId, actor.id),
            eq(t.address.archived, false),
          ),
        );
      if (!a) return c.json({ error: "That address isn’t in your address book" }, 400);
      // Outside the range: the app offers pickup instead (CUS-23).
      const inside =
        a.inRange && (!setting.boundary?.length || insideBoundary(setting.boundary, a.lng, a.lat));
      if (!inside)
        return c.json(
          {
            error: "We don’t deliver to that address yet. You can pick up instead.",
            outsideRange: true,
          },
          409,
        );
      neighbourhoodId = a.neighbourhoodId;
    }

    const priced = await priceLines(db, body.items);
    if (!priced.ok) return c.json({ error: priced.error }, 409);
    const fee = body.type === "delivery" ? setting.deliveryFee : 0;
    const total = priced.foodTotal + fee;
    const o = await insertOrder(
      db,
      {
        businessDate: now.date,
        channel: "online",
        customerId: actor.id,
        type: body.type,
        status: "confirmed",
        foodTotal: priced.foodTotal,
        deliveryFee: fee, // stored when placed, so a later fee change doesn't alter it (18.2)
        total,
        paymentMethod: body.payment,
        addressId: body.type === "delivery" ? body.addressId! : null,
        neighbourhoodId,
        soupVarietyId: priced.soupVarietyId,
        placedAt: new Date(),
      },
      priced.lines,
      { method: body.payment, demoRef: demoRef(), amount: total },
      [
        { status: "placed", actorKind: "customer", actorId: actor.id },
        { status: "confirmed", actorKind: "system", actorId: null },
      ],
      async (_tx, orderId) =>
        body.type === "delivery"
          ? {
              deliveryCodeHash: await codeHash(
                orderId,
                await deliveryCode(c.env.BETTER_AUTH_SECRET, orderId),
              ),
            }
          : {},
    );
    return c.json({ order: await customerView(db, c.env.BETTER_AUTH_SECRET, o) }, 201);
  })

  /** GET /me/orders: In progress, or Order history 30 at a time (CUS-13). */
  .get(
    "/",
    requireRole("customer"),
    zValidator(
      "query",
      z.object({
        tab: z.enum(["progress", "history"]).default("progress"),
        before: z.iso.datetime().optional(),
      }),
    ),
    async (c) => {
      const db = c.get("db");
      const { tab, before } = c.req.valid("query");
      const mine = eq(t.order.customerId, c.get("actor").id);
      const finished = inArray(t.order.status, [...FINISHED]);
      const rows =
        tab === "progress"
          ? await db
              .select()
              .from(t.order)
              .where(and(mine, sql`not ${finished}`))
              .orderBy(desc(t.order.placedAt))
          : await db
              .select()
              .from(t.order)
              .where(
                and(mine, finished, before ? lt(t.order.placedAt, new Date(before)) : undefined),
              )
              .orderBy(desc(t.order.placedAt))
              .limit(30);
      const list = await customerViews(db, c.env.BETTER_AUTH_SECRET, rows);
      return c.json({ orders: list, latest: await latestChange(db) });
    },
  )

  /** GET /me/orders/:id: tracking, with the delivery code (CUS-08, CUS-10). */
  .get(
    "/:id",
    requireRole("customer"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const [o] = await db
        .select()
        .from(t.order)
        .where(
          and(eq(t.order.id, c.req.valid("param").id), eq(t.order.customerId, c.get("actor").id)),
        );
      if (!o) return c.json({ error: "That order isn’t yours" }, 404);
      return c.json({ order: await customerView(db, c.env.BETTER_AUTH_SECRET, o) });
    },
  );
