import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { toTab } from "../src/nav";
import { StyleSheet, View } from "react-native";
import { dishName, findItem } from "../src/data/menu";
import { cartFood, useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Card, Line, Qty, Screen, Segmented, T, TopBar } from "../src/ui/kit";

// Your order: change quantities, choose delivery or pickup, then go to checkout (design.md 4.2).
export default function CartScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const open = s.open === "open";
  const food = cartFood(s.cart);
  const fee = s.mode === "delivery" ? s.fee : 0;

  if (!s.cart.length) {
    return (
      <Screen header={<TopBar title="Your order" />}>
        <T muted style={{ marginTop: 8 }}>
          Your order is empty. Add something from the menu.
        </T>
        <Button label="Browse the menu" onPress={() => toTab("/")} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const changeQty = (i: number, n: number) =>
    set((st) => ({
      cart:
        n <= 0
          ? st.cart.filter((_, j) => j !== i)
          : st.cart.map((c, j) => (j === i ? { ...c, qty: n } : c)),
    }));

  return (
    <Screen
      header={<TopBar title="Your order" />}
      footer={
        <>
          {!open ? (
            <T v="small" muted center style={{ marginBottom: 8 }}>
              {s.open === "paused" ? "Orders are paused" : "Online orders open at 8:00 am"}
            </T>
          ) : null}
          <Button
            label="Go to checkout"
            onPress={() => router.push("/checkout")}
            disabled={!open}
          />
        </>
      }
    >
      <Segmented
        options={[
          ["delivery", "Delivery"],
          ["pickup", "Pickup"],
        ]}
        value={s.mode}
        onChange={(mode) => set({ mode })}
      />
      <Card>
        {s.cart.map((c, i) => (
          <View
            key={`${c.id}-${i}`}
            style={[
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
            ]}
          >
            <View style={{ flex: 1 }}>
              <T v="label">{lineName(c.id, c.opt.soup)}</T>
              {c.label ? (
                <T v="small" muted>
                  {c.label}
                </T>
              ) : null}
              <T v="small" muted>
                {naira(c.unit)} each
              </T>
            </View>
            <Qty value={c.qty} onChange={(n) => changeQty(i, n)} />
          </View>
        ))}
      </Card>
      <Button
        label="Add more"
        variant="ghost"
        small
        onPress={() => toTab("/")}
        style={{ marginTop: 12 }}
      />
      <Card>
        <Line label="Food" value={naira(food)} />
        <Line
          label={s.mode === "delivery" ? "Delivery" : "Pickup"}
          value={s.mode === "delivery" ? naira(fee) : "Free"}
        />
        <Line label="Total" value={naira(food + fee)} total />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
});

/** A line's dish name, with the soup it was ordered with (KIT-17). */
function lineName(id: string, soup?: string) {
  const it = findItem(id);
  return it ? dishName(it, soup) : id;
}
