import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View } from "react-native";
import { REFUND_ROWS, type RefundRow } from "../data/report-data";
import { clock, useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Card, Chip, Chips, Section, Stat, T } from "./kit";

const day = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * Reports, Refunds (MGR-15, MGR-18): every refund in the chosen date range and channel, with who
 * made it. The same filters and export as the other reports. Today's refunds made in this app are
 * included at the top.
 */
export function RefundsReport({
  range,
  channel,
}: {
  range: number;
  channel: "all" | "online" | "walkin";
}) {
  const { s } = useStore();
  const t = useTheme();
  const [sort, setSort] = useState<"newest" | "largest">("newest");
  const [shown, setShown] = useState(20);

  const today: RefundRow[] = s.refunds.map((r) => ({ ...r, day: 60 }));
  const rows = [...today, ...REFUND_ROWS.filter((r) => r.day >= 60 - range)]
    .filter((r) => channel === "all" || r.channel === channel)
    .sort((a, b) => (sort === "newest" ? b.at - a.at : b.amount - a.amount));
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
              No refunds in this range.
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
                  {r.day === 60 ? " (today)" : ""}
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
