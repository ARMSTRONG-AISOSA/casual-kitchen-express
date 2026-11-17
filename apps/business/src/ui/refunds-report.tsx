import type { RefundRowView } from "@cke/api-client";
import { naira } from "@cke/brand-tokens";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { api } from "../api";
import { clock } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Card, Chip, Chips, Section, Stat, T } from "./kit";

const day = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

type RefundRow = Omit<RefundRowView, "at"> & { at: number };

/**
 * Reports, Refunds (MGR-15, MGR-18): every refund in the chosen date range and channel, with who
 * made it, from the real records (GET /reports/refunds). Today's refunds are included.
 */
export function RefundsReport({
  from,
  to,
  channel,
}: {
  from: string;
  to: string;
  channel: "all" | "online" | "walkin";
}) {
  const t = useTheme();
  const [sort, setSort] = useState<"newest" | "largest">("newest");
  const [shown, setShown] = useState(20);
  const q = useQuery({
    queryKey: ["report-refunds", from, to, channel],
    queryFn: () => api!.reportRefunds(from, to, channel),
    enabled: !!api,
    staleTime: 60_000,
  });
  // Today's date in West Africa Time, fixed while the report is open.
  const [todayKey] = useState(() => new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10));
  const rows: RefundRow[] = (q.data?.refunds ?? [])
    .map((r) => ({ ...r, at: Date.parse(r.at) }))
    .sort((a, b) => (sort === "newest" ? b.at - a.at : b.amount - a.amount));
  const isToday = (ms: number) =>
    new Date(ms + 60 * 60_000).toISOString().slice(0, 10) === todayKey;
  const total = rows.reduce((a, r) => a + r.amount, 0);

  const group = (key: (r: RefundRow) => string) =>
    Object.entries(
      rows.reduce<Record<string, { n: number; amount: number }>>((acc, r) => {
        const g = (acc[key(r)] ??= { n: 0, amount: 0 });
        g.n += 1;
        g.amount += r.amount;
        return acc;
      }, {}),
    ).sort((a, b) => b[1].amount - a[1].amount);

  const breakdown = (title: string, items: [string, { n: number; amount: number }][]) => (
    <Section title={title}>
      <Card style={{ marginTop: 0, paddingVertical: 4 }}>
        {items.map(([k, g]) => (
          <View
            key={k}
            style={{
              flexDirection: "row",
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: t.line,
              gap: 10,
            }}
          >
            <T style={{ flex: 2 }}>{k}</T>
            <T bold style={{ flex: 1, textAlign: "right" }}>
              {g.n}
            </T>
            <T bold style={{ flex: 1.3, textAlign: "right" }}>
              {naira(g.amount)}
            </T>
          </View>
        ))}
      </Card>
    </Section>
  );

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        <Stat label="Refunds" value={String(rows.length)} />
        <Stat label="Total refunded" value={naira(total)} />
        <Stat label="Average" value={rows.length ? naira(Math.round(total / rows.length)) : "–"} />
      </View>

      {breakdown(
        "By reason",
        group((r) => r.reason),
      )}
      {breakdown(
        "By person",
        group((r) => (r.by === "System" ? r.byName : `${r.byName}, ${r.byRole} (${r.by})`)),
      )}

      <Section title="Every refund">
        <Chips style={{ marginBottom: 10 }}>
          <Chip
            label="Newest first"
            selected={sort === "newest"}
            onPress={() => setSort("newest")}
          />
          <Chip
            label="Largest first"
            selected={sort === "largest"}
            onPress={() => setSort("largest")}
          />
        </Chips>
        <Card style={{ marginTop: 0, paddingVertical: 4 }}>
          {!rows.length ? (
            <T muted style={{ paddingVertical: 10 }}>
              {q.isLoading ? "Loading…" : "No refunds in this range."}
            </T>
          ) : null}
          {rows.slice(0, shown).map((r, i) => (
            <View
              key={`${r.orderNo}-${r.at}-${i}`}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.line }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <T v="label">
                  {r.orderNo}
                  {isToday(r.at) ? " (today)" : ""}
                </T>
                <T bold>
                  {naira(r.amount)}
                  {r.kind === "partial" ? ", partial" : ""}
                </T>
              </View>
              <T v="small" muted>
                {day(r.at)}, {clock(r.at)}, {r.channel === "walkin" ? "walk-in" : "online"}.{" "}
                {r.reason}.
              </T>
              <T v="small" muted>
                By {r.by === "System" ? r.byName : `${r.byName}, ${r.byRole} (${r.by})`}
              </T>
            </View>
          ))}
        </Card>
        {rows.length > shown ? (
          <Button
            label={`Show more (${rows.length - shown} left)`}
            variant="ghost"
            small
            style={{ marginTop: 10, alignSelf: "flex-start" }}
            onPress={() => setShown((n) => n + 20)}
          />
        ) : null}
      </Section>
    </>
  );
}
