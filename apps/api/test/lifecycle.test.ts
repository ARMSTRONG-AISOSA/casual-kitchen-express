import { env, exports } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth/password";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { stepPractice } from "../src/demo/practice";
import { orderPushes } from "../src/live/push";
import { scanAlerts } from "../src/orders/alerts";
import { deleteOrders } from "./cleanup";
import { DEMO_PASSWORD, signIn } from "./session";

// The rest of the orders backend (architecture.md 4.6, 6, 10, 14.4): the address book, cancelling
// and refunds, the rider queue and deliveries, alerts, settings, and the live connection.
// A throwaway customer orders; the demo staff act; everything is put back at the end.
const USER_ID = "test-lifecycle-customer";
const USERNAME = "test.lifecycle";

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  exception?: string | null;
  deliveryCode?: string | null;
  items: { id: string }[];
  refunds?: {
    amount: number;
    kind: string;
    status: string;
    by?: { code: string; role: string } | null;
  }[];
  cancellationRequest?: { id?: string; status: string } | null;
};
type Msg = Record<string, unknown> & { type: string };

const call = (path: string, cookie: string, init: { method?: string; body?: unknown } = {}) =>
  exports.default.fetch(`http://example.com${path}`, {
    method: init.method ?? "GET",
    headers: {
      Origin: "cke-business://",
      Cookie: cookie,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
const json = async <T>(res: Response) => (await res.json()) as T;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Opens a live connection and collects what it receives. */
async function live(cookie: string) {
  const res = await exports.default.fetch("http://example.com/live", {
    headers: { Upgrade: "websocket", Cookie: cookie, Origin: "cke-business://" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  const got: Msg[] = [];
  ws.accept();
  ws.addEventListener("message", (e) => got.push(JSON.parse(e.data as string) as Msg));
  const waitFor = async (match: (m: Msg) => boolean, ms = 15_000) => {
    for (const start = Date.now(); Date.now() - start < ms; await pause(100)) {
      const m = got.find(match);
      if (m) return m;
    }
    throw new Error(`No matching live message; got ${JSON.stringify(got.map((m) => m.type))}`);
  };
  return { ws, got, waitFor };
}

let customer = "";
let kitchen = "";
let dispatch = "";
let manager = "";
let musa = "";
let femi = "";
let address = "";
let ugbowo = "";
let outsideArea = "";
let drink = "";
let jollof = "";
const made: string[] = [];
let saved: Partial<typeof t.setting.$inferSelect> = {};

async function placeDelivery(): Promise<Order> {
  const res = await call("/me/orders", customer, {
    method: "POST",
    body: {
      type: "delivery",
      addressId: address,
      payment: "card",
      items: [{ itemId: jollof, quantity: 1 }],
    },
  });
  expect(res.status).toBe(201);
  const { order } = await json<{ order: Order }>(res);
  made.push(order.id);
  return order;
}
const acknowledge = (id: string) => call(`/orders/${id}/acknowledge`, kitchen, { method: "POST" });
async function readyDelivery() {
  const o = await placeDelivery();
  await acknowledge(o.id);
  expect((await call(`/orders/${o.id}/ready`, kitchen, { method: "POST" })).status).toBe(200);
  return o;
}

async function cleanUp() {
  const { db, close } = await connect(env);
  const mine = await db
    .select({ id: t.order.id })
    .from(t.order)
    .where(eq(t.order.customerId, USER_ID));
  await deleteOrders(db, [...new Set([...mine.map((o) => o.id), ...made])]);
  await db.delete(t.address).where(eq(t.address.userId, USER_ID));
  await db.delete(t.neighbourhood).where(eq(t.neighbourhood.name, "Test area outside (lifecycle)"));
  await db.delete(t.customerProfile).where(eq(t.customerProfile.userId, USER_ID));
  await db.delete(t.user).where(eq(t.user.id, USER_ID));
  await close();
}

beforeAll(async () => {
  await cleanUp();
  const { db, close } = await connect(env);
  await db.insert(t.user).values({
    id: USER_ID,
    name: "Test Lifecycle (automated)",
    email: "test.lifecycle@example.com",
    emailVerified: true,
    username: USERNAME,
    displayUsername: USERNAME,
    role: "customer",
  });
  await db.insert(t.account).values({
    id: `credential-${USER_ID}`,
    accountId: USER_ID,
    providerId: "credential",
    userId: USER_ID,
    password: await hashPassword(DEMO_PASSWORD),
  });
  ugbowo = (await db.select().from(t.neighbourhood).where(eq(t.neighbourhood.name, "Ugbowo")))[0]!
    .id;
  outsideArea = (
    await db
      .insert(t.neighbourhood)
      .values({ name: "Test area outside (lifecycle)", inRange: false, sortOrder: 998 })
      .returning()
  )[0]!.id;
  const [s] = await db.select().from(t.setting).where(eq(t.setting.id, 1));
  saved = {
    onlineOpens: s!.onlineOpens,
    onlineCloses: s!.onlineCloses,
    walkinOpens: s!.walkinOpens,
    walkinCloses: s!.walkinCloses,
    paused: s!.paused,
    deliveryFee: s!.deliveryFee,
    riderPay: s!.riderPay,
    cancellationLimit: s!.cancellationLimit,
    alertSound: s!.alertSound,
    alertChime: s!.alertChime,
    alertRiderMin: s!.alertRiderMin,
    alertAcknowledgeMin: s!.alertAcknowledgeMin,
    alertKitchenMin: s!.alertKitchenMin,
    alertRoadMin: s!.alertRoadMin,
    alertsUpdatedAt: s!.alertsUpdatedAt,
    alertsUpdatedBy: s!.alertsUpdatedBy,
  };
  await db
    .update(t.setting)
    .set({
      onlineOpens: "00:00",
      onlineCloses: "23:59",
      walkinOpens: "00:00",
      walkinCloses: "23:59",
      paused: false,
    })
    .where(eq(t.setting.id, 1));
  await close();
  [customer, kitchen, dispatch, manager, musa, femi] = await Promise.all([
    signIn(USERNAME),
    signIn("blessing.k"),
    signIn("osas.d"),
    signIn("owner.m"),
    signIn("musa.a"),
    signIn("femi.r"),
  ]);
  const boot = await json<{ menu: { items: { id: string; name: string }[] }[] }>(
    await call("/bootstrap", ""),
  );
  const items = boot.menu.flatMap((c) => c.items);
  drink = items.find((i) => i.name === "Soft drink")!.id;
  jollof = items.find((i) => i.name === "Jollof rice")!.id;
});

afterAll(async () => {
  // Riders back offline, settings back as they were.
  await call("/rider/online", musa, { method: "PUT", body: { online: false } });
  await call("/rider/online", femi, { method: "PUT", body: { online: false } });
  await cleanUp();
  const { db, close } = await connect(env);
  await db.update(t.setting).set(saved).where(eq(t.setting.id, 1));
  await db.update(t.riderState).set({ online: false });
  await close();
});

describe("address book", () => {
  it("saves in-range addresses, refuses outside ones, and keeps a default", async () => {
    const home = {
      label: "Home",
      street: "2 Test Close",
      neighbourhoodId: ugbowo,
      contactPhone: "0803 123 4567",
      lat: 6.402,
      lng: 5.612,
    };
    const first = await call("/me/addresses", customer, { method: "POST", body: home });
    expect(first.status).toBe(201);
    const a = await json<{
      id: string;
      addresses: { id: string; isDefault: boolean; contactPhone: string }[];
    }>(first);
    address = a.id;
    expect(a.addresses[0]).toMatchObject({ isDefault: true, contactPhone: "08031234567" }); // the first is the default
    const far = await call("/me/addresses", customer, {
      method: "POST",
      body: { ...home, label: "Far", neighbourhoodId: outsideArea },
    });
    expect(far.status).toBe(409);
    expect(await json(far)).toMatchObject({ outsideRange: true });
    expect(
      (
        await call("/me/addresses", customer, {
          method: "POST",
          body: { ...home, contactPhone: "12345" },
        })
      ).status,
    ).toBe(400);
    const work = await json<{ id: string }>(
      await call("/me/addresses", customer, {
        method: "POST",
        body: { ...home, label: "Work", isDefault: true },
      }),
    );
    const list = await json<{ addresses: { id: string; isDefault: boolean }[] }>(
      await call("/me/addresses", customer),
    );
    expect(list.addresses.find((x) => x.isDefault)?.id).toBe(work.id);
    // Removing the default makes the other one the default.
    const after = await json<{ addresses: { id: string; isDefault: boolean }[] }>(
      await call(`/me/addresses/${work.id}`, customer, { method: "DELETE" }),
    );
    expect(after.addresses).toEqual([expect.objectContaining({ id: address, isDefault: true })]);
  });
});

describe("cancelling and refunds", () => {
  it("lets the customer cancel before the kitchen acknowledges, refunded in full", async () => {
    const o = await placeDelivery();
    expect(
      (
        await call(`/me/orders/${o.id}/cancel`, customer, {
          method: "POST",
          body: { reason: "Changed my mind" },
        })
      ).status,
    ).toBe(400); // no tick
    const res = await call(`/me/orders/${o.id}/cancel`, customer, {
      method: "POST",
      body: { reason: "Changed my mind", confirm: true },
    });
    expect(res.status).toBe(200);
    const { order } = await json<{ order: Order }>(res);
    expect(order.status).toBe("cancelled");
    expect(order.refunds).toEqual([
      expect.objectContaining({ amount: o.total, kind: "full", status: "completed" }),
    ]);
  });

  it("takes a request once acknowledged; dispatch approves it with the tick and is recorded", async () => {
    const o = await placeDelivery();
    await acknowledge(o.id);
    expect(
      (
        await call(`/me/orders/${o.id}/cancel`, customer, {
          method: "POST",
          body: { reason: "Too slow", confirm: true },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call(`/me/orders/${o.id}/cancellation-request`, customer, {
          method: "POST",
          body: { reason: "Too slow", confirm: true },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call(`/me/orders/${o.id}/cancellation-request`, customer, {
          method: "POST",
          body: { reason: "Again", confirm: true },
        })
      ).status,
    ).toBe(409);
    const { alerts } = await json<{
      alerts: {
        id: string;
        kind: string;
        requestId: string;
        order: { id: string };
        reason: string;
      }[];
    }>(await call("/alerts", dispatch));
    const alert = alerts.find((a) => a.order.id === o.id && a.kind === "cancellation_request")!;
    expect(alert.reason).toBe("Too slow");
    expect((await call(`/alerts/${alert.id}/clear`, dispatch, { method: "POST" })).status).toBe(
      409,
    ); // decide it instead
    expect(
      (
        await call(`/cancellation-requests/${alert.requestId}/approve`, dispatch, {
          method: "POST",
          body: {},
        })
      ).status,
    ).toBe(400);
    const res = await call(`/cancellation-requests/${alert.requestId}/approve`, dispatch, {
      method: "POST",
      body: { confirm: true },
    });
    expect(res.status).toBe(200);
    const { order } = await json<{ order: Order }>(res);
    expect(order.status).toBe("cancelled");
    expect(order.refunds![0]).toMatchObject({
      amount: o.total,
      by: { code: expect.stringMatching(/^D-\d{3}$/), role: "dispatch" },
    });
    const open = await json<{ alerts: { id: string }[] }>(await call("/alerts", dispatch));
    expect(open.alerts.map((a) => a.id)).not.toContain(alert.id);
  });

  it("declines a request, and lets managers refund part of an order", async () => {
    const o = await placeDelivery();
    await acknowledge(o.id);
    await call(`/me/orders/${o.id}/cancellation-request`, customer, {
      method: "POST",
      body: { reason: "Wrong order", confirm: true },
    });
    const detail = await json<{ order: Order }>(await call(`/orders/${o.id}`, manager));
    expect(
      (
        await call(
          `/cancellation-requests/${detail.order.cancellationRequest!.id}/decline`,
          dispatch,
          { method: "POST" },
        )
      ).status,
    ).toBe(200);
    const mine = await json<{ order: Order }>(await call(`/me/orders/${o.id}`, customer));
    expect(mine.order.cancellationRequest).toEqual({ status: "declined" });
    // A partial refund: not more than what's left; managers only.
    expect(
      (
        await call(`/orders/${o.id}/refunds`, manager, {
          method: "POST",
          body: { refund: { kind: "partial", amount: o.total }, reason: "Too much", confirm: true },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(`/orders/${o.id}/refunds`, kitchen, {
          method: "POST",
          body: { refund: { kind: "partial", amount: 500 }, reason: "Cold", confirm: true },
        })
      ).status,
    ).toBe(403);
    const r = await json<{ order: Order }>(
      await call(`/orders/${o.id}/refunds`, manager, {
        method: "POST",
        body: { refund: { kind: "partial", amount: 500 }, reason: "Arrived cold", confirm: true },
      }),
    );
    expect(r.order.refunds).toEqual([
      expect.objectContaining({
        amount: 500,
        kind: "partial",
        by: expect.objectContaining({ code: "M-001", role: "manager" }),
      }),
    ]);
  });

  it("flags an unavailable item, and kitchen staff cancel only walk-ins before Ready", async () => {
    const o = await placeDelivery();
    const flagged = await json<{ order: Order }>(
      await call(`/orders/${o.id}/item-unavailable`, kitchen, {
        method: "POST",
        body: { itemId: o.items[0]!.id },
      }),
    );
    expect(flagged.order.exception).toBe("item_unavailable");
    const { alerts } = await json<{ alerts: { kind: string; order: { id: string } }[] }>(
      await call("/alerts", manager),
    );
    expect(alerts.some((a) => a.kind === "item_unavailable" && a.order.id === o.id)).toBe(true);
    expect(
      (
        await call(`/orders/${o.id}/cancel`, kitchen, {
          method: "POST",
          body: { reason: "No rice", confirm: true },
        })
      ).status,
    ).toBe(403);
    const cancelled = await json<{ order: Order }>(
      await call(`/orders/${o.id}/cancel`, manager, {
        method: "POST",
        body: { reason: "No rice left", confirm: true },
      }),
    );
    expect(cancelled.order.status).toBe("cancelled");
    expect(cancelled.order.refunds![0]!.amount).toBe(o.total); // before pickup: everything, fee included

    const w = await json<{ order: Order }>(
      await call("/orders/walk-in", kitchen, {
        method: "POST",
        body: {
          type: "eat_in",
          items: [{ itemId: drink, quantity: 1 }],
          payment: { method: "cash", received: 500 },
        },
      }),
    );
    made.push(w.order.id);
    const wc = await json<{ order: Order }>(
      await call(`/orders/${w.order.id}/cancel`, kitchen, {
        method: "POST",
        body: { reason: "Customer left", confirm: true },
      }),
    );
    expect(wc.order.status).toBe("cancelled");
    expect(wc.order.refunds![0]).toMatchObject({
      amount: 500,
      by: expect.objectContaining({ role: "kitchen" }),
    });
  });
});

describe("partial refunds", () => {
  it("lets everyone who refunds type a partial amount, never more than 99% of what was paid", async () => {
    // Dispatch approving a cancellation request.
    const o = await placeDelivery();
    await acknowledge(o.id);
    await call(`/me/orders/${o.id}/cancellation-request`, customer, {
      method: "POST",
      body: { reason: "Late", confirm: true },
    });
    const req = (await json<{ order: Order }>(await call(`/orders/${o.id}`, manager))).order
      .cancellationRequest!;
    const cap = Math.floor(o.total * 0.99);
    const tooMuch = await call(`/cancellation-requests/${req.id}/approve`, dispatch, {
      method: "POST",
      body: { confirm: true, refund: { kind: "partial", amount: cap + 1 } },
    });
    expect(tooMuch.status).toBe(400);
    expect(await json(tooMuch)).toMatchObject({ error: expect.stringContaining("99%") });
    const ok = await json<{ order: Order }>(
      await call(`/cancellation-requests/${req.id}/approve`, dispatch, {
        method: "POST",
        body: { confirm: true, refund: { kind: "partial", amount: cap } },
      }),
    );
    expect(ok.order.status).toBe("cancelled");
    expect(ok.order.refunds![0]).toMatchObject({ amount: cap, kind: "partial" });

    // Kitchen staff cancelling a walk-in: ₦1,000 paid, so up to ₦990.
    const w = await json<{ order: Order }>(
      await call("/orders/walk-in", kitchen, {
        method: "POST",
        body: {
          type: "take_away",
          items: [{ itemId: drink, quantity: 2 }],
          payment: { method: "card" },
        },
      }),
    );
    made.push(w.order.id);
    expect(
      (
        await call(`/orders/${w.order.id}/cancel`, kitchen, {
          method: "POST",
          body: {
            reason: "Changed order",
            confirm: true,
            refund: { kind: "partial", amount: 991 },
          },
        })
      ).status,
    ).toBe(400);
    const wc = await json<{ order: Order }>(
      await call(`/orders/${w.order.id}/cancel`, kitchen, {
        method: "POST",
        body: { reason: "Changed order", confirm: true, refund: { kind: "partial", amount: 990 } },
      }),
    );
    expect(wc.order.refunds![0]).toMatchObject({ amount: 990, kind: "partial" });
    // Kitchen staff can't cancel without a refund.
    const w2 = await json<{ order: Order }>(
      await call("/orders/walk-in", kitchen, {
        method: "POST",
        body: {
          type: "eat_in",
          items: [{ itemId: drink, quantity: 1 }],
          payment: { method: "card" },
        },
      }),
    );
    made.push(w2.order.id);
    expect(
      (
        await call(`/orders/${w2.order.id}/cancel`, kitchen, {
          method: "POST",
          body: { reason: "x", confirm: true, refund: { kind: "none" } },
        })
      ).status,
    ).toBe(400);

    // Managers on any order; a full refund is still possible separately.
    const m = await placeDelivery();
    const full = await json<{ order: Order }>(
      await call(`/orders/${m.id}/refunds`, manager, {
        method: "POST",
        body: { refund: { kind: "full" }, reason: "Never arrived", confirm: true },
      }),
    );
    expect(full.order.refunds![0]).toMatchObject({ amount: m.total, kind: "full" });
    expect(
      (
        await call(`/orders/${m.id}/refunds`, manager, {
          method: "POST",
          body: { refund: { kind: "partial", amount: 100 }, reason: "Again", confirm: true },
        })
      ).status,
    ).toBe(409);
  });
});

describe("riders and deliveries", () => {
  it("shows the queue to online riders; one rider wins when two accept at once", async () => {
    expect((await json<{ online: boolean }>(await call("/rider/queue", musa))).online).toBe(false);
    await call("/rider/online", musa, { method: "PUT", body: { online: true } });
    await call("/rider/online", femi, { method: "PUT", body: { online: true } });
    const o = await readyDelivery();
    const q = await json<{ orders: { orderId: string; load: number; distanceM: number }[] }>(
      await call("/rider/queue", musa),
    );
    const card = q.orders.find((x) => x.orderId === o.id)!;
    expect(card.load).toBe(2);
    expect(card.distanceM).toBeGreaterThan(0);
    const [a, b] = await Promise.all([
      call(`/rider/queue/${o.id}/accept`, musa, { method: "POST" }),
      call(`/rider/queue/${o.id}/accept`, femi, { method: "POST" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? musa : femi;
    const loser = a.status === 200 ? femi : musa;
    const left = await json<{ orders: { orderId: string }[] }>(await call("/rider/queue", loser));
    expect(left.orders.map((x) => x.orderId)).not.toContain(o.id);
    // Can't go offline while carrying; releasing puts it back in the queue.
    expect(
      (await call("/rider/online", winner, { method: "PUT", body: { online: false } })).status,
    ).toBe(409);
    expect(
      (await call(`/rider/deliveries/${o.id}/release`, winner, { method: "POST" })).status,
    ).toBe(200);
    const back = await json<{ orders: { orderId: string }[] }>(await call("/rider/queue", loser));
    expect(back.orders.map((x) => x.orderId)).toContain(o.id);
  });

  it("picks up and delivers with the customer's code, and stores the rider's pay", async () => {
    const o = await readyDelivery();
    expect((await call(`/rider/queue/${o.id}/accept`, musa, { method: "POST" })).status).toBe(200);
    expect(
      (
        await call(`/rider/deliveries/${o.id}/deliver`, musa, {
          method: "POST",
          body: { code: "0000" },
        })
      ).status,
    ).toBe(409); // not picked up
    const picked = await json<{
      deliveries: { orderId: string; picked: boolean; phone: string; customerFirstName: string }[];
    }>(await call(`/rider/deliveries/${o.id}/picked-up`, musa, { method: "POST" }));
    expect(picked.deliveries.find((d) => d.orderId === o.id)).toMatchObject({
      picked: true,
      phone: "08031234567",
      customerFirstName: "Test",
    });
    const { order } = await json<{ order: Order }>(await call(`/me/orders/${o.id}`, customer));
    expect(order.status).toBe("picked_up");
    const wrong = order.deliveryCode === "0000" ? "1111" : "0000";
    const bad = await call(`/rider/deliveries/${o.id}/deliver`, musa, {
      method: "POST",
      body: { code: wrong },
    });
    expect(bad.status).toBe(400);
    expect(await json(bad)).toMatchObject({ attemptsLeft: 4 });
    expect(
      (
        await call(`/rider/deliveries/${o.id}/deliver`, musa, {
          method: "POST",
          body: { code: order.deliveryCode },
        })
      ).status,
    ).toBe(200);
    const done = await json<{ order: Order }>(await call(`/me/orders/${o.id}`, customer));
    expect(done.order.status).toBe("delivered");
    expect(done.order.deliveryCode).toBeNull(); // no longer shown once delivered
    const earnings = await json<{
      today: { n: number; pay: number };
      todaysDeliveries: { number: string; pay: number }[];
    }>(await call("/rider/earnings", musa));
    expect(earnings.todaysDeliveries).toContainEqual(
      expect.objectContaining({ number: o.number, pay: 1000 }),
    );
    // Rating once, after delivery.
    expect(
      (await call(`/me/orders/${o.id}/rating`, customer, { method: "POST", body: { stars: 5 } }))
        .status,
    ).toBe(201);
    expect(
      (await call(`/me/orders/${o.id}/rating`, customer, { method: "POST", body: { stars: 4 } }))
        .status,
    ).toBe(409);
  });

  it("shares the rider's position with the customer only while the order is on the way", async () => {
    type Mine = { rider: { firstName: string; stop: number; position: unknown } | null };
    const o = await readyDelivery();
    await call(`/rider/queue/${o.id}/accept`, musa, { method: "POST" });
    const at = async (lat: number, lng: number) =>
      json<{ tracking: boolean }>(
        await call("/rider/location", musa, { method: "PUT", body: { lat, lng } }),
      );
    // Accepted but not picked up: nothing is kept, and the customer sees the name only.
    expect(await at(6.402, 5.613)).toEqual({ tracking: false });
    const waiting = await json<{ order: Mine }>(await call(`/me/orders/${o.id}`, customer));
    expect(waiting.order.rider).toMatchObject({ firstName: "Musa", stop: 1, position: null });

    await call(`/rider/deliveries/${o.id}/picked-up`, musa, { method: "POST" });
    const cu = await live(customer);
    await cu.waitFor((m) => m.type === "hello");
    expect(await at(6.405, 5.612)).toEqual({ tracking: true });
    await cu.waitFor((m) => m.type === "rider-location" && m.orderId === o.id && m.lat === 6.405);
    const going = await json<{ order: Mine }>(await call(`/me/orders/${o.id}`, customer));
    expect(going.order.rider?.position).toMatchObject({ lat: 6.405, lng: 5.612 });

    // Milestones only: no position is taken or shown.
    await call("/settings", manager, { method: "PATCH", body: { trackingMode: "milestones" } });
    expect(await at(6.406, 5.611)).toEqual({ tracking: false });
    const hidden = await json<{ order: Mine }>(await call(`/me/orders/${o.id}`, customer));
    expect(hidden.order.rider?.position).toBeNull();
    await call("/settings", manager, { method: "PATCH", body: { trackingMode: "light" } });

    // Delivered: the position is gone.
    expect(await at(6.407, 5.61)).toEqual({ tracking: true });
    const { order } = await json<{ order: { deliveryCode: string } }>(
      await call(`/me/orders/${o.id}`, customer),
    );
    await call(`/rider/deliveries/${o.id}/deliver`, musa, {
      method: "POST",
      body: { code: order.deliveryCode },
    });
    const { db, close } = await connect(env);
    const [state] = await db
      .select({ lat: t.riderState.lat })
      .from(t.riderState)
      .innerJoin(t.user, eq(t.user.id, t.riderState.userId))
      .where(eq(t.user.username, "musa.a"));
    await close();
    expect(state?.lat).toBeNull();
    cu.ws.close();
  });

  it("lets dispatch assign a waiting order, and approve a manual completion after a help request", async () => {
    const o = await readyDelivery();
    expect(
      (
        await call(`/orders/${o.id}/assign`, dispatch, {
          method: "POST",
          body: { riderCode: "R-002" },
        })
      ).status,
    ).toBe(409); // offline
    const panel = await json<{ riders: { code: string; name: string; online: boolean }[] }>(
      await call("/riders", dispatch),
    );
    const femiCode = panel.riders.find((r) => r.name.startsWith("Femi"))!.code;
    expect(
      (
        await call(`/orders/${o.id}/assign`, dispatch, {
          method: "POST",
          body: { riderCode: femiCode },
        })
      ).status,
    ).toBe(200);
    const mine = await json<{ deliveries: { orderId: string; assignedByDispatch: boolean }[] }>(
      await call("/rider/deliveries", femi),
    );
    expect(mine.deliveries.find((d) => d.orderId === o.id)?.assignedByDispatch).toBe(true);
    await call(`/rider/deliveries/${o.id}/picked-up`, femi, { method: "POST" });
    expect(
      (
        await call(`/rider/deliveries/${o.id}/help`, femi, {
          method: "POST",
          body: { reason: "customer_unreachable" },
        })
      ).status,
    ).toBe(201);
    const { alerts } = await json<{
      alerts: { kind: string; requestId: string; order: { id: string }; rider: { code: string } }[];
    }>(await call("/alerts", dispatch));
    const help = alerts.find((a) => a.kind === "help_request" && a.order.id === o.id)!;
    expect(help.rider.code).toBe(femiCode);
    const res = await call(`/help-requests/${help.requestId}/resolve`, dispatch, {
      method: "POST",
      body: { resolution: "manual_completion" },
    });
    expect(res.status).toBe(200);
    expect((await json<{ order: Order }>(res)).order.status).toBe("delivered");
    // The rider's one call on reconnect: queue and deliveries.
    const back = await json<{ queue: unknown[]; deliveries: { orderId: string }[] }>(
      await call("/changes?since=0", femi),
    );
    expect(back.deliveries.map((d) => d.orderId)).not.toContain(o.id);
  });
});

describe("alerts and the live connection", () => {
  it("sends each change to the people who should see it", async () => {
    const k = await live(kitchen);
    const cu = await live(customer);
    const r = await live(musa);
    await k.waitFor((m) => m.type === "hello");
    const o = await placeDelivery();
    // The kitchen sees the new order, with the new-order chime (on by default); the customer sees
    // their own.
    await k.waitFor(
      (m) => m.type === "order" && (m.order as Order).id === o.id && m.chime === true,
    );
    await cu.waitFor((m) => m.type === "order" && (m.order as Order).id === o.id);
    await acknowledge(o.id);
    await cu.waitFor(
      (m) =>
        m.type === "order" &&
        (m.order as Order).id === o.id &&
        (m.order as Order).status === "acknowledged",
    );
    // Ready: online riders see it appear in the queue; taken: it disappears.
    await call(`/orders/${o.id}/ready`, kitchen, { method: "POST" });
    await r.waitFor((m) => m.type === "queue" && m.orderId === o.id && m.item !== null);
    await call(`/rider/queue/${o.id}/accept`, femi, { method: "POST" });
    await r.waitFor((m) => m.type === "queue" && m.orderId === o.id && m.item === null);
    // Riders never get customers' order messages.
    expect(r.got.some((m) => m.type === "order")).toBe(false);
    // The alert check is running while orders are open.
    expect(await env.LIVE_HUB.getByName("main").nextCheck()).not.toBeNull();
    // A menu change tells every app to fetch the menu again.
    await call(`/menu/items/${drink}/availability`, kitchen, {
      method: "PUT",
      body: { available: false },
    });
    await call(`/menu/items/${drink}/availability`, kitchen, {
      method: "PUT",
      body: { available: true },
    });
    await cu.waitFor((m) => m.type === "catalog");
    for (const x of [k, cu, r]) x.ws.close();
  });

  it("opens alerts for orders waiting too long, and marks them delayed", async () => {
    const waiting = await readyDelivery(); // ready, no rider
    const unseen = await placeDelivery(); // not acknowledged
    const { db, close } = await connect(env);
    const found = await scanAlerts(db, new Date(Date.now() + 10 * 60_000)); // ten minutes from now
    const open = await db
      .select()
      .from(t.alert)
      .where(inArray(t.alert.orderId, [waiting.id, unseen.id]));
    const [u] = await db.select().from(t.order).where(eq(t.order.id, unseen.id));
    await close();
    expect(open.find((a) => a.orderId === waiting.id)?.kind).toBe("unaccepted");
    expect(open.find((a) => a.orderId === unseen.id)?.kind).toBe("stuck");
    expect(found.orders).toContain(unseen.id);
    expect(u!.exception).toBe("delayed");
    // Both are new timer alerts, so they beep (the beep is on by default).
    const ids = open.map((a) => a.id);
    expect(found.beep).toEqual(expect.arrayContaining(ids));
    // A rider taking it clears the waiting alert on the next check.
    await call(`/rider/queue/${waiting.id}/accept`, musa, { method: "POST" });
    const { db: db2, close: close2 } = await connect(env);
    await scanAlerts(db2);
    const [a] = await db2.select().from(t.alert).where(eq(t.alert.orderId, waiting.id));
    await close2();
    expect(a!.clearedAt).not.toBeNull();
  });
});

describe("push notifications", () => {
  it("saves each device's token, announces each status once, and tells the right people", async () => {
    // Tokens that aren't real Expo tokens are never sent to Expo, so the tests send nothing.
    const tok = {
      customer: "test-push-customer-0001",
      rider: "test-push-musa-0001",
      kitchen: "test-push-kitchen-0001",
    };
    const save = (cookie: string, token: string, app: string, sound?: boolean) =>
      call("/me/push-token", cookie, { method: "PUT", body: { token, app, sound } });
    expect((await save(customer, tok.customer, "customer")).status).toBe(200);
    expect((await save(musa, tok.rider, "rider", false)).status).toBe(200);
    expect((await save(kitchen, tok.kitchen, "business")).status).toBe(200);
    expect((await save(customer, "test-push-wrong-app-01", "rider")).status).toBe(403);

    const { db, close } = await connect(env);
    try {
      await call("/rider/online", musa, { method: "PUT", body: { online: true } });
      const o = await placeDelivery();
      // The order route already announced "placed": asking again sends nothing.
      expect(await orderPushes(db, [o.id])).toEqual([]);
      // Pretend it wasn't announced: the customer and the kitchen hear about it.
      await db.update(t.order).set({ pushedStatus: null }).where(eq(t.order.id, o.id));
      const placed = await orderPushes(db, [o.id]);
      expect(placed).toContainEqual(
        expect.objectContaining({
          to: tok.customer,
          title: `Order ${o.number} placed`,
          channelId: "orders",
        }),
      );
      expect(placed).toContainEqual(
        expect.objectContaining({
          to: tok.kitchen,
          title: `New online order ${o.number}`,
          data: { open: "board", orderId: o.id },
        }),
      );

      // Ready: Musa (online, Sound off) hears about it on the quiet channel; Preparing isn't announced.
      await acknowledge(o.id);
      await call(`/orders/${o.id}/ready`, kitchen, { method: "POST" });
      await db.update(t.order).set({ pushedStatus: "preparing" }).where(eq(t.order.id, o.id));
      const ready = await orderPushes(db, [o.id]);
      expect(ready).toContainEqual(
        expect.objectContaining({
          to: tok.rider,
          title: "New order ready",
          channelId: "queue-quiet",
        }),
      );
      expect(ready.some((m) => m.to === tok.customer)).toBe(false); // "ready" isn't a customer push

      // Signing out on the device removes its token.
      expect(
        (await call("/me/push-token", musa, { method: "DELETE", body: { token: tok.rider } }))
          .status,
      ).toBe(200);
      const left = await db.select().from(t.pushToken).where(eq(t.pushToken.token, tok.rider));
      expect(left).toEqual([]);
    } finally {
      await db.delete(t.pushToken).where(eq(t.pushToken.token, tok.kitchen));
      await close();
    }
  });
});

describe("demo controls", () => {
  it("places practice orders, simulates only those to the end, and removes them on reset", async () => {
    expect(
      (await call("/demo/orders", kitchen, { method: "POST", body: { kind: "online" } })).status,
    ).toBe(403);
    const online = await json<{ order: { id: string; number: string } }>(
      await call("/demo/orders", manager, { method: "POST", body: { kind: "online" } }),
    );
    const walkin = await json<{ order: { id: string; number: string } }>(
      await call("/demo/orders", manager, { method: "POST", body: { kind: "walkin" } }),
    );
    const real = await placeDelivery();
    const { db, close } = await connect(env);
    try {
      // Each turn waits for the step's time; the test moves the clock by backdating instead.
      const ids = [online.order.id, walkin.order.id, real.id];
      for (let i = 0; i < 12; i++) {
        await db
          .update(t.orderStatusEvent)
          .set({ at: new Date(Date.now() - 600_000) })
          .where(inArray(t.orderStatusEvent.orderId, ids));
        await db
          .update(t.order)
          .set({ pickedUpAt: new Date(Date.now() - 600_000) })
          .where(eq(t.order.id, online.order.id));
        await stepPractice(db, 20);
      }
      const rows = await db
        .select({ id: t.order.id, status: t.order.status, practice: t.order.practice })
        .from(t.order)
        .where(inArray(t.order.id, ids));
      const status = (id: string) => rows.find((r) => r.id === id)!.status;
      expect(["delivered", "collected"]).toContain(status(online.order.id));
      expect(status(walkin.order.id)).toBe("collected");
      expect(status(real.id)).toBe("confirmed"); // a real order is never moved
      const reset = await json<{ removed: number }>(
        await call("/demo/reset", manager, { method: "POST" }),
      );
      expect(reset.removed).toBeGreaterThanOrEqual(2);
      const left = await db
        .select({ id: t.order.id })
        .from(t.order)
        .where(eq(t.order.practice, true));
      expect(left).toEqual([]);
    } finally {
      await close();
    }
  });
});

describe("settings", () => {
  it("lets dispatch pause orders but keeps pricing for managers, and audits price changes", async () => {
    expect(
      (await call("/settings", dispatch, { method: "PATCH", body: { paused: true } })).status,
    ).toBe(200);
    const closed = await call("/me/orders", customer, {
      method: "POST",
      body: { type: "pickup", payment: "card", items: [{ itemId: drink, quantity: 1 }] },
    });
    expect(closed.status).toBe(409);
    await call("/settings", dispatch, { method: "PATCH", body: { paused: false } });
    expect(
      (await call("/settings", dispatch, { method: "PATCH", body: { deliveryFee: 2000 } })).status,
    ).toBe(403);
    expect(
      (await call("/settings", manager, { method: "PATCH", body: { riderPay: 5000 } })).status,
    ).toBe(400); // more than the fee
    const before = await json<{ version: number }>(await call("/bootstrap", ""));
    const res = await json<{ settings: { deliveryFee: number } }>(
      await call("/settings", manager, { method: "PATCH", body: { deliveryFee: 1600 } }),
    );
    expect(res.settings.deliveryFee).toBe(1600);
    expect((await json<{ version: number }>(await call("/bootstrap", ""))).version).toBeGreaterThan(
      before.version,
    );
    const { db, close } = await connect(env);
    const logs = await db
      .select()
      .from(t.auditLog)
      .where(eq(t.auditLog.target, "setting:deliveryFee"));
    await db.update(t.setting).set({ deliveryFee: saved.deliveryFee! }).where(eq(t.setting.id, 1));
    await db
      .delete(t.auditLog)
      .where(inArray(t.auditLog.target, ["setting:deliveryFee", "setting:paused"]));
    await close();
    expect(logs.some((l) => l.kind === "money" && l.action.includes("1600"))).toBe(true);
  });
});

describe("alert settings", () => {
  const usual = { sound: true, chime: true, rider: 5, acknowledge: 5, kitchen: 15, road: 25 };
  it("saves the section in one go, within the ranges, and records who changed it", async () => {
    // Kitchen staff can't change them; dispatch and managers can.
    expect((await call("/settings/alerts", kitchen, { method: "PUT", body: usual })).status).toBe(
      403,
    );
    for (const bad of [
      { ...usual, rider: 4 },
      { ...usual, rider: 16 },
      { ...usual, acknowledge: 0 },
      { ...usual, acknowledge: 6 },
      { ...usual, kitchen: 9 },
      { ...usual, kitchen: 31 },
      { ...usual, road: 46 },
      { ...usual, road: 12.5 },
    ])
      expect((await call("/settings/alerts", dispatch, { method: "PUT", body: bad })).status).toBe(
        400,
      );
    const { db, close } = await connect(env);
    await db
      .update(t.setting)
      .set({
        alertSound: true,
        alertRiderMin: 5,
        alertAcknowledgeMin: 5,
        alertKitchenMin: 15,
        alertRoadMin: 25,
      })
      .where(eq(t.setting.id, 1));
    await close();
    const saved = await json<{
      changed: boolean;
      alerts: typeof usual & { updatedAt: string; updatedBy: { code: string } };
    }>(
      await call("/settings/alerts", dispatch, {
        method: "PUT",
        body: { ...usual, sound: false, rider: 10, acknowledge: 1 },
      }),
    );
    expect(saved.changed).toBe(true);
    expect(saved.alerts).toMatchObject({ sound: false, rider: 10, acknowledge: 1, kitchen: 15 });
    expect(saved.alerts.updatedBy.code).toBe("D-001");
    expect(Date.now() - new Date(saved.alerts.updatedAt).getTime()).toBeLessThan(60_000);
    // Saving the same again changes nothing and writes nothing.
    const again = await json<{ changed: boolean }>(
      await call("/settings/alerts", manager, {
        method: "PUT",
        body: { ...usual, sound: false, rider: 10, acknowledge: 1 },
      }),
    );
    expect(again.changed).toBe(false);
    const got = await json<{ alerts: { rider: number; updatedBy: { code: string } } }>(
      await call("/settings", manager),
    );
    expect(got.alerts.rider).toBe(10);
    expect(got.alerts.updatedBy.code).toBe("D-001");
    const { db: db2, close: close2 } = await connect(env);
    const logs = await db2.select().from(t.auditLog).where(eq(t.auditLog.target, "setting:alerts"));
    await db2.delete(t.auditLog).where(eq(t.auditLog.target, "setting:alerts"));
    await close2();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe(
      "Changed the alert settings: turned the beep off, waiting for a rider from 5 to 10 minutes, not acknowledged from 5 to 1 minute",
    );
  });

  it("opens alerts at the saved times, and doesn't beep when the beep is off", async () => {
    // From the test above: the beep is off, not acknowledged after 1 minute, a rider after 10.
    const unseen = await placeDelivery();
    const waiting = await readyDelivery();
    const { db, close } = await connect(env);
    const soon = await scanAlerts(db, new Date(Date.now() + 2 * 60_000)); // two minutes from now
    const opened = await db
      .select()
      .from(t.alert)
      .where(inArray(t.alert.orderId, [unseen.id, waiting.id]));
    await close();
    // Not acknowledged after 2 minutes: alert. Ready 2 minutes with no rider: not yet (10).
    expect(opened.map((a) => a.orderId)).toEqual([unseen.id]);
    expect(soon.beep).toEqual([]);
    // Cleared by hand, it stays cleared: the next checks don't open it again in the same stage.
    expect(
      (await call(`/alerts/${opened[0]!.id}/clear`, dispatch, { method: "POST" })).status,
    ).toBe(200);
    const { db: db2, close: close2 } = await connect(env);
    await scanAlerts(db2, new Date(Date.now() + 3 * 60_000));
    const after = await db2.select().from(t.alert).where(eq(t.alert.orderId, unseen.id));
    // Waiting for a rider after 11 minutes: now it opens.
    await scanAlerts(db2, new Date(Date.now() + 11 * 60_000));
    const rider = await db2.select().from(t.alert).where(eq(t.alert.orderId, waiting.id));
    await close2();
    expect(after).toHaveLength(1);
    expect(after[0]!.clearedAt).not.toBeNull();
    expect(rider.map((a) => a.kind)).toEqual(["unaccepted"]);
  });
});

describe("repeat cancellations", () => {
  it("allows only a request after the limit in 7 days", async () => {
    const { db, close } = await connect(env);
    await db.update(t.setting).set({ cancellationLimit: 3 }).where(eq(t.setting.id, 1));
    await close();
    // This customer already cancelled 3 orders above (themself once, dispatch once, the manager once).
    const o = await placeDelivery();
    const res = await call(`/me/orders/${o.id}/cancel`, customer, {
      method: "POST",
      body: { reason: "Again", confirm: true },
    });
    expect(res.status).toBe(409);
    expect(await json(res)).toMatchObject({ mustRequest: true });
  });
});
