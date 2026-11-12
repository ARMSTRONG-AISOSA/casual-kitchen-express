import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { myRole, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Chip, Chips, KV, Page, Section, Stat, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

type Report = "orders" | "sales" | "times" | "riders" | "menu" | "customers";
type Range = 7 | 30 | 60;

const REPORTS: [Report, string][] = [
  ["orders", "Orders"],
  ["sales", "Sales"],
  ["times", "Times"],
  ["riders", "Riders, areas, and staff"],
  ["menu", "Menu"],
  ["customers", "Customers"],
];

// A repeatable pseudo-random number, so the demo figures stay the same between visits.
const seeded = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

// Reports (MGR-17 to MGR-22): summary cards, one simple chart, then a list. Comparing with the
// previous period is a possible future update (architecture.md 14.0).
export default function Reports() {
  const { s } = useStore();
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [report, setReport] = useState<Report>("orders");
  const [range, setRange] = useState<Range>(7);
  const [channel, setChannel] = useState<"all" | "online" | "walkin">("all");
  const share = channel === "all" ? 1 : channel === "online" ? 0.75 : 0.25;
  const days = Array.from({ length: range }, (_, i) => {
    const weekend = (i + 4) % 7 >= 5;
    return Math.round((weekend ? 33 : 53) * share * (0.85 + seeded(i + range) * 0.3));
  });
  const orders = days.reduce((a, b) => a + b, 0);
  const aov = 4300;
  const chartData = (
    range === 7 ? days : days.filter((_, i) => i % Math.ceil(range / 10) === 0)
  ).map((v) => ({
    value: report === "sales" ? Math.round((v * aov) / 1000) : v,
    frontColor: t.primary,
  }));
  const chartWidth = Math.min(width - 300, 700);

  const summary: Record<Report, [string, string][]> = {
    orders: [
      ["Orders", String(orders)],
      ["Per day", String(Math.round(orders / range))],
      ["Cancelled", String(Math.round(orders * 0.02))],
    ],
    sales: [
      ["Sales", naira(orders * aov)],
      ["Average order", naira(aov)],
      ["Refunds", naira(Math.round(orders * aov * 0.015))],
    ],
    times: [
      ["Average total", "38 min"],
      ["Prep time", "14 min"],
      ["Wait for a rider", "4 min"],
    ],
    riders: [
      ["Deliveries", String(Math.round(orders * 0.7))],
      ["Average delivery", "17 min"],
      ["Rider pay", naira(Math.round(orders * 0.7) * s.settings.riderPay)],
    ],
    menu: [
      ["Top item", "Jollof rice"],
      ["Sold out (times)", String(Math.round(range / 3))],
      ["Items sold", String(orders * 2)],
    ],
    customers: [
      ["New customers", String(Math.round(orders * 0.12))],
      ["Returning", "64%"],
      ["Orders each", "3.1"],
    ],
  };
  const lists: Record<Report, [string, string][]> = {
    orders: [
      ["Busiest hour", "12 pm to 1 pm"],
      ["Delivery and pickup", "81% and 19%"],
      ["Online and walk-in", "75% and 25%"],
    ],
    sales: [
      ["Cash", "22%"],
      ["Card", "62%"],
      ["Transfer", "16%"],
    ],
    times: [
      ["Slowest order", "O-2091, 71 min"],
      ["Time to acknowledge", "1.6 min"],
      ["Delivery time", "17 min"],
    ],
    riders: [
      ["Musa Abdullahi, R-001", "112 deliveries, 16 min"],
      ["Chidi Nwosu, R-002", "98 deliveries, 18 min"],
      ["Ekosodin", "21% of orders, 12 min"],
      ["Blessing Okafor, K-001", "402 orders, 13 min prep"],
    ],
    menu: [
      ["Jollof rice with chicken", naira(orders * 1200)],
      ["Classic Jollof Combo", naira(orders * 800)],
      ["Soup of the day", naira(orders * 600)],
    ],
    customers:
      myRole(s) === "kitchen"
        ? []
        : [
            ["C-01093", "38 orders, ₦171,400"],
            ["C-00418", "31 orders, ₦139,000"],
            ["C-00777", "24 orders, ₦118,200"],
          ],
  };

  return (
    <Page>
      <Chips>
        {REPORTS.map(([v, l]) => (
          <Chip key={v} label={l} selected={report === v} onPress={() => setReport(v)} />
        ))}
      </Chips>
      <Chips style={{ marginTop: 10 }}>
        {[7, 30, 60].map((r) => (
          <Chip
            key={r}
            label={`${r} days`}
            selected={range === r}
            onPress={() => setRange(r as Range)}
          />
        ))}
        <Chip
          label="Custom range"
          onPress={() => toast("Pick a From and To date. Comes with the backend.")}
        />
        <View style={{ width: 12 }} />
        <Chip label="All" selected={channel === "all"} onPress={() => setChannel("all")} />
        <Chip label="Online" selected={channel === "online"} onPress={() => setChannel("online")} />
        <Chip
          label="Walk-in"
          selected={channel === "walkin"}
          onPress={() => setChannel("walkin")}
        />
      </Chips>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {summary[report].map(([l, v]) => (
          <Stat key={l} label={l} value={v} />
        ))}
      </View>
      {report === "orders" || report === "sales" ? (
        <Card>
          <T v="h3" style={{ marginBottom: 10 }}>
            {report === "sales" ? "Sales per day, in thousands of naira" : "Orders per day"}
          </T>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={180}
            barWidth={Math.max(8, Math.min(28, chartWidth / chartData.length - 10))}
            spacing={8}
            noOfSections={4}
            yAxisTextStyle={{ color: t.muted }}
            xAxisColor={t.line}
            yAxisColor={t.line}
            rulesColor={t.line}
            isAnimated={false}
          />
        </Card>
      ) : null}
      <Section title="Details">
        <Card style={{ marginTop: 0 }}>
          {lists[report].map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        </Card>
      </Section>
      <Button
        label="Export CSV"
        variant="ghost"
        small
        style={{ marginTop: 16, alignSelf: "flex-start" }}
        onPress={() => toast("CSV export comes with the backend")}
      />
    </Page>
  );
}
