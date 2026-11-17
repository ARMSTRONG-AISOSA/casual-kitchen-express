import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";

// Reports (MGR-17 to MGR-22, MGR-27, MGR-34): every figure for a date range and channel, worked out
// by the database from the real records, so the Worker does almost no work (10 ms CPU, 14.2).
// Days are business dates (West Africa Time). Sales are what orders were placed for, cancelled
// ones included; refunds are listed on their own, and net is sales less refunds (the same rule as
// the monthly statement, ACC-03).

export type Channel = "all" | "online" | "walkin";

export type ReportSummary = {
  from: string;
  to: string;
  days: number;
  channel: Channel;
  orders: {
    total: number;
    cancelled: number;
    online: number;
    walkin: number;
    delivery: number;
    pickup: number;
    perDay: { date: string; orders: number; sales: number }[];
    perHour: { hour: number; orders: number }[];
  };
  sales: {
    total: number;
    average: number;
    refunds: number;
    net: number;
    cash: number;
    card: number;
    transfer: number;
    online: number;
    walkin: number;
    deliveryFees: number;
  };
  times: {
    acknowledge: number | null;
    prep: number | null;
    waitRider: number | null;
    delivery: number | null;
    total: number | null;
    slowest: { number: string; minutes: number }[];
  };
  riders: {
    code: string;
    name: string;
    deliveries: number;
    minutes: number | null;
    orderValue: number;
    fees: number;
    pay: number;
  }[];
  areas: { name: string; deliveries: number; minutes: number | null }[];
  staff: { code: string; name: string; orders: number; value: number; prep: number | null }[];
  menu: {
    items: { name: string; quantity: number; revenue: number }[];
    categories: { name: string; revenue: number }[];
    soldOut: number;
    itemsSold: number;
  };
  customers: {
    customers: number;
    newCustomers: number;
    returning: number;
    ordersEach: number;
    leaderboard: { code: string; orders: number; spent: number }[];
  };
};

const n = (v: unknown) => Number(v ?? 0);
const mins = (v: unknown) =>
  v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10;

async function rows<T>(db: Db, q: SQL): Promise<T[]> {
  return (await db.execute(q)).rows as T[];
}

