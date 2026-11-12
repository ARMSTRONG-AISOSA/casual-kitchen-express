import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Card, Line, Screen, T } from "../src/ui/kit";

// A short moment of celebration, then straight to tracking (design.md 3.5).
export default function PaidScreen() {
  const { s } = useStore();
  const t = useTheme();
  const o = s.order;
  return (
    <Screen footer={<Button label="Track my order" onPress={() => router.replace("/track")} />}>
      <View style={{ alignItems: "center", marginTop: 48 }}>
        <Animated.View
          entering={ZoomIn.springify()}
          style={[styles.check, { backgroundColor: t.success }]}
        >
          <Check size={56} color={t.mode === "dark" ? "#000" : "#fff"} strokeWidth={3} />
        </Animated.View>
        <T v="display" style={{ marginTop: 18 }}>
          Order placed
        </T>
        <T muted style={{ marginTop: 4 }}>
          Order {o?.no ?? "O-2173"}. Payment confirmed.
        </T>
      </View>
      <Card style={{ marginTop: 24 }}>
        <Line label="Paid" value={naira(o?.total ?? 0)} />
        <Line label="Method" value={o?.pay === "transfer" ? "Demo bank transfer" : "Demo card"} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  check: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
