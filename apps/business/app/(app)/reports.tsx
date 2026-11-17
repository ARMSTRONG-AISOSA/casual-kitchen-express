import type { ReportChannel, ReportSummary } from "@cke/api-client";
import { naira } from "@cke/brand-tokens";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Share, View, useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { api } from "../../src/api";
import { useTheme } from "../../src/state/theme";
import {
  Button,
  Card,
  Chip,
  Chips,
  Field,
  KV,
  Page,
  Section,
  Sheet,
  Stat,
  T,
} from "../../src/ui/kit";
import { RefundsReport } from "../../src/ui/refunds-report";
import { useToast } from "../../src/ui/toast";

type Report = "orders" | "sales" | "times" | "riders" | "menu" | "customers" | "refunds";
type Range = 7 | 30 | 60 | 90 | "custom";

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
const minutes = (m: number | null) => (m === null ? "–" : `${Math.round(m * 10) / 10} min`);
const hourLabel = (h: number) => {
  const f = (x: number) => `${x % 12 || 12} ${x < 12 || x === 24 ? "am" : "pm"}`;
  return `${f(h)} to ${f(h + 1)}`;
};

/** The business day in West Africa Time (UTC+1 all year), shifted by some days. */
function watDay(shift = 0) {
  return new Date(Date.now() + 60 * 60_000 + shift * 86_400_000).toISOString().slice(0, 10);
}
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const dayLabel = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The chosen range as dates: the last N days ending today, or a custom From and To. */
function useReportRange() {
  const [range, setRange] = useState<Range>(7);
  const [custom, setCustom] = useState({ from: watDay(-13), to: watDay(0) });
  const dates = range === "custom" ? custom : { from: watDay(1 - range), to: watDay(0) };
  return { range, setRange, custom, setCustom, ...dates };
}

// Reports (MGR-17 to MGR-22, MGR-27, MGR-34): summary cards, one simple chart, then the details.
// Every figure comes from the real records in the chosen date range and channel (GET
// /reports/summary). A range wholly in the past never changes, so it is kept once loaded.
export default function Reports() {
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [report, setReport] = useState<Report>("orders");
  const [channel, setChannel] = useState<ReportChannel>("all");
  const { range, setRange, custom, setCustom, from, to } = useReportRange();
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState(custom);
  // The date range and channel boxes sit side by side only when both fit on one line.
  const wide = width >= 1250;
  const past = to < watDay(0);

  const q = useQuery({
    queryKey: ["report-summary", from, to, channel],
    queryFn: () => api!.reportSummary(from, to, channel),
    enabled: !!api && report !== "refunds",
    staleTime: past ? Infinity : 60_000,
  });
  const r = q.data;

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
            {([7, 30, 60, 90] as const).map((n) => (
              <Chip
                key={n}
                label={`${n} days`}
                selected={range === n}
                onPress={() => setRange(n)}
              />
            ))}
            <Chip
              label={
                range === "custom"
                  ? `${dayLabel(custom.from)} to ${dayLabel(custom.to)}`
                  : "Custom range"
              }
              selected={range === "custom"}
              onPress={() => {
                setDraft(custom);
                setPicking(true);
              }}
            />
          </Chips>
        </Card>
        <Card style={{ marginTop: 0, flex: wide ? 2 : undefined }}>
          <FilterLabel text="Channel" />
          <Chips>
            {(
              [
                ["all", "All"],
                ["online", "Online"],
                ["walkin", "Walk-in"],
              ] as const
            ).map(([v, l]) => (
              <Chip key={v} label={l} selected={channel === v} onPress={() => setChannel(v)} />
            ))}
          </Chips>
        </Card>
      </View>

      {report === "refunds" ? (
        <RefundsReport from={from} to={to} channel={channel} />
      ) : !r ? (
        <T muted style={{ marginTop: 20 }}>
          {q.isError ? "Can’t load the report right now. Try again." : "Loading the report…"}
        </T>
      ) : (
        <ReportBody report={report} r={r} width={width} />
      )}

      {report !== "refunds" && r ? (
        <Button
          label="Export CSV"
          variant="ghost"
          small
          style={{ marginTop: 16, alignSelf: "flex-start" }}
          onPress={() =>
            void Share.share({ title: `CKE ${report} report`, message: toCsv(report, r) }).catch(
              () => toast("Can’t share the file right now"),
            )
          }
        />
      ) : null}

      <Sheet visible={picking} onClose={() => setPicking(false)} title="Custom range">
        <T muted>Any dates back to the first order. Write them as year, month, day.</T>
        <Field
          label="From"
          value={draft.from}
          onChangeText={(from) => setDraft((d) => ({ ...d, from }))}
          placeholder="2026-09-01"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="To"
          value={draft.to}
          onChangeText={(to) => setDraft((d) => ({ ...d, to }))}
          placeholder={watDay(0)}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />
        <Button
          label="Show this range"
          style={{ marginTop: 16 }}
          onPress={() => {
            if (!isDay(draft.from) || !isDay(draft.to))
              return toast("Write each date like 2026-09-01");
            if (draft.from > draft.to) return toast("From must be on or before To");
            setCustom(draft);
            setRange("custom");
            setPicking(false);
          }}
        />
      </Sheet>
    </Page>
  );
}