export async function reportSummary(
  db: Db,
  from: string,
  to: string,
  channel: Channel,
): Promise<ReportSummary> {
  // The orders in range: by business date, and by channel unless "all". Practice orders are left
  // out (Demo controls, 18.4).
  const inRange = sql`o.business_date between ${from}::date and ${to}::date and not o.practice`;
  const ch = channel === "all" ? sql`true` : sql`o.channel = ${channel}`;
  const where = sql`${inRange} and ${ch}`;

  const [totals] = await rows<Record<string, unknown>>(
    db,
    sql`select
      count(*) as total,
      count(*) filter (where o.status = 'cancelled') as cancelled,
      count(*) filter (where o.channel = 'online') as online,
      count(*) filter (where o.channel = 'walkin') as walkin,
      count(*) filter (where o.type = 'delivery') as delivery,
      count(*) filter (where o.type <> 'delivery') as pickup,
      coalesce(sum(o.total), 0) as sales,
      coalesce(sum(o.total) filter (where o.payment_method = 'cash'), 0) as cash,
      coalesce(sum(o.total) filter (where o.payment_method = 'card'), 0) as card,
      coalesce(sum(o.total) filter (where o.payment_method = 'transfer'), 0) as transfer,
      coalesce(sum(o.total) filter (where o.channel = 'online'), 0) as online_sales,
      coalesce(sum(o.total) filter (where o.channel = 'walkin'), 0) as walkin_sales,
      coalesce(sum(o.delivery_fee), 0) as fees,
      avg(extract(epoch from o.acknowledged_at - o.placed_at) / 60) as ack,
      avg(extract(epoch from o.ready_at - o.acknowledged_at) / 60) as prep,
      avg(extract(epoch from coalesce(o.delivered_at, o.collected_at) - o.placed_at) / 60)
        filter (where o.status <> 'cancelled') as total_min
    from "order" o where ${where}`,
  );

  const perDay = await rows<{ date: string; orders: number; sales: number }>(
    db,
    sql`select to_char(d.day, 'YYYY-MM-DD') as date,
        count(o.id)::int as orders, coalesce(sum(o.total), 0)::int as sales
      from generate_series(${from}::date, ${to}::date, interval '1 day') as d(day)
      left join "order" o on o.business_date = d.day::date and not o.practice and ${ch}
      group by d.day order by d.day`,
  );

  const perHour = await rows<{ hour: number; orders: number }>(
    db,
    sql`select extract(hour from o.placed_at at time zone 'Africa/Lagos')::int as hour,
        count(*)::int as orders
      from "order" o where ${where} group by 1 order by 1`,
  );

  const [refunds] = await rows<{ amount: unknown }>(
    db,
    sql`select coalesce(sum(r.amount), 0) as amount
      from refund r join "order" o on o.id = r.order_id where ${where}`,
  );

  // Deliveries: the rider's part (walk-ins have none).
  const [road] = await rows<Record<string, unknown>>(
    db,
    sql`select
      avg(extract(epoch from d.accepted_at - o.ready_at) / 60)
        filter (where d.accepted_at >= o.ready_at) as wait,
      avg(extract(epoch from d.delivered_at - d.picked_up_at) / 60) as delivery
    from delivery d join "order" o on o.id = d.order_id where ${where}`,
  );

  const slowest = await rows<{ number: string; minutes: number }>(
    db,
    sql`select o.number,
        round(extract(epoch from coalesce(o.delivered_at, o.collected_at) - o.placed_at) / 60)::int
          as minutes
      from "order" o
      where ${where} and o.status <> 'cancelled' and coalesce(o.delivered_at, o.collected_at) is not null
      order by minutes desc limit 3`,
  );

  // Every rider is listed, even with no deliveries (MGR-20).
  const riders = await rows<Record<string, unknown>>(
    db,
    sql`select s.code, s.full_name as name,
        count(o.id) as deliveries,
        avg(extract(epoch from d.delivered_at - d.picked_up_at) / 60) filter (where o.id is not null) as minutes,
        coalesce(sum(o.total) filter (where o.id is not null), 0) as value,
        coalesce(sum(o.delivery_fee) filter (where o.id is not null), 0) as fees,
        coalesce(sum(d.rider_pay) filter (where o.id is not null), 0) as pay
      from staff_profile s
      left join delivery d on d.rider_id = s.user_id and d.delivered_at is not null
      left join "order" o on o.id = d.order_id and ${where}
      where s.role = 'rider'
      group by s.code, s.full_name order by count(o.id) desc, s.code`,
  );

  const areas = await rows<Record<string, unknown>>(
    db,
    sql`select nb.name, count(o.id) as deliveries,
        avg(extract(epoch from d.delivered_at - d.picked_up_at) / 60) filter (where o.id is not null) as minutes
      from neighbourhood nb
      left join "order" o on o.neighbourhood_id = nb.id and o.type = 'delivery' and ${where}
      left join delivery d on d.order_id = o.id and d.delivered_at is not null
      group by nb.name, nb.sort_order order by count(o.id) desc, nb.sort_order`,
  );

  // Kitchen staff (MGR-27): orders they acknowledged or entered at the counter, while signed in.
  const staff = await rows<Record<string, unknown>>(
    db,
    sql`with handled as (
        select distinct o.id, coalesce(o.entered_by, e.actor_id) as person, o.total,
          extract(epoch from o.ready_at - o.acknowledged_at) / 60 as prep
        from "order" o
        left join order_status_event e on e.order_id = o.id and e.status = 'acknowledged'
          and e.actor_kind = 'staff'
        where ${where}
      )
      select s.code, s.full_name as name, count(h.id) as orders,
        coalesce(sum(h.total), 0) as value, avg(h.prep) as prep
      from staff_profile s join handled h on h.person = s.user_id
      where s.role in ('kitchen', 'manager')
      group by s.code, s.full_name order by count(h.id) desc`,
  );

  const items = await rows<Record<string, unknown>>(
    db,
    sql`select i.name, sum(i.quantity) as quantity, sum(i.quantity * i.unit_price) as revenue
      from order_item i join "order" o on o.id = i.order_id
      where ${where} and o.status <> 'cancelled'
      group by i.name order by revenue desc`,
  );
  const categories = await rows<Record<string, unknown>>(
    db,
    sql`select coalesce(c.name, 'Other') as name, sum(i.quantity * i.unit_price) as revenue
      from order_item i join "order" o on o.id = i.order_id
      left join menu_item m on m.id = i.item_id
      left join menu_category c on c.id = m.category_id
      where ${where} and o.status <> 'cancelled'
      group by 1 order by revenue desc`,
  );
  const [soldOut] = await rows<{ n: unknown }>(
    db,
    sql`select count(*) as n from audit_log
      where action like 'Marked % sold out'
        and (at at time zone 'Africa/Lagos')::date between ${from}::date and ${to}::date`,
  );

  // Customers: online orders only (MGR-22). New means their first order ever is in the range.
  const [cust] = await rows<Record<string, unknown>>(
    db,
    channel === "walkin"
      ? sql`select 0 as customers, 0 as new_customers, 0 as orders`
      : sql`with mine as (
          select o.customer_id, count(*) as orders from "order" o
          where ${inRange} and o.channel = 'online' and o.customer_id is not null
          group by o.customer_id
        ), firsts as (
          select o.customer_id, min(o.business_date) as first_day from "order" o
          where o.channel = 'online' and o.customer_id in (select customer_id from mine)
          group by o.customer_id
        )
        select (select count(*) from mine) as customers,
          (select count(*) from firsts where first_day >= ${from}::date) as new_customers,
          (select coalesce(sum(orders), 0) from mine) as orders`,
  );
  const leaderboard =
    channel === "walkin"
      ? []
      : await rows<{ code: string; orders: number; spent: number }>(
          db,
          sql`select p.code, count(*)::int as orders, sum(o.total)::int as spent
            from "order" o join customer_profile p on p.user_id = o.customer_id
            where ${inRange} and o.channel = 'online'
            group by p.code order by spent desc limit 5`,
        );

  const total = n(totals?.total);
  const sales = n(totals?.sales);
  const customers = n(cust?.customers);
  const newCustomers = n(cust?.new_customers);
  const days =
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  return {
    from,
    to,
    days,
    channel,
    orders: {
      total,
      cancelled: n(totals?.cancelled),
      online: n(totals?.online),
      walkin: n(totals?.walkin),
      delivery: n(totals?.delivery),
      pickup: n(totals?.pickup),
      perDay: perDay.map((d) => ({ date: d.date, orders: n(d.orders), sales: n(d.sales) })),
      perHour: perHour.map((h) => ({ hour: n(h.hour), orders: n(h.orders) })),
    },
    sales: {
      total: sales,
      average: total ? Math.round(sales / total) : 0,
      refunds: n(refunds?.amount),
      net: sales - n(refunds?.amount),
      cash: n(totals?.cash),
      card: n(totals?.card),
      transfer: n(totals?.transfer),
      online: n(totals?.online_sales),
      walkin: n(totals?.walkin_sales),
      deliveryFees: n(totals?.fees),
    },
    times: {
      acknowledge: mins(totals?.ack),
      prep: mins(totals?.prep),
      waitRider: mins(road?.wait),
      delivery: mins(road?.delivery),
      total: mins(totals?.total_min),
      slowest: slowest.map((s) => ({ number: s.number, minutes: n(s.minutes) })),
    },
    riders: riders.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      deliveries: n(r.deliveries),
      minutes: mins(r.minutes),
      orderValue: n(r.value),
      fees: n(r.fees),
      pay: n(r.pay),
    })),
    areas: areas.map((a) => ({
      name: String(a.name),
      deliveries: n(a.deliveries),
      minutes: mins(a.minutes),
    })),
    staff: staff.map((s) => ({
      code: String(s.code),
      name: String(s.name),
      orders: n(s.orders),
      value: n(s.value),
      prep: mins(s.prep),
    })),
    menu: {
      items: items.map((i) => ({
        name: String(i.name),
        quantity: n(i.quantity),
        revenue: n(i.revenue),
      })),
      categories: categories.map((c) => ({ name: String(c.name), revenue: n(c.revenue) })),
      soldOut: n(soldOut?.n),
      itemsSold: items.reduce((a, i) => a + n(i.quantity), 0),
    },
    customers: {
      customers,
      newCustomers,
      returning: customers - newCustomers,
      ordersEach: customers ? Math.round((n(cust?.orders) / customers) * 10) / 10 : 0,
      leaderboard: leaderboard.map((l) => ({
        code: l.code,
        orders: n(l.orders),
        spent: n(l.spent),
      })),
    },
  };
}

