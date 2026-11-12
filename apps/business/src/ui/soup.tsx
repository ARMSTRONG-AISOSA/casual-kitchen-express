import { useState } from "react";
import { Pressable, View } from "react-native";
import { api } from "../api";
import { refreshCatalog } from "../state/catalog";
import { log, useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Card, Chip, Chips, Field, Section, Sheet, T } from "./kit";
import { PhotoEditor } from "./photo-editor";
import { Thumb } from "./thumb";
import { useToast } from "./toast";

type Soup = { id?: string; name: string };

// Soup of the day (KIT-17). Kitchen staff pick today's soup on Sold out; managers can also pick it
// on Menu, where they add and remove soups in the rotation (`editable`). With the API connected,
// every change is saved to the database and the customer app picks it up; without it, changes stay
// in this app's demo data.
export function SoupOfTheDay({ editable = false }: { editable?: boolean }) {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Soup | null>(null);
  // The soup whose photo is being added or changed. A new soup opens it straight away (optional).
  const [photoFor, setPhotoFor] = useState<{ id: string; name: string; isNew?: boolean } | null>(
    null,
  );
  const live = s.catalogFrom === "api" && !!api;

  // Runs a change, showing the API's plain-English message if it's refused.
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn’t save. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (soup: Soup) =>
    run(async () => {
      if (live && soup.id) {
        await api!.setSoupOfTheDay(soup.id);
        await refreshCatalog();
      }
      set((st) => ({
        soupToday: soup.name,
        menu: st.menu.map((m) =>
          m.id === "soup" ? { ...m, desc: `Today it’s ${soup.name.toLowerCase()}.` } : m,
        ),
        ...log(st, "setting", `Set the soup of the day to ${soup.name}`),
      }));
      toast(`Soup of the day: ${soup.name}`);
    });

  const add = () =>
    run(async () => {
      const clean = name.trim().replace(/\s+/g, " ");
      if (clean.length < 2) throw new Error("Enter the soup’s name");
      if (live) {
        const res = await api!.addSoup(clean);
        set({ soups: res.soups });
        await refreshCatalog();
        setPhotoFor({ id: res.soup.id, name: res.soup.name, isNew: true });
      } else {
        if (s.soups.some((x) => x.name.toLowerCase() === clean.toLowerCase()))
          throw new Error(`${clean} is already in the rotation`);
        set((st) => ({ soups: [...st.soups, { name: clean }] }));
      }
      set((st) => log(st, "setting", `Added ${clean} to the soup rotation`));
      setName("");
      toast(`${clean} added to the rotation`);
    });

  const remove = (soup: Soup) =>
    run(async () => {
      if (live && soup.id) {
        const res = await api!.removeSoup(soup.id);
        set({ soups: res.soups });
        await refreshCatalog();
      } else {
        set((st) => ({ soups: st.soups.filter((x) => x.name !== soup.name) }));
      }
      set((st) => log(st, "setting", `Removed ${soup.name} from the soup rotation`));
      setRemoving(null);
      toast(`${soup.name} removed from the rotation`);
    });

  return (
    <Section title="Soup of the day">
      <Card style={{ marginTop: 0 }}>
        <T muted>Choose today’s soup each morning. The customer app shows it when people order.</T>
        <Chips style={{ marginTop: 10 }}>
          {s.soups.map((soup) => (
            <Chip
              key={soup.id ?? soup.name}
              label={soup.name}
              selected={s.soupToday === soup.name}
              onPress={() => pick(soup)}
            />
          ))}
        </Chips>

        {editable ? (
          <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 8 }}>
            <T v="label" style={{ marginTop: 8 }}>
              Soups in the rotation
            </T>
            {s.soups.map((soup) => {
              const today = s.soupToday === soup.name;
              return (
                <View
                  key={soup.id ?? soup.name}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: t.line,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable
                      disabled={!live || !soup.id}
                      onPress={() => soup.id && setPhotoFor({ id: soup.id, name: soup.name })}
                      accessibilityRole="button"
                      accessibilityLabel={`Photo of ${soup.name}`}
                    >
                      <Thumb soup={soup.name} size={40} />
                    </Pressable>
                    <T>
                      {soup.name}
                      {today ? " (today)" : ""}
                    </T>
                  </View>
                  <Button
                    label="Remove"
                    variant="ghost"
                    small
                    disabled={busy || today || s.soups.length <= 1}
                    onPress={() => setRemoving(soup)}
                  />
                </View>
              );
            })}
            <T v="small" muted style={{ marginTop: 6 }}>
              Tap a soup’s photo to add or change it. Today’s soup can’t be removed, so pick another
              first. At least one soup stays.
            </T>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Add a soup"
                  value={name}
                  onChangeText={setName}
                  placeholder="For example Banga"
                  autoCapitalize="words"
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={add}
                />
              </View>
              <Button label="Add" disabled={busy || !name.trim()} onPress={add} />
            </View>
          </View>
        ) : null}

        <T v="small" muted style={{ marginTop: 10 }}>
          {live
            ? "Saved for every app. Customers see it the next time their app opens or comes back to the screen."
            : "Demo data: not connected to the API, so changes stay on this tablet."}
        </T>
      </Card>

      <Sheet
        visible={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
      >
        <T muted>
          It leaves the rotation and the customer app. Past orders keep it. You can add it again
          later.
        </T>
        <Button
          label="Remove from the rotation"
          style={{ marginTop: 16 }}
          disabled={busy}
          onPress={() => removing && remove(removing)}
        />
      </Sheet>
      <PhotoEditor
        visible={!!photoFor}
        onClose={() => setPhotoFor(null)}
        kind="soup"
        targetId={photoFor?.id}
        title={photoFor ? `${photoFor.name}${photoFor.isNew ? " (optional)" : ""}` : ""}
        currentUri={photoFor ? s.photos[photoFor.name] : undefined}
        photoKey={photoFor?.name}
        onSaved={refreshCatalog}
      />
    </Section>
  );
}