function ReportBody({
  report,
  r,
  width,
}: {
  report: Exclude<Report, "refunds">;
  r: ReportSummary;
  width: number;
}) {
  const t = useTheme();
  const o = r.orders;
  const s = r.sales;
  const deliveries = r.riders.reduce((a, x) => a + x.deliveries, 0);
  const areaTotal = r.areas.reduce((a, x) => a + x.deliveries, 0);
  const staffTotal = r.staff.reduce((a, x) => a + x.orders, 0);
  const busiest = [...o.perHour].sort((a, b) => b.orders - a.orders)[0];
  const top = r.menu.items[0];

  // At most 15 bars: longer ranges add neighbouring days together.
  const per = Math.max(1, Math.ceil(o.perDay.length / 15));
  const bars: { value: number; label: string }[] = [];
  for (let i = 0; i < o.perDay.length; i += per) {
    const chunk = o.perDay.slice(i, i + per);
    const v = chunk.reduce((a, d) => a + (report === "sales" ? d.sales : d.orders), 0);
    bars.push({
      value: report === "sales" ? Math.round(v / 1000) : v,
      label: per === 1 ? dayLabel(chunk[0]!.date).split(" ")[0]! : "",
    });
  }
  const chartWidth = Math.min(width - 300, 700);

  const summary: Record<typeof report, [string, string][]> = {
    orders: [
      ["Orders", String(o.total)],
      ["Per day", String(Math.round(o.total / r.days))],
      ["Cancelled", String(o.cancelled)],
    ],
    sales: [
      ["Sales", naira(s.total)],
      ["Average order", naira(s.average)],
      ["Refunds", naira(s.refunds)],
    ],
    times: [
      ["Average total", minutes(r.times.total)],
      ["Prep time", minutes(r.times.prep)],
      ["Wait for a rider", minutes(r.times.waitRider)],
    ],
    riders: [
      ["Deliveries", String(deliveries)],
      ["Average delivery", minutes(r.times.delivery)],
      ["Rider pay", naira(r.riders.reduce((a, x) => a + x.pay, 0))],
    ],
    menu: [
      ["Top item", top?.name ?? "–"],
      ["Sold out (times)", String(r.menu.soldOut)],
      ["Items sold", String(r.menu.itemsSold)],
    ],
    customers: [
      ["New customers", String(r.customers.newCustomers)],
      ["Returning", pct(r.customers.returning, r.customers.customers)],
      ["Orders each", String(r.customers.ordersEach)],
    ],
  };

  const details: Partial<Record<typeof report, [string, string][]>> = {
    orders: [
      ["Busiest hour", busiest ? hourLabel(busiest.hour) : "–"],
      ["Delivery and pickup", `${pct(o.delivery, o.total)} and ${pct(o.pickup, o.total)}`],
      ["Online and walk-in", `${pct(o.online, o.total)} and ${pct(o.walkin, o.total)}`],
      ["Completed", String(o.total - o.cancelled)],
    ],
    // The amount first, then its share of sales (MGR-18).
    sales: [
      ["Cash", `${naira(s.cash)} (${pct(s.cash, s.total)})`],
      ["Card", `${naira(s.card)} (${pct(s.card, s.total)})`],
      ["Transfer", `${naira(s.transfer)} (${pct(s.transfer, s.total)})`],
      ["Online orders", `${naira(s.online)} (${pct(s.online, s.total)})`],
      ["Walk-in orders", `${naira(s.walkin)} (${pct(s.walkin, s.total)})`],
      ["Delivery fees", naira(s.deliveryFees)],
      ["Net of refunds", naira(s.net)],
    ],
    times: [
      ["Time to acknowledge", minutes(r.times.acknowledge)],
      ["Delivery time", minutes(r.times.delivery)],
      ...r.times.slowest.map(
        (x, i) => [i ? "" : "Slowest orders", `${x.number}, ${x.minutes} min`] as [string, string],
      ),
    ],
    menu: [
      ...r.menu.items
        .slice(0, 8)
        .map((i) => [i.name, `${i.quantity} sold, ${naira(i.revenue)}`] as [string, string]),
      ...r.menu.categories.map(
        (c) => [`${c.name} (category)`, naira(c.revenue)] as [string, string],
      ),
    ],
    // The leaderboard: managers and account officers (MGR-34).
    customers: r.customers.leaderboard.map(
      (c) => [c.code, `${c.orders} orders, ${naira(c.spent)}`] as [string, string],
    ),
  };

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {summary[report].map(([l, v]) => (
          <Stat key={l} label={l} value={v} />
        ))}
      </View>
      {(report === "orders" || report === "sales") && bars.length ? (
        <Card>
          <T v="h3" style={{ marginBottom: 10 }}>
            {report === "sales"
              ? `Sales${per > 1 ? ` per ${per} days` : " per day"}, in thousands of naira`
              : `Orders${per > 1 ? ` per ${per} days` : " per day"}`}
          </T>
          <BarChart
            data={bars.map((b) => ({ value: b.value, label: b.label, frontColor: t.primary }))}
            width={chartWidth}
            height={180}
            barWidth={Math.max(8, Math.min(28, chartWidth / bars.length - 10))}
            spacing={8}
            noOfSections={4}
            yAxisTextStyle={{ color: t.muted }}
            xAxisLabelTextStyle={{ color: t.muted, fontSize: 10 }}
            xAxisColor={t.line}
            yAxisColor={t.line}
            rulesColor={t.line}
            isAnimated={false}
          />
        </Card>
      ) : null}

      {report === "riders" ? (
        <>
          {r.channel === "walkin" ? (
            <T muted style={{ marginTop: 16 }}>
              Walk-in orders have no deliveries. Choose All or Online to see riders and areas.
            </T>
          ) : null}
          <Section title="Riders">
            <Table
              head={["Rider", "Deliveries", "Share", "Average time"]}
              rows={r.riders.map((x) => [
                `${x.name}, ${x.code}`,
                String(x.deliveries),
                pct(x.deliveries, deliveries),
                x.deliveries ? minutes(x.minutes) : "–",
              ])}
              total={["Total", String(deliveries), deliveries ? "100%" : "0%", ""]}
            />
          </Section>
          <Section title="Areas">
            <Table
              head={["Area", "Deliveries", "Share", "Average time"]}
              rows={r.areas.map((a) => [
                a.name,
                String(a.deliveries),
                pct(a.deliveries, areaTotal),
                a.deliveries ? minutes(a.minutes) : "–",
              ])}
              total={["Total", String(areaTotal), areaTotal ? "100%" : "0%", ""]}
            />
          </Section>
          <Section title="Kitchen staff">
            <Table
              head={["Staff member", "Orders handled", "Share", "Average prep"]}
              rows={r.staff.map((x) => [
                `${x.name}, ${x.code}`,
                String(x.orders),
                pct(x.orders, staffTotal),
                minutes(x.prep),
              ])}
            />
          </Section>
          <T v="small" muted style={{ marginTop: 8 }}>
            Worked out from the deliveries and orders in the chosen date range. Kitchen staff are
            who was signed in when an order was acknowledged or entered.
          </T>
        </>
      ) : (
        <Section title="Details">
          <Card style={{ marginTop: 0 }}>
            {(details[report] ?? []).length ? (
              details[report]!.map(([k, v], i) => <KV key={`${k}-${i}`} k={k} v={v} />)
            ) : (
              <T muted>Nothing in this range.</T>
            )}
          </Card>
          {report === "customers" ? (
            <T v="small" muted style={{ marginTop: 8 }}>
              Customers count online orders only; walk-ins aren’t linked to a person.
            </T>
          ) : null}
        </Section>
      )}
    </>
  );
}

