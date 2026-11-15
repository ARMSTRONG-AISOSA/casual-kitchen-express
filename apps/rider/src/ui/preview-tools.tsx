import { naira } from "@cke/brand-tokens";
import { toTabs } from "../nav";
import { View } from "react-native";
import { QUEUE } from "../data/orders";
import { initial, useStore } from "../state/store";
import { Button, Card, Segmented, T } from "./kit";

// Development builds only. In the real app the kitchen, managers, and other riders drive these.
export function PreviewTools() {
  const { s, set } = useStore();
  const carrying = s.carrying.length === 0 ? "none" : s.carrying.length === 1 ? "one" : "two";
  const setCarrying = (v: "none" | "one" | "two") => {
    const nos = v === "none" ? [] : v === "one" ? ["O-2174"] : ["O-2174", "O-2175"];
    const picks = QUEUE.filter((q) => nos.includes(q.no));
    set({
      online: true,
      carrying: picks.map((o) => ({ ...o, picked: false })),
      queue: QUEUE.filter((q) => !picks.includes(q)),
      codeTries: 0,
    });
  };
  return (
    <Card style={{ marginTop: 28, borderStyle: "dashed" }} strong>
      <T v="h2">Preview tools</T>
      <T v="small" muted style={{ marginTop: 4 }}>
        Development builds only. In the real app the kitchen, managers, and other riders drive
        these.
      </T>
      <View style={{ gap: 14, marginTop: 14 }}>
        <View style={{ gap: 6 }}>
          <T v="small">Carrying</T>
          <Segmented
            label="Carrying"
            options={[
              ["none", "Nothing"],
              ["one", "One"],
              ["two", "Two"],
            ]}
            value={carrying}
            onChange={setCarrying}
          />
        </View>
        <View style={{ gap: 6 }}>
          <T v="small">Pay per delivery (set by the manager)</T>
          <Segmented
            label="Pay per delivery"
            options={[
              ["1000", naira(1000)],
              ["1200", naira(1200)],
            ]}
            value={String(s.pay) as "1000" | "1200"}
            onChange={(v) => set({ pay: Number(v) })}
          />
        </View>
        <View style={{ gap: 6 }}>
          <T v="small">When accepting</T>
          <Segmented
            label="When accepting"
            options={[
              ["win", "This rider wins"],
              ["lose", "Another wins"],
            ]}
            value={s.raceLost ? "lose" : "win"}
            onChange={(v) => set({ raceLost: v === "lose" })}
          />
        </View>
        <Button
          label="Reset the preview"
          variant="alt"
          onPress={() => {
            set({
              ...initial(),
              me: s.me,
              signedIn: true,
              mustSetPassword: false,
              themePref: s.themePref,
            });
            toTabs();
          }}
        />
      </View>
    </Card>
  );
}
