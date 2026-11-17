import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { watNow } from "../orders/clock";
import type { Tx } from "../orders/store";

// Money for record keeping (architecture.md 18.2, ACC-02 to ACC-07, MGR-30): rider pay and
// payouts, the daily cash-up, the monthly statement, closing a month, adjustments, and the audit
// trail. Everything is simulated: "paid" is a status, and no money moves. Figures are worked out
// by the database from the real records, so the Worker stays inside its 10 ms (14.2).

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const n = (v: unknown) => Number(v ?? 0);

async function rows<T>(db: Db | Tx, q: SQL): Promise<T[]> {
  return (await db.execute(q)).rows as T[];
}

const addDays = (day: string, k: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);
const monthEnd = (month: string) => addDays(`${addMonth(month, 1)}-01`, -1);
export const addMonth = (month: string, k: number) => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + k, 1));
  return d.toISOString().slice(0, 7);
};

/* ---------- rider pay (MGR-30, ACC-02) ---------- */

export type RiderPayView = {
  rate: number;
  riders: {
    code: string;
    name: string;
    active: boolean;
    owed: number;
    owedDeliveries: number;
    today: number;
    /** The first day not yet paid for. */
    since: string | null;
  }[];
  history: {
    code: string;
    name: string;
    periodStart: string;
    periodEnd: string;
    deliveries: number;
    amount: number;
    paidAt: string;
    paidBy: string | null;
  }[];
};

/**
 * Each rider's owed balance: delivered orders after the last day a paid payout covers. Weekly
 * payouts in the history end on Sundays; a payout made here covers everything up to today.
 */
export async function riderPay(db: Db): Promise<RiderPayView> {
  const today = watNow().date;
  const [s] = await rows<{ rate: unknown }>(
    db,
    sql`select rider_pay as rate from setting where id = 1`,
  );
  const riders = await rows<Record<string, unknown>>(
    db,
    sql`with paid as (
        select rider_id, max(period_end) as through from payout where status = 'paid' group by rider_id
      )
      select sp.code, sp.full_name as name, sp.status,
        to_char(p.through + 1, 'YYYY-MM-DD') as since,
        count(d.id) as owed_deliveries, coalesce(sum(d.rider_pay), 0) as owed,
        count(d.id) filter (where (d.delivered_at at time zone 'Africa/Lagos')::date = ${today}::date) as today
      from staff_profile sp
      left join paid p on p.rider_id = sp.user_id
      left join delivery d on d.rider_id = sp.user_id and d.delivered_at is not null
        and (p.through is null or (d.delivered_at at time zone 'Africa/Lagos')::date > p.through)
      where sp.role = 'rider'
      group by sp.code, sp.full_name, sp.status, p.through
      order by sp.code`,
  );
  const history = await rows<Record<string, unknown>>(
    db,
    sql`select sp.code, sp.full_name as name, to_char(p.period_start, 'YYYY-MM-DD') as start,
        to_char(p.period_end, 'YYYY-MM-DD') as "end", p.deliveries, p.amount, p.paid_at,
        payer.code as paid_by
      from payout p
      join staff_profile sp on sp.user_id = p.rider_id
      left join staff_profile payer on payer.user_id = p.paid_by
      where p.status = 'paid'
      order by p.paid_at desc limit 40`,
  );
  return {
    rate: n(s?.rate),
    riders: riders.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      active: r.status === "active",
      owed: n(r.owed),
      owedDeliveries: n(r.owed_deliveries),
      today: n(r.today),
      since: (r.since as string | null) ?? null,
    })),
    history: history.map((h) => ({
      code: String(h.code),
      name: String(h.name),
      periodStart: String(h.start),
      periodEnd: String(h.end),
      deliveries: n(h.deliveries),
      amount: n(h.amount),
      paidAt: new Date(h.paid_at as string).toISOString(),
      paidBy: (h.paid_by as string | null) ?? null,
    })),
  };
}

