import { router } from "expo-router";
import { View } from "react-native";
import { useStore } from "../../src/state/store";
import { Button, Page, T } from "../../src/ui/kit";

// Walk-in order sent: the number to call out, shown large (design.md 6.4).
export default function WalkInSent() {
  const { s } = useStore();
  const o = s.orders.find((x) => x.channel === "walkin");
  return (
    <Page>
      <View style={{ alignItems: "center", marginTop: 40 }}>
        <T muted>Call out</T>
        <T v="big" style={{ fontSize: 72, lineHeight: 84 }}>
          {o?.no}
        </T>
        <T muted>{o?.name ? `for ${o.name}. ` : ""}The ticket is on the board.</T>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Button label="New walk-in order" onPress={() => router.replace("/walk-in")} />
          <Button
            label="Back to the board"
            variant="ghost"
            onPress={() => router.navigate("/board")}
          />
        </View>
      </View>
    </Page>
  );
}
