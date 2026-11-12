import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { DELIVERY_STEPS, PICKUP_STEPS } from "../../src/data/order";
import { archiveOrder, useStore, type PastOrder } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Row, Screen, Segmented, T } from "../../src/ui/kit";

// Two tabs: In progress and Order history, including cancelled orders. Any past order can be reordered (CUS-13).
export default function OrdersScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const [tab, setTab] = useState<"progress" | "history">("progress");

  const o = s.order;
  const steps = o ? (o.mode === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS) : [];
  const finished = !!o && (o.cancelled || o.stage >= steps.length - 1);
  const live = !!o && !finished;
  const past: PastOrder[] = finished && o ? (archiveOrder(s).history ?? []) : s.history;

  const reorder = (p: PastOrder) => {
    set((x) => ({ ...(finished ? archiveOrder(x) : {}), cart: p.lines.map((l) => ({ ...l })) }));
    router.push("/checkout");
  };

  return (
    <Screen
      tabs
      header={
        <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
          <T v="h1">Orders</T>
        </View>
      }
    >
      <View style={{ marginTop: 10 }}>
        <Segmented
          options={[
            ["progress", "In progress"],
            ["history", "Order history"],
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === "progress" ? (
        live && o ? (
          <Pressable
            onPress={() => router.push("/track")}
            accessibilityRole="button"
            accessibilityHint="Opens tracking"
          >
            <Card>
              <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <T v="label">Order {o.no}</T>
                  <T v="small" muted numberOfLines={2}>
                    {o.items}
                  </T>
                  <T v="small" muted>
                    {naira(o.total)}
                  </T>
                </View>
                <View style={[styles.pill, { backgroundColor: t.chip }]}>
                  <T v="small" bold>
                    {steps[o.stage]?.[0] ?? ""}
                  </T>
                </View>
              </Row>
            </Card>
          </Pressable>
        ) : (
          <>
            <T muted style={{ marginTop: 18 }}>
              Nothing in progress. Your next order will show here while it’s on its way.
            </T>
            <Button
              label="Browse the menu"
              onPress={() => router.navigate("/")}
              style={{ marginTop: 14 }}
            />
          </>
        )
      ) : past.length ? (
        <Card>
          {past.map((p, i) => (
            <View
              key={`${p.no}-${i}`}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
              ]}
            >
              <View style={{ flex: 1 }}>
                <T v="label" numberOfLines={2}>
                  {p.items}
                </T>
                <T v="small" muted>
                  {p.no}, {p.date}, {naira(p.total)}
                </T>
                <T v="small" muted>
                  {p.status}
                </T>
              </View>
              <Button label="Reorder" variant="ghost" small onPress={() => reorder(p)} />
            </View>
          ))}
        </Card>
      ) : (
        <T muted style={{ marginTop: 18 }}>
          No past orders yet. They’ll appear here after your first delivery.
        </T>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: 160 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
});