/** Marks everything a rider is owed, up to today, as paid (simulated), with who and when. */
export async function payRider(db: Db, riderCode: string, payerId: string) {
  const today = watNow().date;
  return db.transaction(async (tx) => {
    const [rider] = await rows<{ user_id: string }>(
      tx,
      sql`select user_id from staff_profile where code = ${riderCode} and role = 'rider'`,
    );
    if (!rider) return { error: "No such rider" } as const;
    const [owed] = await rows<Record<string, unknown>>(
      tx,
      sql`with paid as (
          select max(period_end) as through from payout where status = 'paid' and rider_id = ${rider.user_id}
        )
        select to_char(coalesce((select through from paid) + 1,
            min((d.delivered_at at time zone 'Africa/Lagos')::date)), 'YYYY-MM-DD') as start,
          count(d.id) as deliveries, coalesce(sum(d.rider_pay), 0) as amount
        from delivery d
        where d.rider_id = ${rider.user_id} and d.delivered_at is not null
          and ((select through from paid) is null
            or (d.delivered_at at time zone 'Africa/Lagos')::date > (select through from paid))`,
    );
    const amount = n(owed?.amount);
    if (!amount) return { error: "Nothing is owed" } as const;
    const start = String(owed!.start);
    // Earlier "owed" records for this time (the current week in the history) are replaced.
    await tx.execute(sql`delete from payout where rider_id = ${rider.user_id} and status = 'owed'`);
    const [p] = await tx
      .insert(t.payout)
      .values({
        riderId: rider.user_id,
        periodStart: start,
        periodEnd: today,
        deliveries: n(owed!.deliveries),
        amount,
        status: "paid",
        paidAt: new Date(),
        paidBy: payerId,
      })
      .returning();
    await tx.insert(t.auditLog).values({
      actorId: payerId,
      kind: "money",
      action: `Marked ${naira(amount)} as paid to ${riderCode} for ${start} to ${today}`,
      target: `payout:${p!.id}`,
    });
    return {
      payout: { amount, deliveries: n(owed!.deliveries), periodStart: start, periodEnd: today },
    };
  });
}

/* ---------- cash-up (ACC-04) ---------- */

/** The cash a day should have: walk-in cash payments, less cash refunds on them. */
async function expectedCash(db: Db | Tx, day: string) {
  const [r] = await rows<{ sales: unknown; refunds: unknown }>(
    db,
    sql`select
        (select coalesce(sum(total), 0) from "order" where business_date = ${day}::date
          and channel = 'walkin' and payment_method = 'cash' and not practice) as sales,
        (select coalesce(sum(r.amount), 0) from refund r join "order" o on o.id = r.order_id
          where o.business_date = ${day}::date and o.channel = 'walkin'
            and o.payment_method = 'cash' and not o.practice) as refunds`,
  );
  return n(r?.sales) - n(r?.refunds);
}

export type CashUpView = {
  date: string;
  expected: number;
  counted: number | null;
  countedBy: string | null;
  countedAt: string | null;
  signedOffBy: string | null;
  signedOffAt: string | null;
  note: string | null;
  closed: boolean;
};

/** A month's cash-ups, newest first, with today first while the month is open. */
export async function cashUps(db: Db, month: string): Promise<CashUpView[]> {
  const today = watNow().date;
  const closed = await isClosed(db, month);
  const list = await rows<Record<string, unknown>>(
    db,
    sql`select to_char(c.business_date, 'YYYY-MM-DD') as date, c.expected, c.counted, c.counted_at,
        c.signed_off_at, c.note, cb.code as counted_by, sb.code as signed_by
      from cash_up c
      left join staff_profile cb on cb.user_id = c.counted_by
      left join staff_profile sb on sb.user_id = c.signed_off_by
      where to_char(c.business_date, 'YYYY-MM') = ${month}
      order by c.business_date desc`,
  );
  const out: CashUpView[] = list.map((c) => ({
    date: String(c.date),
    expected: n(c.expected),
    counted: n(c.counted),
    countedBy: (c.counted_by as string | null) ?? null,
    countedAt: c.counted_at ? new Date(c.counted_at as string).toISOString() : null,
    signedOffBy: (c.signed_by as string | null) ?? null,
    signedOffAt: c.signed_off_at ? new Date(c.signed_off_at as string).toISOString() : null,
    note: (c.note as string | null) ?? null,
    closed,
  }));
  if (today.startsWith(month) && !out.some((c) => c.date === today))
    out.unshift({
      date: today,
      expected: await expectedCash(db, today),
      counted: null,
      countedBy: null,
      countedAt: null,
      signedOffBy: null,
      signedOffAt: null,
      note: null,
      closed,
    });
  return out;
}

