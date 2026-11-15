import { env, exports } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth/password";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { deleteOrders } from "./cleanup";
import { DEMO_PASSWORD, signIn } from "./session";

// Orders (architecture.md 4, 4.5, 4.6, 4.8, 14.4) and menu management (MGR-05, MGR-07, KIT-08).
// Customers sign in with Google, which a test can't do, so this makes a throwaway customer with a
// password and two addresses, opens the hours for the day, and puts everything back at the end.
const USER_ID = "test-orders-customer";
const USERNAME = "test.orders";

type Order = {
  id: string;
  number: string;
  status: string;
  total: number;
  deliveryFee: number;
  deliveryCode?: string | null;
  canCancel?: boolean;
  items: { id: string; name: string; unitPrice: number; quantity: number; options: string[] }[];
  events?: { status: string; by?: { kind: string; code?: string } }[];
  customer?: { code: string; phone?: string } | null;
  payment?: { changeDue: number | null } | null;
};

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

let customer = "";
let kitchen = "";
let manager = "";
let accounts = "";
let rider = "";
let inRangeAddress = "";
let outsideAddress = "";
let outsideArea = "";
let savedHours: Partial<typeof t.setting.$inferSelect> = {};
const made: string[] = []; // orders this test placed
let testItem = "";
let jollof = { id: "", options: [] as { id: string; name: string }[] };
let drink = "";
let soupDish = "";

async function cleanUp() {
  const { db, close } = await connect(env);
  const mine = await db
    .select({ id: t.order.id })
    .from(t.order)
    .where(eq(t.order.customerId, USER_ID));
  const ids = [...new Set([...mine.map((o) => o.id), ...made])];
  await deleteOrders(db, ids);
  await db.delete(t.address).where(eq(t.address.userId, USER_ID));
  await db.delete(t.neighbourhood).where(eq(t.neighbourhood.name, "Test area outside range"));
  await db.delete(t.customerProfile).where(eq(t.customerProfile.userId, USER_ID));
  await db.delete(t.user).where(eq(t.user.id, USER_ID));
  if (testItem) {
    await db.delete(t.itemOption).where(eq(t.itemOption.itemId, testItem));
    await db.delete(t.menuItem).where(eq(t.menuItem.id, testItem));
  }
  await close();
}

