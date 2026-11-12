import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View } from "react-native";
import { PAYOUTS } from "../../src/data/orders";
import { useStore } from "../../src/state/store";
import { Card, KV, Screen, Segmented, T, TopBar } from "../../src/ui/kit";

type Period = "today" | "week" | "month";

// Earnings (RID-18). Pay per delivery follows the manager's setting, and payouts are simulated:
// the manager marks a week as paid.
export default function Earnings() {
  const { s } = useStore();
  const [period, setPeriod] = useState<Period>("today");
  const today = s.delivered.length;
  // Demo figures for the week and month. Today's count is live.
  const count = period === "today" ? today : period === "week" ? 21 + today : 99 + today;
  const earned = period === "today" ? s.delivered.reduce((a, d) => a + d.pay, 0) : count * s.pay;
  const paid = period === "month" ? PAYOUTS.reduce((a, p) => a + p.amount, 0) : 0;
  return (
    <Screen tabs header={<TopBar title="Earnings" />}>
      <Segmented
        label="Period"
        options={[
          ["today", "Today"],
          ["week", "This week"],
          ["month", "This month"],
        ]}
        value={period}
        onChange={setPeriod}
      />
      <Card strong>
        <KV k="Deliveries" v={count} />
        <KV k="Earned" v={naira(earned)} />
        <KV k="Owed to you" v={naira(earned - paid)} />
        <KV k="Already paid" v={naira(paid)} />
      </Card>
      <T muted style={{ marginTop: 10 }}>
        {naira(s.pay)} per delivery, set by your manager.
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
          <KV key={p.week} k={p.week} v={`${naira(p.amount)} paid`} />
        ))}
      </Card>
      <T v="small" muted style={{ marginTop: 10 }}>
        Demo payouts. No money is moved.
      </T>
    </Screen>
  );
}