/** Today's cash-up for the counter (ACC-04). */
export async function todayCashUp(db: Db): Promise<CashUpView> {
  const today = watNow().date;
  return (await cashUps(db, today.slice(0, 7))).find((c) => c.date === today)!;
}

/** The person on the counter saves the count; it can be counted again until it's signed off. */
export async function countCash(db: Db, counted: number, byId: string) {
  const today = watNow().date;
  return db.transaction(async (tx) => {
    const expected = await expectedCash(tx, today);
    const [existing] = await rows<{ signed_off_by: string | null }>(
      tx,
      sql`select signed_off_by from cash_up where business_date = ${today}::date`,
    );
    if (existing?.signed_off_by) return { error: "Today’s cash-up is already signed off" } as const;
    await tx
      .insert(t.cashUp)
      .values({ businessDate: today, expected, counted, countedBy: byId })
      .onConflictDoUpdate({
        target: t.cashUp.businessDate,
        set: { expected, counted, countedBy: byId, countedAt: new Date() },
      });
    await tx.insert(t.auditLog).values({
      actorId: byId,
      kind: "money",
      action: `Counted the cash for ${today}: ${naira(counted)} (expected ${naira(expected)})`,
      target: `cash-up:${today}`,
    });
    return { expected, counted };
  });
}

/** An account officer or manager signs a day off; a difference needs a note (ACC-04). */
export async function signOff(db: Db, day: string, note: string | null, byId: string) {
  if (await isClosed(db, day.slice(0, 7))) return { error: "That month is closed" } as const;
  return db.transaction(async (tx) => {
    const [c] = await rows<Record<string, unknown>>(
      tx,
      sql`select expected, counted, signed_off_by from cash_up where business_date = ${day}::date`,
    );
    if (!c) return { error: "That day hasn’t been counted yet" } as const;
    if (c.signed_off_by) return { error: "Already signed off" } as const;
    if (n(c.counted) !== n(c.expected) && !note?.trim())
      return { error: "Add a note about the difference" } as const;
    await tx.execute(
      sql`update cash_up set signed_off_by = ${byId}, signed_off_at = now(),
          note = coalesce(${note?.trim() || null}, note)
        where business_date = ${day}::date`,
    );
    await tx.insert(t.auditLog).values({
      actorId: byId,
      kind: "money",
      action: `Signed off the cash-up for ${day}`,
      target: `cash-up:${day}`,
    });
    return { ok: true } as const;
  });
}

/* ---------- the monthly statement and closing (ACC-03, ACC-07) ---------- */

export type Statement = {
  sales: number;
  online: number;
  walkin: number;
  byMethod: { cash: number; card: number; transfer: number };
  refunds: number;
  deliveryFees: number;
  riderPayEarned: number;
  riderPayPaid: number;
  cashVariance: number;
  adjustments: number;
  net: number;
  orders: number;
};

export type StatementView = {
  month: string;
  months: string[];
  statement: Statement;
  closed: { by: string | null; at: string } | null;
  canClose: boolean;
  waiting: string[];
  adjustmentsList: { amount: number; reason: string; by: string | null; at: string }[];
};

async function isClosed(db: Db | Tx, month: string) {
  const [r] = await rows<{ n: unknown }>(
    db,
    sql`select count(*) as n from month_close where month = ${`${month}-01`}::date`,
  );
  return n(r?.n) > 0;
}