export type RefundRowView = {
  at: string;
  orderNo: string;
  channel: "online" | "walkin";
  amount: number;
  kind: "full" | "partial";
  reason: string;
  /** The staff ID of who made it, or "System". */
  by: string;
  byName: string;
  byRole: string;
};

const ROLE_NAME: Record<string, string> = {
  manager: "Manager",
  dispatch: "Dispatch officer",
  kitchen: "Kitchen",
  accounts: "Account officer",
  rider: "Rider",
};

/** Every refund on orders in the range (Reports, Refunds; MGR-15, MGR-18), newest first. */
export async function refundRows(
  db: Db,
  from: string,
  to: string,
  channel: Channel,
): Promise<RefundRowView[]> {
  const ch = channel === "all" ? sql`true` : sql`o.channel = ${channel}`;
  const list = await rows<Record<string, unknown>>(
    db,
    sql`select coalesce(r.completed_at, r.requested_at) as at, o.number, o.channel, r.amount,
        r.kind, r.reason, s.code, s.full_name, s.role
      from refund r join "order" o on o.id = r.order_id
      left join staff_profile s on s.user_id = r.decided_by
      where o.business_date between ${from}::date and ${to}::date and not o.practice and ${ch}
      order by at desc`,
  );
  return list.map((r) => ({
    at: new Date(r.at as string).toISOString(),
    orderNo: String(r.number),
    channel: r.channel as "online" | "walkin",
    amount: n(r.amount),
    kind: r.kind as "full" | "partial",
    reason: String(r.reason),
    by: r.code ? String(r.code) : "System",
    byName: r.full_name ? String(r.full_name) : "CKE (automatic)",
    byRole: r.role ? (ROLE_NAME[String(r.role)] ?? String(r.role)) : "",
  }));
}
