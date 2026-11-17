import { env, exports } from "cloudflare:workers";
import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { watNow } from "../src/orders/clock";
import { signIn } from "./session";

// Reports, rider pay, the cash-up, and Finance (MGR-17 to MGR-22, MGR-30, ACC-02 to ACC-07),
// against the seeded three months of history. Anything a test changes is put back.

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

let manager = "";
let accounts = "";
let kitchen = "";
const today = watNow().date;
const month = today.slice(0, 7);

beforeAll(async () => {
  [manager, accounts, kitchen] = await Promise.all([
    signIn("owner.m"),
    signIn("ngozi.a"),
    signIn("blessing.k"),
  ]);
});

afterAll(async () => {
  const { db, close } = await connect(env);
  try {
    await db.delete(t.cashUp).where(eq(t.cashUp.businessDate, today));
    await db
      .delete(t.auditLog)
      .where(and(eq(t.auditLog.isDemo, false), like(t.auditLog.target, `cash-up:${today}`)));
    await db.delete(t.adjustment).where(like(t.adjustment.reason, "Test adjustment%"));
    await db.delete(t.auditLog).where(like(t.auditLog.action, "%Test adjustment%"));
  } finally {
    await close();
  }
});

describe("reports", () => {
  it("works out the figures for a range from the records, for managers and account officers", async () => {
    const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    expect((await call(`/reports/summary?from=${from}&to=${today}`, kitchen)).status).toBe(403);
    expect((await call(`/reports/summary?from=${today}&to=${from}`, manager)).status).toBe(400);
    const r = await json<{
      days: number;
      orders: { total: number; online: number; walkin: number; perDay: unknown[] };
      sales: { total: number; cash: number; card: number; transfer: number };
      riders: { code: string }[];
      areas: unknown[];
    }>(await call(`/reports/summary?from=${from}&to=${today}&channel=all`, accounts));
    expect(r.days).toBe(7);
    expect(r.orders.perDay).toHaveLength(7);
    expect(r.orders.total).toBe(r.orders.online + r.orders.walkin);
    expect(r.sales.total).toBe(r.sales.cash + r.sales.card + r.sales.transfer);
    // Every rider is listed, even with no deliveries (MGR-20).
    expect(r.riders.map((x) => x.code)).toEqual(expect.arrayContaining(["R-001", "R-004"]));
    expect(r.areas.length).toBeGreaterThan(0);
    const walkin = await json<{ orders: { online: number } }>(
      await call(`/reports/summary?from=${from}&to=${today}&channel=walkin`, manager),
    );
    expect(walkin.orders.online).toBe(0);
    const refunds = await json<{ refunds: { orderNo: string }[] }>(
      await call(`/reports/refunds?from=2026-01-01&to=${today}`, manager),
    );
    expect(Array.isArray(refunds.refunds)).toBe(true);
  });
});

describe("rider pay", () => {
  it("shows each rider's owed balance and records a payout once", async () => {
    expect((await call("/payouts", kitchen)).status).toBe(403);
    const before = await json<{
      riders: { code: string; owed: number }[];
      history: unknown[];
    }>(await call("/payouts", accounts));
    expect(before.riders.map((r) => r.code)).toContain("R-001");
    const musa = before.riders.find((r) => r.code === "R-001")!;
    const res = await call("/payouts/R-001/pay", accounts, { method: "POST" });
    if (musa.owed > 0) {
      expect(res.status).toBe(201);
      const after = await json<{ riders: { code: string; owed: number }[] }>(
        await call("/payouts", accounts),
      );
      expect(after.riders.find((r) => r.code === "R-001")!.owed).toBe(0);
    }
    // Nothing is owed any more, so a second payout is refused.
    expect((await call("/payouts/R-001/pay", accounts, { method: "POST" })).status).toBe(409);
    expect((await call("/payouts/X-999/pay", accounts, { method: "POST" })).status).toBe(409);
  });
});

describe("cash-up and Finance", () => {
  it("counts the drawer, needs a note for a difference, and locks once signed off", async () => {
    const c = await json<{ expected: number; counted: number | null }>(
      await call("/finance/cash-up/today", kitchen),
    );
    expect(c.expected).toBeGreaterThanOrEqual(0);
    expect(
      (await call("/finance/cash-up/today", kitchen, { method: "PUT", body: { counted: -5 } }))
        .status,
    ).toBe(400);
    expect(
      (
        await call("/finance/cash-up/today", kitchen, {
          method: "PUT",
          body: { counted: c.expected + 500 },
        })
      ).status,
    ).toBe(200);
    // Kitchen staff count; they don't sign off.
    expect(
      (await call(`/finance/cash-ups/${today}/sign-off`, kitchen, { method: "POST", body: {} }))
        .status,
    ).toBe(403);
    const noNote = await call(`/finance/cash-ups/${today}/sign-off`, accounts, {
      method: "POST",
      body: { note: null },
    });
    expect(noNote.status).toBe(409);
    expect(
      (
        await call(`/finance/cash-ups/${today}/sign-off`, accounts, {
          method: "POST",
          body: { note: "₦500 over: change from yesterday" },
        })
      ).status,
    ).toBe(200);
    expect(
      (await call("/finance/cash-up/today", kitchen, { method: "PUT", body: { counted: 1 } }))
        .status,
    ).toBe(409);
    const list = await json<{ cashUps: { date: string; signedOffBy: string | null }[] }>(
      await call(`/finance/cash-ups?month=${month}`, manager),
    );
    expect(list.cashUps.find((x) => x.date === today)?.signedOffBy).toBe("A-001");
  });

  it("shows the statement, keeps closed months locked, and records adjustments", async () => {
    expect((await call(`/finance/statement?month=${month}`, kitchen)).status).toBe(403);
    const open = await json<{
      statement: { sales: number; net: number; refunds: number; riderPayEarned: number };
      closed: unknown;
      months: string[];
      canClose: boolean;
    }>(await call(`/finance/statement?month=${month}`, accounts));
    expect(open.closed).toBeNull();
    expect(open.canClose).toBe(false); // still running
    expect(open.months[0]).toBe(month);
    // The month before is closed in the history: its saved figures, and it can't close again.
    const prev = open.months[1]!;
    const closed = await json<{ closed: { by: string } | null; statement: { net: number } }>(
      await call(`/finance/statement?month=${prev}`, manager),
    );
    expect(closed.closed).not.toBeNull();
    expect((await call(`/finance/months/${prev}/close`, manager, { method: "POST" })).status).toBe(
      409,
    );
    expect((await call(`/finance/months/${month}/close`, manager, { method: "POST" })).status).toBe(
      409,
    );
    const adj = await call("/finance/adjustments", accounts, {
      method: "POST",
      body: { amount: 700, reason: "Test adjustment: cash found later" },
    });
    expect(adj.status).toBe(201);
    const after = await json<{ statement: { net: number; adjustments: number } }>(
      await call(`/finance/statement?month=${month}`, accounts),
    );
    expect(after.statement.net - open.statement.net).toBe(700);
    const audit = await json<{ entries: { action: string; who: string | null }[] }>(
      await call(`/finance/audit?from=${today}&to=${today}&kind=money`, manager),
    );
    expect(
      audit.entries.some((e) => e.action.includes("Test adjustment") && e.who === "A-001"),
    ).toBe(true);
  });
});
