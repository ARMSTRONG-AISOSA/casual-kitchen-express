import { fontFamily, naira } from "@cke/brand-tokens";
import { router, useFocusEffect } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CATEGORIES,
  describe,
  dishName,
  MENU,
  photoOf,
  type CategoryId,
  type MenuItem,
} from "../../src/data/menu";
import { refreshCatalog } from "../../src/state/catalog";
import {
  addLine,
  cartCount,
  cartFood,
  defaults,
  makeLine,
  optLabel,
  unitPrice,
  useStore,
} from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import {
  BrandIcon,
  Button,
  Chip,
  Logo,
  Notice,
  Row,
  Screen,
  SectionTitle,
  T,
} from "../../src/ui/kit";
import { PhotoPlaceholder } from "../../src/ui/photo";
import { useToast } from "../../src/ui/toast";

export default function MenuScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [q, setQ] = useState("");
  const soup = s.soupToday;

  // Check for a new soup of the day (or menu change) each time the Menu tab comes into view. An
  // unchanged catalog costs a tiny 304 (architecture.md 14.4).
  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, []),
  );

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = MENU.filter(
      (m) =>
        (cat === "all" || m.cat === cat) &&
        (!query || `${dishName(m, soup)} ${describe(m, soup)}`.toLowerCase().includes(query)),
    );
    return CATEGORIES.slice(1)
      .map((c) => ({ label: c.label, items: list.filter((m) => m.cat === c.id) }))
      .filter((g) => g.items.length);
  }, [cat, q, soup]);

  const last = s.history[0];
  const open = s.open === "open";

  const quickAdd = (m: MenuItem) => {
    set((st) => ({ cart: addLine(st.cart, makeLine(m.id, defaults(m, st.soupToday))) }));
    toast(`${dishName(m, s.soupToday)} added`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen tabs bottomSpace={s.cart.length ? 110 : 30}>
        <Row style={{ justifyContent: "space-between", paddingTop: 6, paddingBottom: 4 }}>
          <Logo height={26} />
          <OpenPill />
        </Row>

        <View style={[styles.hero, { backgroundColor: t.hero }]}>
          <View style={{ maxWidth: 230 }}>
            <T v="display" color={t.onHero}>
              Tastes like home. Arrives fast.
            </T>
            <T v="small" color={t.heroMuted} style={{ marginTop: 6 }}>
              {s.hasAddress
                ? `Delivering to ${s.address.area} for ${naira(s.fee)}.`
                : `We deliver from Uselu to Oluku Market for ${naira(s.fee)}.`}
            </T>
          </View>
          <View style={styles.heroIcon} pointerEvents="none">
            <BrandIcon size={120} onDark />
          </View>
        </View>

        {!open ? (
          <Notice>
            {s.open === "paused"
              ? "New orders are paused for a short while. You can still browse."
              : "Online orders open from 8:00 am to 6:00 pm. You can still browse, and walk-in service runs until 8:30 pm."}
          </Notice>
        ) : null}

        {last && open ? (
          <View style={[styles.reorder, { backgroundColor: t.surface, borderColor: t.yellow }]}>
            <View style={{ flex: 1 }}>
              <T v="h2">Order it again</T>
              <T v="small" muted numberOfLines={2}>
                {last.items}
              </T>
              <T v="small" style={{ marginTop: 2 }}>
                <T v="small" bold>
                  {naira(last.total)}
                </T>{" "}
                with delivery
              </T>
            </View>
            <Button
              label="Reorder"
              small
              onPress={() => {
                set({ cart: last.lines.map((l) => ({ ...l })), mode: "delivery" });
                router.push("/checkout");
              }}
            />
          </View>
        ) : null}

        <View style={[styles.search, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Search size={20} color={t.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search the menu"
            placeholderTextColor={t.muted}
            accessibilityLabel="Search the menu"
            style={[styles.searchInput, { color: t.text }]}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -18 }}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>

        {groups.length ? (
          groups.map((g) => (
            <View key={g.label}>
              <SectionTitle>{g.label}</SectionTitle>
              {g.items.map((m) => (
                <MenuCard key={m.id} item={m} onAdd={() => quickAdd(m)} />
              ))}
            </View>
          ))
        ) : (
          <T muted style={{ marginTop: 20 }}>
            No dishes match “{q}”. Try another word.
          </T>
        )}
      </Screen>
      <OrderBar />
    </View>
  );
}

function OpenPill() {
  const { s } = useStore();
  const t = useTheme();
  const label =
    s.open === "open"
      ? "Open until 6:00 pm"
      : s.open === "paused"
        ? "Orders paused"
        : "Opens at 8:00 am";
  return (
    <View style={[styles.pill, { backgroundColor: t.chip }]}>
      <View style={[styles.dot, { backgroundColor: s.open === "open" ? t.success : t.accent }]} />
      <T v="small" bold>
        {label}
      </T>
    </View>
  );
}

function MenuCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const t = useTheme();
  const { s } = useStore();
  const d = defaults(item, s.soupToday);
  const label = optLabel(item, d);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.line },
        item.soldOut && { opacity: 0.6 },
      ]}
    >
      <PhotoPlaceholder
        height={96}
        width={96}
        label={photoOf(item, s.soupToday)}
        caption={item.id === "soup" || item.id === "xsoup"}
      />
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => router.push(`/item/${item.id}`)}
          accessibilityRole="button"
          accessibilityHint="Opens the dish details"
        >
          <T v="h3">{dishName(item, s.soupToday)}</T>
          <T v="small" muted numberOfLines={2}>
            {describe(item, s.soupToday)}
          </T>
          {label ? (
            <T v="small" bold style={{ marginTop: 2 }}>
              {label}
            </T>
          ) : null}
        </Pressable>
        <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
          <T v="price">{naira(unitPrice(item, d))}</T>
          {item.soldOut ? (
            <View style={[styles.soldTag, { backgroundColor: t.chip }]}>
              <T v="small" bold>
                Sold out today
              </T>
            </View>
          ) : (
            <Pressable
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel={`Add ${dishName(item, s.soupToday)}`}
              style={({ pressed }) => [
                styles.add,
                { backgroundColor: t.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus size={22} color={t.onPrimary} strokeWidth={2.5} />
            </Pressable>
          )}
        </Row>
      </View>
    </View>
  );
}

/** The sticky order bar with the item count and running total (CUS-04). */
function OrderBar() {
  const { s } = useStore();
  const t = useTheme();
  if (!s.cart.length) return null;
  const n = cartCount(s.cart);
  return (
    <Pressable
      onPress={() => router.push("/cart")}
      accessibilityRole="button"
      accessibilityLabel={`View order, ${n} item${n > 1 ? "s" : ""}, ${naira(cartFood(s.cart))}`}
      style={({ pressed }) => [
        styles.orderbar,
        { backgroundColor: t.primary },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.speed}>
        {[16, 11, 14].map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: 3,
              borderRadius: 2,
              backgroundColor: t.yellow,
              marginLeft: i === 1 ? 5 : i === 2 ? 2 : 0,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, color: t.onPrimary }}>
          View order
        </Text>
        <Text
          style={{ fontFamily: fontFamily.body, fontSize: 13, color: t.onPrimary, opacity: 0.85 }}
        >
          {n} item{n > 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 17, color: t.onPrimary }}>
        {naira(cartFood(s.cart))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 8, padding: 18, borderRadius: 20, overflow: "hidden", minHeight: 150 },
  heroIcon: { position: "absolute", right: -14, bottom: -6, opacity: 0.95 },
  reorder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, minHeight: 48, fontFamily: fontFamily.body, fontSize: 16 },
  chips: { gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  soldTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  orderbar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    minHeight: 62,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 6,
  },
  speed: { gap: 4 },
});