/** The statement worked out from the records (an open month, or the snapshot when closing). */
async function computeStatement(db: Db | Tx, month: string): Promise<Statement> {
  const from = `${month}-01`;
  const to = monthEnd(month);
  const inMonth = sql`o.business_date between ${from}::date and ${to}::date and not o.practice`;
  const [o] = await rows<Record<string, unknown>>(
    db,
    sql`select count(*) as orders, coalesce(sum(o.total), 0) as sales,
        coalesce(sum(o.total) filter (where o.channel = 'online'), 0) as online,
        coalesce(sum(o.total) filter (where o.channel = 'walkin'), 0) as walkin,
        coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0) as cash,
        coalesce(sum(o.total) filter (where o.payment_method = 'card'), 0) as card,
        coalesce(sum(o.total) filter (where o.payment_method = 'transfer'), 0) as transfer,
        coalesce(sum(o.delivery_fee) filter (where o.status <> 'cancelled'), 0) as fees
      from "order" o where ${inMonth}`,
  );
  const [x] = await rows<Record<string, unknown>>(
    db,
    sql`select
        (select coalesce(sum(r.amount), 0) from refund r join "order" o on o.id = r.order_id
          where ${inMonth}) as refunds,
        (select coalesce(sum(d.rider_pay), 0) from delivery d join "order" o on o.id = d.order_id
          where ${inMonth}) as rider_pay,
        (select coalesce(sum(amount), 0) from payout where status = 'paid'
          and (paid_at at time zone 'Africa/Lagos')::date between ${from}::date and ${to}::date) as paid,
        (select coalesce(sum(counted - expected), 0) from cash_up
          where business_date between ${from}::date and ${to}::date) as variance,
        (select coalesce(sum(amount), 0) from adjustment where month = ${from}::date) as adjustments`,
  );
  const sales = n(o?.sales);
  const refunds = n(x?.refunds);
  const riderPayEarned = n(x?.rider_pay);
  const cashVariance = n(x?.variance);
  const adjustments = n(x?.adjustments);
  return {
    sales,
    online: n(o?.online),
    walkin: n(o?.walkin),
    byMethod: { cash: n(o?.cash), card: n(o?.card), transfer: n(o?.transfer) },
    refunds,
    deliveryFees: n(o?.fees),
    riderPayEarned,
    riderPayPaid: n(x?.paid),
    cashVariance,
    adjustments,
    net: sales - refunds - riderPayEarned + cashVariance + adjustments,
    orders: n(o?.orders),
  };
}

/** Days in a month that need a signed-off cash-up before it can close: any day with walk-ins. */
async function waitingDays(db: Db | Tx, month: string) {
  const list = await rows<{ day: string }>(
    db,
    sql`select to_char(d, 'YYYY-MM-DD') as day from (
        select distinct business_date as d from "order"
        where to_char(business_date, 'YYYY-MM') = ${month} and channel = 'walkin' and not practice
      ) w
      where not exists (select 1 from cash_up c where c.business_date = w.d and c.signed_off_by is not null)
      order by 1`,
  );
  return list.map((r) => r.day);
}

