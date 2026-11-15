import { router } from "expo-router";
import { toTab } from "../nav";
import { StyleSheet, View } from "react-native";
import { DELIVERY_STEPS, PICKUP_STEPS } from "../data/order";
import { firstTimeCustomer, makeLine, returningCustomer, useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Chip, T } from "./kit";

/**
 * Development-only controls for previewing states that the kitchen, riders, and managers will
 * drive once the backend exists. Shown only in development builds (__DEV__), never in releases.
 */
export function PreviewTools() {
  const { s, set, reset } = useStore();
  const t = useTheme();
  const steps = s.order
    ? s.order.mode === "delivery"
      ? DELIVERY_STEPS
      : PICKUP_STEPS
    : DELIVERY_STEPS;

  const ensureOrder = () =>
    s.order ?? {
      no: "O-2173",
      mode: s.mode,
      food: 3300,
      fee: s.mode === "delivery" ? s.fee : 0,
      total: 3300 + (s.mode === "delivery" ? s.fee : 0),
      stage: 2,
      items: "Jollof rice, Fried plantain, Soft drink",
      lines: [makeLine("jollof"), makeLine("plantain"), makeLine("soda")],
      pay: "card" as const,
      placedAt: Date.now(),
    };

  const move = (d: number) => {
    const o = ensureOrder();
    const max = (o.mode === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS).length - 1;
    set({ order: { ...o, stage: Math.max(0, Math.min(max, o.stage + d)) } });
    // Close what's open first, so pressing the button again doesn't stack more tracking screens.
    if (router.canDismiss()) router.dismissAll();
    router.push("/track");
  };

  const row = (label: string, children: React.ReactNode) => (
    <View style={{ marginTop: 12 }}>
      <T v="small" muted bold>
        {label}
      </T>
      <View style={styles.chips}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.box, { borderColor: t.line }]}>
      <T v="h2">Preview tools</T>
      <T v="small" muted>
        Development builds only. In the real app the kitchen, riders, and managers drive these.
      </T>
      {row(
        "Customer",
        <>
          <Chip
            label="First time"
            selected={!s.returning}
            onPress={() => set({ ...firstTimeCustomer(), order: null, cart: [] })}
          />
          <Chip
            label="Returning"
            selected={s.returning}
            onPress={() => set({ ...returningCustomer(), order: null, cart: [] })}
          />
        </>,
      )}
      {row(
        "Online ordering",
        <>
          <Chip label="Open" selected={s.open === "open"} onPress={() => set({ open: "open" })} />
          <Chip
            label="After 6:00 pm"
            selected={s.open === "closed"}
            onPress={() => set({ open: "closed" })}
          />
          <Chip
            label="Paused"
            selected={s.open === "paused"}
            onPress={() => set({ open: "paused" })}
          />
        </>,
      )}
      {row(
        s.catalogFrom === "api"
          ? "Soup of the day (from the API; change it in the Business app)"
          : "Soup of the day (set by the manager)",
        <>
          {s.soups.map((soup) => (
            <Chip
              key={soup}
              label={soup}
              selected={s.soupToday === soup}
              onPress={() => set({ soupToday: soup })}
            />
          ))}
        </>,
      )}
      {row(
        "Delivery fee (set by the manager)",
        <>
          <Chip label="₦1,500" selected={s.fee === 1500} onPress={() => set({ fee: 1500 })} />
          <Chip label="₦2,000" selected={s.fee === 2000} onPress={() => set({ fee: 2000 })} />
        </>,
      )}
      {row(
        "Tracking order type",
        <>
          <Chip
            label="Delivery"
            selected={(s.order?.mode ?? "delivery") === "delivery"}
            onPress={() => set({ order: { ...ensureOrder(), mode: "delivery" } })}
          />
          <Chip
            label="Pickup"
            selected={s.order?.mode === "pickup"}
            onPress={() =>
              set({
                order: {
                  ...ensureOrder(),
                  mode: "pickup",
                  stage: Math.min(ensureOrder().stage, 5),
                  fee: 0,
                },
              })
            }
          />
        </>,
      )}
      {row(
        `Order status${s.order ? ": " + (steps[s.order.stage]?.[0] ?? "") : ""}`,
        <>
          <Chip label="Back a step" onPress={() => move(-1)} />
          <Chip label="Advance status" onPress={() => move(1)} />
        </>,
      )}
      {row(
        "Cancellations in the last 7 days",
        <>
          <Chip
            label="0"
            selected={s.recentCancels === 0}
            onPress={() => set({ recentCancels: 0 })}
          />
          <Chip
            label="3 (limit reached)"
            selected={s.recentCancels >= 3}
            onPress={() => set({ recentCancels: 3 })}
          />
        </>,
      )}
      <Button
        label="Show the out-of-range address"
        variant="ghost"
        small
        style={{ marginTop: 14 }}
        onPress={() => router.push("/address?example=outside")}
      />
      <Button
        label="Reset the preview"
        variant="ghost"
        small
        style={{ marginTop: 8 }}
        onPress={() => {
          reset();
          toTab("/");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
});