/** The report as CSV text, for Export CSV (MGR-23). Rider order value and pay are included. */
function toCsv(report: Exclude<Report, "refunds">, r: ReportSummary) {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: (string | number | null)[][] = [[`CKE ${report} report`, r.from, r.to, r.channel]];
  if (report === "orders" || report === "sales")
    lines.push(
      ["Date", "Orders", "Sales"],
      ...r.orders.perDay.map((d) => [d.date, d.orders, d.sales]),
    );
  if (report === "sales")
    lines.push(
      [],
      ["Cash", r.sales.cash],
      ["Card", r.sales.card],
      ["Transfer", r.sales.transfer],
      ["Refunds", r.sales.refunds],
      ["Net", r.sales.net],
    );
  if (report === "times")
    lines.push(
      ["Acknowledge", r.times.acknowledge],
      ["Prep", r.times.prep],
      ["Wait for a rider", r.times.waitRider],
      ["Delivery", r.times.delivery],
      ["Total", r.times.total],
    );
  if (report === "riders")
    lines.push(
      [
        "Rider",
        "Code",
        "Deliveries",
        "Average minutes",
        "Order value",
        "Delivery fees",
        "Rider pay",
      ],
      ...r.riders.map((x) => [
        x.name,
        x.code,
        x.deliveries,
        x.minutes,
        x.orderValue,
        x.fees,
        x.pay,
      ]),
      [],
      ["Area", "Deliveries", "Average minutes"],
      ...r.areas.map((a) => [a.name, a.deliveries, a.minutes]),
      [],
      ["Staff member", "Code", "Orders handled", "Order value", "Average prep"],
      ...r.staff.map((x) => [x.name, x.code, x.orders, x.value, x.prep]),
    );
  if (report === "menu")
    lines.push(
      ["Item", "Sold", "Revenue"],
      ...r.menu.items.map((i) => [i.name, i.quantity, i.revenue]),
    );
  if (report === "customers")
    lines.push(
      ["Customer", "Orders", "Spent"],
      ...r.customers.leaderboard.map((c) => [c.code, c.orders, c.spent]),
    );
  return lines.map((l) => l.map(esc).join(",")).join("\n");
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