export async function statement(db: Db, month: string): Promise<StatementView> {
  const current = watNow().date.slice(0, 7);
  const [first] = await rows<{ m: string | null }>(
    db,
    sql`select to_char(min(business_date), 'YYYY-MM') as m from "order" where not practice`,
  );
  const months: string[] = [];
  for (let m = first?.m ?? current; m <= current; m = addMonth(m, 1)) months.unshift(m);
  const [closeRow] = await rows<Record<string, unknown>>(
    db,
    sql`select c.snapshot, c.closed_at, s.code from month_close c
      left join staff_profile s on s.user_id = c.closed_by
      where c.month = ${`${month}-01`}::date`,
  );
  const adjustmentsList = await rows<Record<string, unknown>>(
    db,
    sql`select a.amount, a.reason, a.at, s.code from adjustment a
      left join staff_profile s on s.user_id = a.entered_by
      where a.month = ${`${month}-01`}::date order by a.at desc`,
  );
  const live = await computeStatement(db, month);
  // A closed month shows the figures saved when it closed (they never change, ACC-07).
  const snap = closeRow?.snapshot as Partial<Statement> | undefined;
  const statementShown: Statement = snap
    ? { ...live, ...snap, byMethod: { ...live.byMethod, ...(snap.byMethod ?? {}) } }
    : live;
  const waiting = closeRow ? [] : await waitingDays(db, month);
  return {
    month,
    months,
    statement: statementShown,
    closed: closeRow
      ? {
          by: (closeRow.code as string | null) ?? null,
          at: new Date(closeRow.closed_at as string).toISOString(),
        }
      : null,
    canClose: !closeRow && month < current && waiting.length === 0,
    waiting,
    adjustmentsList: adjustmentsList.map((a) => ({
      amount: n(a.amount),
      reason: String(a.reason),
      by: (a.code as string | null) ?? null,
      at: new Date(a.at as string).toISOString(),
    })),
  };
}

/** Locks a finished month once every day is signed off, saving its figures (ACC-07). */
export async function closeMonth(db: Db, month: string, byId: string) {
  const current = watNow().date.slice(0, 7);
  if (month >= current) return { error: "A month can only close after its last day" } as const;
  return db.transaction(async (tx) => {
    if (await isClosed(tx, month)) return { error: "That month is already closed" } as const;
    const waiting = await waitingDays(tx, month);
    if (waiting.length) return { error: `Waiting for sign-off: ${waiting.join(", ")}` } as const;
    const snapshot = await computeStatement(tx, month);
    await tx.insert(t.monthClose).values({ month: `${month}-01`, closedBy: byId, snapshot });
    await tx.insert(t.auditLog).values({
      actorId: byId,
      kind: "money",
      action: `Closed ${month}: net ${naira(snapshot.net)}`,
      target: `month:${month}`,
    });
    return { ok: true } as const;
  });
}

/** A correction for a closed month goes into the current open month, with a reason (ACC-07). */
export async function addAdjustment(db: Db, amount: number, reason: string, byId: string) {
  const month = watNow().date.slice(0, 7);
  if (await isClosed(db, month)) return { error: "This month is closed" } as const;
  await db.transaction(async (tx) => {
    await tx.insert(t.adjustment).values({ month: `${month}-01`, amount, reason, enteredBy: byId });
    await tx.insert(t.auditLog).values({
      actorId: byId,
      kind: "money",
      action: `Entered an adjustment of ${naira(amount)}: ${reason}`,
      target: `month:${month}`,
    });
  });
  return { ok: true, month } as const;
}

/* ---------- the audit trail (ACC-05) ---------- */

export type AuditView = {
  at: string;
  kind: string;
  action: string;
  who: string | null;
  name: string | null;
};

export async function auditTrail(
  db: Db,
  q: { from: string; to: string; kind: string; person?: string },
): Promise<AuditView[]> {
  const kind = q.kind === "all" ? sql`true` : sql`a.kind = ${q.kind}`;
  const person = q.person ? sql`s.code = ${q.person}` : sql`true`;
  const list = await rows<Record<string, unknown>>(
    db,
    sql`select a.at, a.kind, a.action, s.code, coalesce(s.full_name, cp.name) as name
      from audit_log a
      left join staff_profile s on s.user_id = a.actor_id
      left join customer_profile cp on cp.user_id = a.actor_id
      where (a.at at time zone 'Africa/Lagos')::date between ${q.from}::date and ${q.to}::date
        and ${kind} and ${person}
      order by a.at desc limit 300`,
  );
  return list.map((a) => ({
    at: new Date(a.at as string).toISOString(),
    kind: String(a.kind),
    action: String(a.action),
    who: (a.code as string | null) ?? null,
    name: (a.name as string | null) ?? null,
  }));
}
