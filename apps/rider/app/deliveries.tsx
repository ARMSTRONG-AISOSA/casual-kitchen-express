import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { KITCHEN, km } from "../src/data/orders";
import { deliverFirst, useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Card, Screen, T, TopBar } from "../src/ui/kit";
import { toQueue } from "../src/nav";

// My deliveries (RID-06): only the next stop has a big button. Later stops are listed below in
// the suggested order, nearest first, and the rider can change it.
export default function Deliveries() {
  const { s, set } = useStore();
  const t = useTheme();
  const [next, ...later] = s.carrying;
  const back = () => router.navigate("/(tabs)");
  if (!next) {
    return (
      <Screen
        header={<TopBar title="My deliveries" onBack={back} />}
        footer={<Button label="Open the queue" onPress={toQueue} />}
      >
        <T>You’re not carrying anything.</T>
      </Screen>
    );
  }
  const atKitchen = !next.picked;
  const waiting = s.carrying.filter((o) => !o.picked).length;
  return (
    <Screen
      header={<TopBar title="My deliveries" onBack={back} />}
      footer={
        <>
          <Button
            label={atKitchen ? "I’m at the kitchen" : "Go to drop-off"}
            onPress={() => router.push(atKitchen ? "/pickup" : "/drop-off")}
          />
          {s.carrying.length < 3 ? (
            <Button label="Open the queue" variant="alt" onPress={toQueue} />
          ) : null}
        </>
      }
    >
      <View style={[styles.loc, { borderColor: t.border }]}>
        <MapPin size={20} color={t.text} />
        <T v="small">Sharing your location while delivering</T>
      </View>
      <T muted style={{ marginTop: 12 }}>
        Next stop
      </T>
      <Card strong style={{ marginTop: 6 }}>
        <T v="key">{next.no}</T>
        <T v="title" style={{ marginTop: 2 }}>
          {atKitchen ? "Pick up at the kitchen" : `Deliver to ${next.area}`}
        </T>
        <T style={{ marginTop: 4 }}>
          {atKitchen
            ? `${KITCHEN}${waiting > 1 ? `. ${waiting} bags to collect.` : ""}`
            : next.landmark}
        </T>
      </Card>
      {later.length ? (
        <>
          <T muted style={{ marginTop: 18 }}>
            Then
          </T>
          {later.map((o, i) => (
            <Card key={o.no} style={{ marginTop: 8 }}>
              <T v="key">
                Stop {i + 2}: {o.area}
              </T>
              <T muted>
                {o.no}, {km(o.km)}
                {o.picked ? "" : ", not picked up yet"}
              </T>
              {!atKitchen && o.picked ? (
                <Button
                  label="Deliver this next"
                  variant="alt"
                  onPress={() => set((st) => deliverFirst(st, o.no))}
                  style={{ marginTop: 10 }}
                />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
});
