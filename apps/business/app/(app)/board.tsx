import { fontFamily } from "@cke/brand-tokens";
import { router } from "expo-router";
import { goTo } from "../../src/ui/nav";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Order, OrderStatus } from "../../src/data/seed";
import { useOps } from "../../src/state/ops";
import { firstName, minsAgo, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Badge, Button, Chip, Chips, StatusPill, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

type Filter = "all" | "online" | "walkin";
const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "new", title: "New" },
  { status: "preparing", title: "Preparing" },
  { status: "ready", title: "Ready" },
];

const typeLabel = (o: Order) =>
  o.type === "delivery"
    ? "Delivery"
    : o.type === "pickup"
      ? "Pickup"
      : o.type === "eatin"
        ? "Eat in"
        : "Take away";

// The order board (KIT-01): New, Preparing, Ready. Tap a new ticket to acknowledge it.
export default function Board() {
  const { s } = useStore();
  const ops = useOps();
  const t = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = s.orders.filter((o) => filter === "all" || o.channel === filter);

  const open = (o: Order) => {
    if (o.status === "new") {
      ops.acknowledge(o.no);
      toast(`${o.no} acknowledged`);
    } else router.push(`/ticket/${o.no}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.bar}>
        <Chips>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label="Online" selected={filter === "online"} onPress={() => setFilter("online")} />
          <Chip
            label="Walk-in"
            selected={filter === "walkin"}
            onPress={() => setFilter("walkin")}
          />
        </Chips>
        <View style={{ flex: 1 }} />
        <Button label="New walk-in order" small onPress={() => goTo("/walk-in")} />
      </View>
      <ScrollView horizontal={width < 700} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.cols, width < 700 && { width: 3 * 260 + 40 }]}>
          {COLUMNS.map((c) => {
            const list = shown
              .filter((o) => o.status === c.status)
              .sort((a, b) => a.placedAt - b.placedAt);
            return (
              <View key={c.status} style={[styles.col, { backgroundColor: t.chip }]}>
                <View style={styles.colHead}>
                  <StatusPill status={c.status} label={`${c.title} (${list.length})`} />
                </View>
                <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 30 + insets.bottom }}>
                  {list.map((o) => (
                    <Pressable
                      key={o.no}
                      onPress={() => open(o)}
                      accessibilityRole="button"
                      accessibilityHint={
                        o.status === "new" ? "Acknowledges the order" : "Opens the ticket"
                      }
                      style={({ pressed }) => [
                        styles.ticket,
                        {
                          backgroundColor: t.surface,
                          borderColor: o.status === "new" ? t.newBg : t.line,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={styles.ticketHead}>
                        <Text style={[styles.no, { color: t.text }]}>{o.no}</Text>
                        <T v="small" muted>
                          {minsAgo(o.placedAt)}
                        </T>
                      </View>
                      <View
                        style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}
                      >
                        <Badge label={o.channel === "walkin" ? "Walk-in" : "Online"} />
                        <Badge label={typeLabel(o)} />
                      </View>
                      {o.lines.map((l, i) => (
                        <T key={i} v="label" style={{ marginTop: 6, opacity: l.ticked ? 0.5 : 1 }}>
                          {l.qty} × {l.name}
                        </T>
                      ))}
                      {o.name ? (
                        <T v="small" muted style={{ marginTop: 4 }}>
                          For {o.name}
                        </T>
                      ) : null}
                      {o.status === "new" ? (
                        <T v="small" bold style={{ marginTop: 8 }}>
                          Tap to acknowledge
                        </T>
                      ) : null}
                      {o.status === "ready" && o.type === "delivery" ? (
                        <T
                          v="small"
                          bold
                          style={{ marginTop: 8 }}
                          color={o.riderId ? t.success : t.danger}
                        >
                          {o.riderId ? `Rider: ${firstName(s, o.riderId)}` : "Waiting for a rider"}
                        </T>
                      ) : null}
                      {o.status === "ready" && o.type !== "delivery" ? (
                        <T v="small" bold style={{ marginTop: 8 }}>
                          Waiting to be collected
                        </T>
                      ) : null}
                    </Pressable>
                  ))}
                  {!list.length ? (
                    <T muted center style={{ marginTop: 20 }}>
                      Nothing here
                    </T>
                  ) : null}
                </ScrollView>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexWrap: "wrap",
  },
  cols: { flex: 1, flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  col: { flex: 1, borderRadius: 16, padding: 10 },
  colHead: { paddingBottom: 10 },
  ticket: { borderRadius: 14, borderWidth: 2, padding: 12 },
  ticketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  no: { fontFamily: fontFamily.bodyBold, fontSize: 24 },
});
