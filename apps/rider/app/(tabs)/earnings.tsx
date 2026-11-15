import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View } from "react-native";
import { PAID_ALL_TIME, PAID_THIS_MONTH, PAYOUTS, UNPAID_DAYS } from "../../src/data/orders";
import { useStore } from "../../src/state/store";
import { Card, KV, Screen, Segmented, T, TopBar } from "../../src/ui/kit";

type Period = "today" | "week" | "month" | "all";

// Earnings (RID-18). Pay per delivery follows the manager's setting, and payouts are simulated:
// an account officer or a manager marks a week as paid. Owed lists everything not paid out yet.
export default function Earnings() {
  const { s } = useStore();
  const [period, setPeriod] = useState<Period>("today");

  // Live: the API's figures (GET /rider/earnings). Demo: the made-up ones, with today added live.
  const e = s.live ? s.earnings : null;
  const todayCount = e ? e.today.n : s.delivered.length;
  const todayPay = e ? e.today.pay : s.delivered.reduce((a, d) => a + d.pay, 0);
  const sum = (xs: { deliveries: number; amount: number }[]) =>
    xs.reduce(
      (a, d) => ({ deliveries: a.deliveries + d.deliveries, amount: a.amount + d.amount }),
      {
        deliveries: 0,
        amount: 0,
      },
    );
  // Owed by day: from the API (today included), or the demo's earlier days.
  const owedDays = e
    ? e.owed.days.map((d) => ({ day: dayLabel(d.day), iso: d.day, deliveries: d.n, amount: d.pay }))
    : UNPAID_DAYS.map((d) => ({ ...d, iso: "" }));
  const unpaidEarlier = sum(UNPAID_DAYS);
  const owedTotal = e ? e.owed.total : todayPay + unpaidEarlier.amount;

  let unpaid: { deliveries: number; amount: number };
  let paid: { deliveries: number; amount: number };
  if (e) {
    // The period's deliveries and pay, split into what's still owed and what's been paid.
    const all = { today: e.today, week: e.week, month: e.month, all: e.allTime }[period];
    const from = periodStart(period);
    unpaid = sum(owedDays.filter((d) => d.iso >= from));
    paid = {
      deliveries: Math.max(0, all.n - unpaid.deliveries),
      amount: Math.max(0, all.pay - unpaid.amount),
    };
  } else {
    // Everything unpaid falls in this week, so "owed" is the same for every period except today.
    unpaid =
      period === "today"
        ? { deliveries: todayCount, amount: todayPay }
        : { deliveries: todayCount + unpaidEarlier.deliveries, amount: owedTotal };
    paid =
      period === "month"
        ? PAID_THIS_MONTH
        : period === "all"
          ? PAID_ALL_TIME
          : { deliveries: 0, amount: 0 };
  }
  const payouts = e
    ? e.payouts
        .filter((p) => p.status === "paid")
        .map((p) => ({
          week: `Week to ${dayLabel(p.periodEnd)}`,
          deliveries: p.deliveries,
          amount: p.amount,
        }))
    : PAYOUTS;

  return (
    <Screen tabs header={<TopBar title="Earnings" />}>
      <Segmented
        label="Period"
        options={[
          ["today", "Today"],
          ["week", "This week"],
          ["month", "This month"],
          ["all", "All time"],
        ]}
        value={period}
        onChange={setPeriod}
      />
      <Card strong>
        <KV k="Deliveries" v={unpaid.deliveries + paid.deliveries} />
        <KV k="Earned" v={naira(unpaid.amount + paid.amount)} />
        <KV k="Owed to you" v={naira(unpaid.amount)} />
        <KV k="Already paid" v={naira(paid.amount)} />
      </Card>
      <T muted style={{ marginTop: 10 }}>
        {naira(s.pay)} per delivery, set by your manager.
      </T>

      <T v="h2" style={{ marginTop: 22 }}>
        Owed
      </T>
      <Card strong>
        {!e ? (
          <KV
            k={`Today, ${todayCount} deliver${todayCount === 1 ? "y" : "ies"}`}
            v={naira(todayPay)}
          />
        ) : null}
        {e && !owedDays.length ? <T muted>Nothing owed right now.</T> : null}
        {owedDays.map((d) => (
          <KV key={d.day} k={`${d.day}, ${d.deliveries} deliveries`} v={naira(d.amount)} />
        ))}
        <KV k="Total owed" v={naira(owedTotal)} />
      </Card>
      <T v="small" muted style={{ marginTop: 10 }}>
        Not paid out yet. CKE pays out each week.
      </T>

      <T v="h2" style={{ marginTop: 22 }}>
        Today’s deliveries
      </T>
      <Card>
        {s.delivered.length ? (
          s.delivered.map((d) => (
            <KV
              key={d.no}
              k={`${d.time}, ${d.no}`}
              v={
                <View>
                  <T style={{ textAlign: "right", fontWeight: "700" }}>{naira(d.pay)}</T>
                  <T v="small" muted style={{ textAlign: "right" }}>
                    {d.area ? `${d.area}, owed` : "Owed"}
                  </T>
                </View>
              }
            />
          ))
        ) : (
          <T muted>No deliveries yet today.</T>
        )}
      </Card>

      <T v="h2" style={{ marginTop: 22 }}>
        Payouts
      </T>
      <Card>
        {!payouts.length ? <T muted>No payouts yet.</T> : null}
        {payouts.map((p) => (
          <KV
            key={p.week}
            k={`${p.week}, ${p.deliveries} deliveries`}
            v={`${naira(p.amount)} paid`}
          />
        ))}
      </Card>
      <T v="small" muted style={{ marginTop: 10 }}>
        Demo payouts. No money is moved.
      </T>
    </Screen>
  );
}

/** "Wed 11 Nov" for a date like 2026-11-11. */
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** The first day of the period in West Africa Time, as YYYY-MM-DD ("" for all time). */
function periodStart(p: Period) {
  const now = new Date(Date.now() + 60 * 60_000); // West Africa Time, UTC+1 all year
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "today") return ymd(now);
  if (p === "month") return `${ymd(now).slice(0, 8)}01`;
  if (p === "week") {
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    return ymd(monday);
  }
  return "";
}
