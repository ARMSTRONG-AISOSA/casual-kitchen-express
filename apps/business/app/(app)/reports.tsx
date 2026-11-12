import { naira } from "@cke/brand-tokens";
import { useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { AREAS } from "../../src/data/seed";
import { AOV, DAYS, DELIVERIES } from "../../src/data/report-data";
import { useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Chip, Chips, KV, Page, Section, Stat, T } from "../../src/ui/kit";
import { RefundsReport } from "../../src/ui/refunds-report";
import { useToast } from "../../src/ui/toast";

type Report = "orders" | "sales" | "times" | "riders" | "menu" | "customers" | "refunds";
type Range = 7 | 30 | 60;
type Channel = "all" | "online" | "walkin";

const REPORTS: [Report, string][] = [
  ["orders", "Orders"],
  ["sales", "Sales"],
  ["times", "Times"],
  ["riders", "Riders, areas, and staff"],
  ["menu", "Menu"],
  ["customers", "Customers"],
  ["refunds", "Refunds"],
];

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

// Reports (MGR-17 to MGR-22, MGR-34): summary cards, one simple chart, then the details. Every
// figure is worked out from the records in the chosen date range and channel. Comparing with the
// previous period is a possible future update (architecture.md 14.0).
export default function Reports() {
  const { s } = useStore();
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [report, setReport] = useState<Report>("orders");
  const [range, setRange] = useState<Range>(7);
  const [channel, setChannel] = useState<Channel>("all");
  // The date range and channel boxes sit side by side only when both fit on one line.
  const wide = width >= 1250;

  const days = DAYS.slice(-range);
  const firstDay = 60 - range;
  const online = days.reduce((a, d) => a + d.online, 0);
  const walkin = days.reduce((a, d) => a + d.walkin, 0);
  const perDay = days.map((d) =>
    channel === "all" ? d.online + d.walkin : channel === "online" ? d.online : d.walkin,
  );
  const orders = perDay.reduce((a, b) => a + b, 0);
  const onlineSales = channel === "walkin" ? 0 : online * AOV;
  const walkinSales = channel === "online" ? 0 : walkin * AOV;
  const sales = onlineSales + walkinSales;
  // Online orders are paid by card (60%) or transfer (40%); walk-ins by cash (55%), card (25%),
  // or transfer (20%) (architecture.md 18.3).
  const cash = Math.round(walkinSales * 0.55);
  const card = Math.round(onlineSales * 0.6 + walkinSales * 0.25);
  const transfer = sales - cash - card;

  const deliveries = useMemo(
    () => (channel === "walkin" ? [] : DELIVERIES.filter((d) => d.day >= firstDay)),
    [channel, firstDay],
  );
  const riders = s.people
    .filter((p) => p.role === "rider")
    .map((p) => {
      const mine = deliveries.filter((d) => d.rider === p.id);
      return { id: p.id, name: p.name, n: mine.length, mins: avg(mine.map((d) => d.mins)) };
    })
    .sort((a, b) => b.n - a.n);
  const areas = AREAS.map((name, i) => {
    const here = deliveries.filter((d) => d.area === i);
    return { name, n: here.length, mins: avg(here.map((d) => d.mins)) };
  }).sort((a, b) => b.n - a.n);

  const chartData = (
    range === 7 ? perDay : perDay.filter((_, i) => i % Math.ceil(range / 10) === 0)
  ).map((v) => ({
    value: report === "sales" ? Math.round((v * AOV) / 1000) : v,
    frontColor: t.primary,
  }));
  const chartWidth = Math.min(width - 300, 700);

  const summary: Record<Exclude<Report, "refunds">, [string, string][]> = {
    orders: [
      ["Orders", String(orders)],
      ["Per day", String(Math.round(orders / range))],
      ["Cancelled", String(Math.round(orders * 0.02))],
    ],
    sales: [
      ["Sales", naira(sales)],
      ["Average order", naira(AOV)],
      ["Refunds", naira(Math.round(sales * 0.015))],
    ],
    times: [
      ["Average total", "38 min"],
      ["Prep time", "14 min"],
      ["Wait for a rider", "4 min"],
    ],
    riders: [
      ["Deliveries", String(deliveries.length)],
      ["Average delivery", `${avg(deliveries.map((d) => d.mins))} min`],
      ["Rider pay", naira(deliveries.length * s.settings.riderPay)],
    ],
    menu: [
      ["Top item", "Jollof rice"],
      ["Sold out (times)", String(Math.round(range / 3))],
      ["Items sold", String(orders * 2)],
    ],
    customers: [
      ["New customers", String(Math.round(online * 0.12))],
      ["Returning", "64%"],
      ["Orders each", "3.1"],
    ],
  };
  const lists: Record<Exclude<Report, "riders" | "refunds">, [string, string][]> = {
    orders: [
      ["Busiest hour", "12 pm to 1 pm"],
      ["Delivery and pickup", "81% and 19%"],
      ["Online and walk-in", `${pct(online, online + walkin)} and ${pct(walkin, online + walkin)}`],
    ],
    // The amount first, then its share of sales.
    sales: [
      ["Cash", `${naira(cash)} (${pct(cash, sales)})`],
      ["Card", `${naira(card)} (${pct(card, sales)})`],
      ["Transfer", `${naira(transfer)} (${pct(transfer, sales)})`],
      ["Online orders", `${naira(onlineSales)} (${pct(onlineSales, sales)})`],
      ["Walk-in orders", `${naira(walkinSales)} (${pct(walkinSales, sales)})`],
    ],
    times: [
      ["Slowest order", "O-2091, 71 min"],
      ["Time to acknowledge", "1.6 min"],
      ["Delivery time", `${avg(deliveries.map((d) => d.mins))} min`],
    ],
    menu: [
      ["Jollof rice with chicken", naira(orders * 1200)],
      ["Classic Jollof Combo", naira(orders * 800)],
      ["Soup of the day", naira(orders * 600)],
    ],
    // The leaderboard: managers and account officers (MGR-34).
    customers: [
      ["C-01093", "38 orders, ₦171,400"],
      ["C-00418", "31 orders, ₦139,000"],
      ["C-00777", "24 orders, ₦118,200"],
    ],
  };
  const handled = channel === "online" ? online : channel === "walkin" ? walkin : online + walkin;

  return (
    <Page>
      <FilterLabel text="Report" />
      <Chips>
        {REPORTS.map(([v, l]) => (
          <Chip key={v} label={l} selected={report === v} onPress={() => setReport(v)} />
        ))}
      </Chips>

      {/* Date range and channel sit in their own labelled boxes, apart from the report tabs. */}
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: t.line,
        }}
      >
        <Card style={{ marginTop: 0, flex: wide ? 3 : undefined }}>
          <FilterLabel text="Date range" />
          <Chips>
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
          </Chips>
        </Card>
        <Card style={{ marginTop: 0, flex: wide ? 2 : undefined }}>
          <FilterLabel text="Channel" />
          <Chips>
            <Chip label="All" selected={channel === "all"} onPress={() => setChannel("all")} />
            <Chip
              label="Online"
              selected={channel === "online"}
              onPress={() => setChannel("online")}
            />
            <Chip
              label="Walk-in"
              selected={channel === "walkin"}
              onPress={() => setChannel("walkin")}
            />
          </Chips>
        </Card>
      </View>

      {report !== "refunds" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          {summary[report].map(([l, v]) => (
            <Stat key={l} label={l} value={v} />
          ))}
        </View>
      ) : null}
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

      {report === "refunds" ? (
        <RefundsReport range={range} channel={channel} />
      ) : report === "riders" ? (
        <>
          {channel === "walkin" ? (
            <T muted style={{ marginTop: 16 }}>
              Walk-in orders have no deliveries. Choose All or Online to see riders and areas.
            </T>
          ) : null}
          <Section title="Riders">
            <Table
              head={["Rider", "Deliveries", "Share", "Average time"]}
              rows={riders.map((r) => [
                `${r.name}, ${r.id}`,
                String(r.n),
                pct(r.n, deliveries.length),
                r.n ? `${r.mins} min` : "–",
              ])}
              total={["Total", String(deliveries.length), deliveries.length ? "100%" : "0%", ""]}
            />
          </Section>
          <Section title="Areas">
            <Table
              head={["Area", "Deliveries", "Share", "Average time"]}
              rows={areas.map((a) => [
                a.name,
                String(a.n),
                pct(a.n, deliveries.length),
                a.n ? `${a.mins} min` : "–",
              ])}
              total={["Total", String(deliveries.length), deliveries.length ? "100%" : "0%", ""]}
            />
          </Section>
          <Section title="Kitchen staff">
            <Table
              head={["Staff member", "Orders handled", "Share", "Average prep"]}
              rows={[
                ["Blessing Okafor, K-001", 0.55, 13],
                ["Samuel Eze, K-002", 0.45, 15],
              ].map(([name, share, prep]) => [
                String(name),
                String(Math.round(handled * Number(share))),
                pct(Number(share), 1),
                `${prep} min`,
              ])}
            />
          </Section>
          <T v="small" muted style={{ marginTop: 8 }}>
            Worked out from the deliveries and orders in the chosen date range.
          </T>
        </>
      ) : (
        <Section title="Details">
          <Card style={{ marginTop: 0 }}>
            {lists[report].map(([k, v]) => (
              <KV key={k} k={k} v={v} />
            ))}
          </Card>
        </Section>
      )}
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

function FilterLabel({ text }: { text: string }) {
  return (
    <T v="label" muted style={{ marginBottom: 8 }}>
      {text}
    </T>
  );
}

/** A simple table: the first column takes the spare room, the number columns line up right. */
function Table({ head, rows, total }: { head: string[]; rows: string[][]; total?: string[] }) {
  const t = useTheme();
  const line = (cells: string[], kind: "head" | "row" | "total", key: string) => (
    <View
      key={key}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: kind === "total" ? 0 : 1,
        borderBottomColor: t.line,
      }}
    >
      {cells.map((c, i) => (
        <T
          key={i}
          muted={kind === "head"}
          bold={kind === "total" || (kind === "row" && i > 0)}
          v={kind === "head" ? "label" : undefined}
          style={{ flex: i === 0 ? 2.2 : 1, textAlign: i === 0 ? "left" : "right" }}
        >
          {c}
        </T>
      ))}
    </View>
  );
  return (
    <Card style={{ marginTop: 0, paddingVertical: 4 }}>
      {line(head, "head", "head")}
      {rows.map((r, i) => line(r, "row", String(i)))}
      {total ? line(total, "total", "total") : null}
    </Card>
  );
}
