import { router } from "expo-router";
import { toDeliveries } from "../../src/nav";
import { Pressable, StyleSheet, View } from "react-native";
import { km, orderLoad, readyText } from "../../src/data/orders";
import { useRiderOps } from "../../src/state/live";
import { MAX_ORDERS, fits, usedLoad, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, NewOrderBanner, Screen, StateBanner, T, TopBar } from "../../src/ui/kit";

// The queue shows only orders that fit what the rider already carries (RID-03, RID-05).
export default function Queue() {
  const { s, set } = useStore();
  const ops = useRiderOps();
  const t = useTheme();
  if (!s.online) {
    return (
      <Screen
        tabs
        header={<TopBar title="Queue" />}
        footer={<Button label="Go online" onPress={() => void ops.setOnline(true)} />}
      >
        <StateBanner kind="off" label="You’re offline" />
        <T style={{ marginTop: 14 }}>Go online to see orders that are ready.</T>
      </Screen>
    );
  }
  const list = s.queue.filter((o) => fits(s, o));
  // Live, the server already left out what won’t fit and says how many (section 6).
  const hidden = s.live ? s.hidden : s.queue.length - list.length;
  return (
    <Screen tabs header={<TopBar title="Queue" />}>
      {s.newOrder && list.length ? <NewOrderBanner label="New order ready" /> : null}
      <T muted style={{ marginTop: 12 }}>
        Carrying {s.carrying.length} of {MAX_ORDERS} orders. Load {usedLoad(s)} of {s.budget}.
      </T>
      {list.map((o) => (
        <Pressable
          key={o.no}
          onPress={() => {
            set({ newOrder: false });
            router.push(`/order/${o.no}`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${o.no}, ${o.area}, ${km(o.km)}, load ${orderLoad(o)} of ${s.budget}`}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: t.surface, borderColor: t.border },
            pressed && { opacity: 0.75 },
          ]}
        >
          <T v="key">{o.no}</T>
          <T v="title" style={{ marginTop: 2 }}>
            {o.area}
          </T>
          <View style={styles.meta}>
            <T>{km(o.km)}</T>
            <T>
              Load {orderLoad(o)} of {s.budget}
            </T>
            <T muted>{readyText(o.readyMins)}</T>
          </View>
        </Pressable>
      ))}
      {!list.length ? (
        <T style={{ marginTop: 18 }}>
          {s.queue.length
            ? "No orders fit what you’re carrying. Deliver first, then check again."
            : "No orders are ready right now."}
        </T>
      ) : null}
      {hidden > 0 && list.length ? (
        <T v="small" muted style={{ marginTop: 14 }}>
          {hidden} more order{hidden === 1 ? "" : "s"} won’t fit what you’re carrying.
        </T>
      ) : null}
      {s.carrying.length ? (
        <Button
          label="Go to my deliveries"
          variant="alt"
          onPress={toDeliveries}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: 14, padding: 16, marginTop: 12 },
  meta: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 2, marginTop: 6 },
});
