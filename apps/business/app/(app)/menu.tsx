import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { Pressable, Switch, View } from "react-native";
import { CATEGORIES } from "../../src/data/seed";
import { useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Page, Section, T } from "../../src/ui/kit";
import { SoupOfTheDay } from "../../src/ui/soup";

// Menu list (MGR-05, MGR-07): categories and items with prices and a one-tap sold-out switch.
export default function Menu() {
  const { s, set } = useStore();
  const t = useTheme();
  return (
    <Page>
      <Button
        label="Add item"
        small
        style={{ alignSelf: "flex-start" }}
        onPress={() => router.push("/item/new")}
      />
      <SoupOfTheDay />
      {CATEGORIES.map((c) => {
        const items = s.menu.filter((m) => m.cat === c.id);
        if (!items.length) return null;
        return (
          <Section key={c.id} title={c.label}>
            <Card style={{ marginTop: 0, paddingVertical: 4 }}>
              {items.map((m) => (
                <View
                  key={m.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: t.line,
                  }}
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/item/${m.id}`)}
                    accessibilityRole="button"
                  >
                    <T v="label">{m.name}</T>
                    <T v="small" muted>
                      {naira(m.price)}, {m.station}, load {m.load}
                    </T>
                  </Pressable>
                  <T v="small" muted>
                    {m.soldOut ? "Sold out" : "On"}
                  </T>
                  <Switch
                    value={!m.soldOut}
                    onValueChange={(on) =>
                      set((st) => ({
                        menu: st.menu.map((x) => (x.id === m.id ? { ...x, soldOut: !on } : x)),
                      }))
                    }
                    accessibilityLabel={`${m.name} available`}
                    trackColor={{ true: t.success, false: t.line }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </Card>
          </Section>
        );
      })}
    </Page>
  );
}
