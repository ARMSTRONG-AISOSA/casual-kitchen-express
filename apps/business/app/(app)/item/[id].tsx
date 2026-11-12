import { router, useLocalSearchParams } from "expo-router";
import { ImagePlus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { CATEGORIES, type CategoryId, type MenuItem, type Station } from "../../../src/data/seed";
import { log, useStore } from "../../../src/state/store";
import { Button, Card, Chip, Chips, Field, Page, T } from "../../../src/ui/kit";
import { refreshCatalog } from "../../../src/state/catalog";
import { PhotoEditor } from "../../../src/ui/photo-editor";
import { CATALOG_NAME, Thumb } from "../../../src/ui/thumb";
import { useToast } from "../../../src/ui/toast";

const STATIONS: Station[] = ["Rice", "Soups and swallows", "Snacks and drinks"];
const LOADS: [1 | 2 | 3, string][] = [
  [1, "Light (1)"],
  [2, "Medium (2)"],
  [3, "Heavy (3)"],
];

// Item editor (MGR-05, MGR-06). Photos are cropped and compressed on the device in a later build.
export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { s, set } = useStore();
  const toast = useToast();
  const existing = s.menu.find((m) => m.id === id);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [desc, setDesc] = useState(existing?.desc ?? "");
  const [price, setPrice] = useState(existing ? String(existing.price) : "");
  const [cat, setCat] = useState<CategoryId>(existing?.cat ?? "rice");
  const [station, setStation] = useState<Station>(existing?.station ?? "Rice");
  const [load, setLoad] = useState<1 | 2 | 3>(existing?.load ?? 2);
  const n = Number(price.replace(/[^0-9]/g, ""));

  const save = () => {
    const item: MenuItem = {
      id: existing?.id ?? `item-${Date.now()}`,
      name,
      desc,
      price: n,
      cat,
      station,
      load,
      soldOut: existing?.soldOut,
    };
    set((st) => ({
      menu: existing ? st.menu.map((m) => (m.id === existing.id ? item : m)) : [...st.menu, item],
      ...(existing && existing.price !== n
        ? log(st, "setting", `Changed the price of ${name} to ₦${n.toLocaleString("en-US")}`)
        : {}),
    }));
    toast(existing ? "Item saved" : "Item added. It shows in the customer app straight away.");
    router.back();
  };

  const catalogName = existing ? CATALOG_NAME[existing.id] : undefined;
  const catalogId = catalogName ? s.catalogIds[catalogName] : undefined;
  const photoUri = catalogName ? s.photos[catalogName] : undefined;

  return (
    <Page>
      <Card style={{ marginTop: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {existing ? <Thumb dish={existing.id} size={72} /> : null}
          <Button
            label={photoUri ? "Change photo" : "Add photo"}
            variant="ghost"
            icon={(c) => <ImagePlus size={20} color={c} />}
            onPress={() => {
              if (existing && (existing.id === "soup" || existing.id === "xsoup"))
                return toast(
                  "This dish shows today’s soup’s photo. Change it on Menu, Soups in the rotation.",
                );
              if (!catalogId) return toast("Save the dish first, then add its photo.");
              setPhotoOpen(true);
            }}
          />
        </View>
        <T v="small" muted style={{ marginTop: 6 }}>
          Photos are cropped to the menu card and compressed before upload.
        </T>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Description" value={desc} onChangeText={setDesc} />
        <Field
          label="Price in naira"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
        />
        <T v="label" style={{ marginTop: 14 }}>
          Category
        </T>
        <Chips style={{ marginTop: 8 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </Chips>
        <T v="label" style={{ marginTop: 14 }}>
          Station
        </T>
        <Chips style={{ marginTop: 8 }}>
          {STATIONS.map((x) => (
            <Chip key={x} label={x} selected={station === x} onPress={() => setStation(x)} />
          ))}
        </Chips>
        <T v="label" style={{ marginTop: 14 }}>
          Load value
        </T>
        <T v="small" muted>
          Controls how many orders a rider can carry.
        </T>
        <Chips style={{ marginTop: 8 }}>
          {LOADS.map(([v, l]) => (
            <Chip key={v} label={l} selected={load === v} onPress={() => setLoad(v)} />
          ))}
        </Chips>
      </Card>
      <Button label="Save" style={{ marginTop: 16 }} disabled={!name.trim() || !n} onPress={save} />
      {existing ? (
        <Button
          label="Delete item"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => {
            set((st) => ({ menu: st.menu.filter((m) => m.id !== existing.id) }));
            toast("Item archived. Past orders keep it.");
            router.back();
          }}
        />
      ) : null}
      <PhotoEditor
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        kind="menu-item"
        targetId={catalogId}
        title={catalogName ?? name}
        currentUri={photoUri}
        photoKey={catalogName}
        onSaved={refreshCatalog}
      />
    </Page>
  );
}
