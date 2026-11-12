import { fontFamily, naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CATEGORIES, type CategoryId } from "../../src/data/seed";
import { dishName, draftTotal, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Chip, Chips, Field, Segmented, T } from "../../src/ui/kit";

// New walk-in order (KIT-13): one tap per item, then Charge.
export default function WalkIn() {
  const { s, set } = useStore();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState<CategoryId>("rice");
  const d = s.draft;
  const total = draftTotal(s);
  const qty = (id: string, delta: number) =>
    set((st) => ({
      draft: {
        ...st.draft,
        lines: { ...st.draft.lines, [id]: Math.max(0, (st.draft.lines[id] ?? 0) + delta) },
      },
    }));
  const items = s.menu.filter((m) => m.cat === cat);
  const chosen = Object.entries(d.lines).filter(([, q]) => q > 0);
  // Beside the tiles on a landscape tablet, so Charge is always in reach.
  const side = width >= 900;

  const summary = (
    <View
      style={[
        styles.summary,
        { backgroundColor: t.surface, borderColor: t.line },
        side && { width: 300, marginTop: 0 },
      ]}
    >
      <T v="h2">This order</T>
      {chosen.length ? (
        chosen.map(([id, q]) => {
          const m = s.menu.find((x) => x.id === id)!;
          return (
            <View key={id} style={styles.line}>
              <T v="label" style={{ flex: 1 }}>
                {q} × {dishName(m, s.soupToday)}
              </T>
              <Pressable
                onPress={() => qty(id, -1)}
                accessibilityLabel={`Remove one ${dishName(m, s.soupToday)}`}
                style={[styles.minus, { borderColor: t.line }]}
              >
                <Text style={[styles.minusText, { color: t.text }]}>−</Text>
              </Pressable>
            </View>
          );
        })
      ) : (
        <T muted style={{ marginTop: 6 }}>
          Tap items to add them.
        </T>
      )}
      <View style={{ marginTop: 12 }}>
        <Segmented
          options={[
            ["takeaway", "Take away"],
            ["eatin", "Eat in"],
          ]}
          value={d.type}
          onChange={(type) => set((st) => ({ draft: { ...st.draft, type } }))}
        />
      </View>
      <Field
        label="Name (optional)"
        value={d.name}
        onChangeText={(name) => set((st) => ({ draft: { ...st.draft, name } }))}
        placeholder="To call out when ready"
      />
      <Button
        label={`Charge ${naira(total)}`}
        disabled={!total}
        style={{ marginTop: 14 }}
        onPress={() => router.push("/walk-in-pay")}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: side ? "row" : "column" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Chips>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </Chips>
        <View style={styles.tiles}>
          {items.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => qty(m.id, 1)}
              disabled={m.soldOut}
              accessibilityRole="button"
              accessibilityLabel={`Add ${dishName(m, s.soupToday)}, ${naira(m.price)}`}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: t.surface, borderColor: d.lines[m.id] ? t.primary : t.line },
                m.soldOut && { opacity: 0.4 },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={[styles.tileName, { color: t.text }]}>{dishName(m, s.soupToday)}</Text>
              <T muted>{m.soldOut ? "Sold out" : naira(m.price)}</T>
              {d.lines[m.id] ? (
                <View style={[styles.q, { backgroundColor: t.primary }]}>
                  <Text style={[styles.qText, { color: t.onPrimary }]}>{d.lines[m.id]}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
        {!side ? summary : null}
      </ScrollView>
      {side ? (
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 18 }}>
          {summary}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  tile: {
    flexGrow: 1,
    flexBasis: 170,
    minHeight: 104,
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-between",
  },
  tileName: { fontFamily: fontFamily.bodyBold, fontSize: 17 },
  q: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  qText: { fontFamily: fontFamily.bodyBold, fontSize: 16 },
  summary: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  minus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  minusText: { fontFamily: fontFamily.bodyBold, fontSize: 22 },
});
