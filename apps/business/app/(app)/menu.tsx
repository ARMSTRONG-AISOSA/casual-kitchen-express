import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { CATEGORIES } from "../../src/data/seed";
import { useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Page, Section, T } from "../../src/ui/kit";
import { SoupOfTheDay } from "../../src/ui/soup";
import { PhotoEditor } from "../../src/ui/photo-editor";
import { CATALOG_NAME, Thumb } from "../../src/ui/thumb";
import { refreshCatalog } from "../../src/state/catalog";
import { useToast } from "../../src/ui/toast";

// Menu list (MGR-05, MGR-07): categories and items with prices and a one-tap sold-out switch.
export default function Menu() {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [photoFor, setPhotoFor] = useState<{ id: string; name: string } | null>(null);
  // Tap a dish's photo to add or change it (MGR-06). The soup dishes show today's soup's photo,
  // which is changed under Soups in the rotation.
  const editPhoto = (dishId: string) => {
    if (dishId === "soup" || dishId === "xsoup")
      return toast("This dish shows today’s soup’s photo. Change it under Soups in the rotation.");
    const name = CATALOG_NAME[dishId];
    const id = name ? s.catalogIds[name] : undefined;
    if (!id) return toast("Connect to the API to change photos.");
    setPhotoFor({ id, name: name! });
  };
  return (
    <Page>
      <Button
        label="Add item"
        small
        style={{ alignSelf: "flex-start" }}
        onPress={() => router.push("/item/new")}
      />
      <SoupOfTheDay editable />
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
                    onPress={() => editPhoto(m.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo of ${m.name}`}
                  >
                    <Thumb dish={m.id} />
                  </Pressable>
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
      <PhotoEditor
        visible={!!photoFor}
        onClose={() => setPhotoFor(null)}
        kind="menu-item"
        targetId={photoFor?.id}
        title={photoFor?.name ?? ""}
        currentUri={photoFor ? s.photos[photoFor.name] : undefined}
        photoKey={photoFor?.name}
        onSaved={refreshCatalog}
      />
    </Page>
  );
}
