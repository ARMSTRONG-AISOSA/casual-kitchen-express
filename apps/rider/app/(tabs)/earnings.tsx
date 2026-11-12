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

  const todayCount = s.delivered.length;
  const todayPay = s.delivered.reduce((a, d) => a + d.pay, 0);
  const unpaidEarlier = UNPAID_DAYS.reduce(
    (a, d) => ({ deliveries: a.deliveries + d.deliveries, amount: a.amount + d.amount }),
    { deliveries: 0, amount: 0 },
  );
  const owedTotal = todayPay + unpaidEarlier.amount;

  // Everything unpaid falls in this week, so "owed" is the same for every period except today.
  const unpaid =
    period === "today"
      ? { deliveries: todayCount, amount: todayPay }
      : { deliveries: todayCount + unpaidEarlier.deliveries, amount: owedTotal };
  const paid =
    period === "month"
      ? PAID_THIS_MONTH
      : period === "all"
        ? PAID_ALL_TIME
        : { deliveries: 0, amount: 0 };

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
        <KV
          k={`Today, ${todayCount} deliver${todayCount === 1 ? "y" : "ies"}`}
          v={naira(todayPay)}
        />
        {UNPAID_DAYS.map((d) => (
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
                    {d.area}, owed
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
        {PAYOUTS.map((p) => (
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