beforeAll(async () => {
  await cleanUp();
  const { db, close } = await connect(env);
  await db.insert(t.user).values({
    id: USER_ID,
    name: "Test Orders (automated)",
    email: "test.orders@example.com",
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
  const [ugbowo] = await db
    .select()
    .from(t.neighbourhood)
    .where(eq(t.neighbourhood.name, "Ugbowo"));
  const [outside] = await db
    .insert(t.neighbourhood)
    .values({ name: "Test area outside range", inRange: false, sortOrder: 999 })
    .returning();
  outsideArea = outside!.id;
  const [a1] = await db
    .insert(t.address)
    .values({
      userId: USER_ID,
      label: "Home",
      street: "1 Test Street",
      neighbourhoodId: ugbowo!.id,
      contactPhone: "08000000001",
      lat: 6.4,
      lng: 5.6,
    })
    .returning();
  const [a2] = await db
    .insert(t.address)
    .values({
      userId: USER_ID,
      label: "Far away",
      neighbourhoodId: outsideArea,
      contactPhone: "08000000001",
      lat: 6.9,
      lng: 5.9,
    })
    .returning();
  inRangeAddress = a1!.id;
  outsideAddress = a2!.id;
  // Open the online and walk-in hours all day for the test, and remember the real ones.
  const [s] = await db.select().from(t.setting).where(eq(t.setting.id, 1));
  savedHours = {
    onlineOpens: s!.onlineOpens,
    onlineCloses: s!.onlineCloses,
    walkinOpens: s!.walkinOpens,
    walkinCloses: s!.walkinCloses,
    paused: s!.paused,
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

  customer = await signIn(USERNAME);
  kitchen = await signIn("blessing.k");
  manager = await signIn("owner.m");
  accounts = await signIn("ngozi.a");
  rider = await signIn("chidi.r");

  const boot = await json<{
    menu: {
      items: {
        id: string;
        name: string;
        isSoup: boolean;
        options: { id: string; name: string }[];
      }[];
    }[];
  }>(await call("/bootstrap", ""));
  const items = boot.menu.flatMap((cat) => cat.items);
  const j = items.find((i) => i.name === "Jollof rice")!;
  jollof = { id: j.id, options: j.options };
  drink = items.find((i) => i.name === "Soft drink")!.id;
  soupDish = items.find((i) => i.name === "Soup of the day")!.id;
});

afterAll(async () => {
  const { db, close } = await connect(env);
  await db.update(t.setting).set(savedHours).where(eq(t.setting.id, 1));
  await close();
  await cleanUp();
});

describe("menu management", () => {
  it("adds, edits, marks sold out, and archives an item", async () => {
    const boot = await json<{ version: number; menu: { id: string; name: string }[] }>(
      await call("/bootstrap", ""),
    );
    const snacks = boot.menu.find((c) => c.name === "Snacks")!;
    // Kitchen staff can't add items; managers can.
    const item = {
      categoryId: snacks.id,
      name: "Test puff-puff",
      price: 400,
      station: "snacks_and_drinks",
      load: 1,
      options: [
        { name: "Small", priceChange: 0 },
        { name: "Large", priceChange: 200 },
      ],
    };
    expect((await call("/menu/items", kitchen, { method: "POST", body: item })).status).toBe(403);
    const added = await call("/menu/items", manager, { method: "POST", body: item });
    expect(added.status).toBe(201);
    const { item: saved } = await json<{
      item: { id: string; options: { name: string; isDefault: boolean }[] };
    }>(added);
    testItem = saved.id;
    expect(saved.options.find((o) => o.isDefault)?.name).toBe("Small"); // the first is the default
    // A price change is audit-logged.
    expect(
      (await call(`/menu/items/${testItem}`, manager, { method: "PATCH", body: { price: 450 } }))
        .status,
    ).toBe(200);
    const { db, close } = await connect(env);
    const logs = await db
      .select()
      .from(t.auditLog)
      .where(eq(t.auditLog.target, `item:${testItem}`));
    await close();
    expect(logs.some((l) => l.action.includes("from ₦400 to ₦450"))).toBe(true);
    // Kitchen staff mark it sold out; the menu version goes up so apps fetch it again.
    const sold = await call(`/menu/items/${testItem}/availability`, kitchen, {
      method: "PUT",
      body: { available: false },
    });
    expect(sold.status).toBe(200);
    const after = await json<{ version: number }>(await call("/bootstrap", ""));
    expect(after.version).toBeGreaterThan(boot.version);
    // A sold-out item can't be ordered.
    const refused = await call("/me/orders", customer, {
      method: "POST",
      body: { type: "pickup", payment: "card", items: [{ itemId: testItem, quantity: 1 }] },
    });
    expect(refused.status).toBe(409);
    // Taking it off the menu archives it.
    expect((await call(`/menu/items/${testItem}`, manager, { method: "DELETE" })).status).toBe(200);
    const gone = await json<{ menu: { items: { id: string }[] }[] }>(await call("/bootstrap", ""));
    expect(gone.menu.flatMap((c) => c.items).some((i) => i.id === testItem)).toBe(false);
  });
});

describe("online orders", () => {
  let delivery: Order;
  let pickup: Order;

  it("prices the order on the server and confirms the demo payment", async () => {
    const res = await call("/me/orders", customer, {
      method: "POST",
      body: {
        type: "delivery",
        addressId: inRangeAddress,
        payment: "card",
        items: [
          { itemId: jollof.id, quantity: 2 },
          { itemId: drink, quantity: 1 },
        ],
      },
    });
    expect(res.status).toBe(201);
    delivery = (await json<{ order: Order }>(res)).order;
    made.push(delivery.id);
    expect(delivery.number).toMatch(/^O-\d{4,}$/);
    expect(delivery.status).toBe("confirmed");
    // Jollof rice (₦2,000) with chicken, the default (+₦1,800), twice, a soft drink, and the fee.
    const line = delivery.items.find((i) => i.name === "Jollof rice")!;
    expect(line.unitPrice).toBe(3800);
    expect(line.options).toEqual(["Chicken"]);
    expect(delivery.deliveryFee).toBe(1500);
    expect(delivery.total).toBe(3800 * 2 + 500 + 1500);
    expect(delivery.deliveryCode).toMatch(/^\d{4}$/);
    expect(delivery.canCancel).toBe(true);
    // The same code every time the customer opens tracking.
    const again = await json<{ order: Order }>(await call(`/me/orders/${delivery.id}`, customer));
    expect(again.order.deliveryCode).toBe(delivery.deliveryCode);
  });

  it("refuses an address outside the range, and orders for pickup without a fee or code", async () => {
    const far = await call("/me/orders", customer, {
      method: "POST",
      body: {
        type: "delivery",
        addressId: outsideAddress,
        payment: "transfer",
        items: [{ itemId: drink, quantity: 1 }],
      },
    });
    expect(far.status).toBe(409);
    expect(await json(far)).toMatchObject({ outsideRange: true });
    const res = await call("/me/orders", customer, {
      method: "POST",
      body: {
        type: "pickup",
        payment: "transfer",
        items: [{ itemId: soupDish, quantity: 1, optionId: undefined }],
      },
    });
    expect(res.status).toBe(201);
    pickup = (await json<{ order: Order }>(res)).order;
    made.push(pickup.id);
    expect(pickup.deliveryFee).toBe(0);
    expect(pickup.deliveryCode).toBeNull();
    expect(pickup.items[0]!.name).toMatch(/^Soup of the day \(.+\)$/); // takes today's soup
  });

  it("moves through the kitchen's steps, recorded against the person signed in", async () => {
    // The board shows it; customers and riders can't open the board.
    const board = await json<{ orders: Order[] }>(await call("/orders/board", kitchen));
    expect(board.orders.some((o) => o.id === delivery.id)).toBe(true);
    expect((await call("/orders/board", customer)).status).toBe(403);
    expect((await call("/orders/board", rider)).status).toBe(403);
    // Items can't be ticked before the order is acknowledged.
    const line = delivery.items[0]!;
    expect(
      (
        await call(`/orders/${delivery.id}/items/${line.id}`, kitchen, {
          method: "PUT",
          body: { ticked: true },
        })
      ).status,
    ).toBe(409);
    expect(
      (await call(`/orders/${delivery.id}/acknowledge`, kitchen, { method: "POST" })).status,
    ).toBe(200);
    expect(
      (await call(`/orders/${delivery.id}/acknowledge`, kitchen, { method: "POST" })).status,
    ).toBe(409);
    const ticked = await json<{ order: Order }>(
      await call(`/orders/${delivery.id}/items/${line.id}`, kitchen, {
        method: "PUT",
        body: { ticked: true },
      }),
    );
    expect(ticked.order.status).toBe("preparing"); // the first tick
    const ready = await json<{ order: Order }>(
      await call(`/orders/${delivery.id}/ready`, kitchen, { method: "POST" }),
    );
    expect(ready.order.status).toBe("ready"); // a delivery waits for a rider
    const acknowledged = ready.order.events!.find((e) => e.status === "acknowledged")!;
    expect(acknowledged.by).toMatchObject({
      kind: "staff",
      code: expect.stringMatching(/^K-\d{3}$/),
    });
    // Once acknowledged, the customer can no longer cancel on their own (4.6).
    const tracking = await json<{ order: Order }>(
      await call(`/me/orders/${delivery.id}`, customer),
    );
    expect(tracking.order.canCancel).toBe(false);

    // Pickup: ready for collection, then collected.
    await call(`/orders/${pickup.id}/acknowledge`, kitchen, { method: "POST" });
    const p = await json<{ order: Order }>(
      await call(`/orders/${pickup.id}/ready`, kitchen, { method: "POST" }),
    );
    expect(p.order.status).toBe("ready_for_collection");
    const done = await json<{ order: Order }>(
      await call(`/orders/${pickup.id}/collected`, kitchen, { method: "POST" }),
    );
    expect(done.order.status).toBe("collected");
  });

  it("shows the customer's phone only to dispatch and managers, and keeps orders private", async () => {
    const forKitchen = await json<{ order: Order }>(await call(`/orders/${delivery.id}`, kitchen));
    expect(forKitchen.order.customer).toEqual({
      code: expect.stringMatching(/^C-\d{5}$/),
      name: expect.any(String),
    });
    const forManager = await json<{ order: Order }>(await call(`/orders/${delivery.id}`, manager));
    expect(forManager.order.customer?.phone).toBe("08000000001");
    const mine = await json<{ orders: Order[] }>(await call("/me/orders?tab=progress", customer));
    expect(mine.orders.map((o) => o.id)).toContain(delivery.id);
    const history = await json<{ orders: Order[] }>(await call("/me/orders?tab=history", customer));
    expect(history.orders.map((o) => o.id)).toContain(pickup.id);
    expect((await call(`/me/orders/${crypto.randomUUID()}`, customer)).status).toBe(404);
  });
});

describe("walk-in orders", () => {
  it("takes cash with the change due, and numbers the order for the counter", async () => {
    const body = (received: number) => ({
      type: "take_away",
      label: "Bisi",
      items: [{ itemId: drink, quantity: 2 }],
      payment: { method: "cash", received },
    });
    expect(
      (await call("/orders/walk-in", kitchen, { method: "POST", body: body(500) })).status,
    ).toBe(400); // less than ₦1,000
    const res = await call("/orders/walk-in", kitchen, { method: "POST", body: body(2000) });
    expect(res.status).toBe(201);
    const { order } = await json<{ order: Order }>(res);
    made.push(order.id);
    expect(order.number).toMatch(/^W-\d{3}$/);
    expect(order.total).toBe(1000);
    expect(order.payment?.changeDue).toBe(1000);
    expect(
      (await call("/orders/walk-in", customer, { method: "POST", body: body(2000) })).status,
    ).toBe(403);

    // The order list: by channel and by number, with the count and value; accounts can see it.
    const list = await json<{ orders: { id: string }[]; count: number; totalValue: number }>(
      await call("/orders?channel=walkin", manager),
    );
    expect(list.orders.some((o) => o.id === order.id)).toBe(true);
    expect(list.totalValue).toBeGreaterThanOrEqual(1000);
    const byNumber = await json<{ orders: { id: string }[] }>(
      await call(`/orders?q=${order.number}`, accounts),
    );
    expect(byNumber.orders.map((o) => o.id)).toContain(order.id);
    expect((await call("/orders", kitchen)).status).toBe(403);
  });
});

describe("changes since the last update", () => {
  it("returns only what changed, and a customer only their own orders", async () => {
    const { latest } = await json<{ latest: number }>(await call("/orders/board", kitchen));
    const res = await call("/orders/walk-in", kitchen, {
      method: "POST",
      body: {
        type: "eat_in",
        items: [{ itemId: drink, quantity: 1 }],
        payment: { method: "card" },
      },
    });
    const { order } = await json<{ order: Order }>(res);
    made.push(order.id);
    const changed = await json<{ orders: { id: string }[]; latest: number; reload: boolean }>(
      await call(`/changes?since=${latest}`, kitchen),
    );
    expect(changed.orders.map((o) => o.id)).toEqual([order.id]);
    expect(changed.latest).toBeGreaterThan(latest);
    // Nothing new after that.
    const none = await json<{ orders: unknown[] }>(
      await call(`/changes?since=${changed.latest}`, kitchen),
    );
    expect(none.orders).toEqual([]);
    // The customer doesn't see the walk-in.
    const forCustomer = await json<{ orders: { id: string }[] }>(
      await call(`/changes?since=${latest}`, customer),
    );
    expect(forCustomer.orders.map((o) => o.id)).not.toContain(order.id);
  });
});

describe("opening hours", () => {
  it("refuses online orders outside the hours, with when they open", async () => {
    const { db, close } = await connect(env);
    // A one-minute window in the small hours, so it is closed whenever the test runs (except then).
    await db
      .update(t.setting)
      .set({ onlineOpens: "03:00", onlineCloses: "03:01" })
      .where(eq(t.setting.id, 1));
    const res = await call("/me/orders", customer, {
      method: "POST",
      body: { type: "pickup", payment: "card", items: [{ itemId: drink, quantity: 1 }] },
    });
    await db
      .update(t.setting)
      .set({ onlineOpens: "00:00", onlineCloses: "23:59" })
      .where(eq(t.setting.id, 1));
    await close();
    expect(res.status).toBe(409);
    expect(await json(res)).toMatchObject({
      error: "Online orders are open from 3:00 am to 3:01 am",
    });
  });
});
