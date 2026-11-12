import { router } from "expo-router";
import { Star } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { archiveOrder, useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Notice, Screen, T, TopBar } from "../src/ui/kit";

// One tap rates the order, and Reorder is offered straight away (CUS-18, CUS-12).
export default function RateScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const [rating, setRating] = useState(0);
  const again = () => {
    const lines = s.order?.lines ?? [];
    set((x) => ({ ...archiveOrder(x), cart: lines.map((l) => ({ ...l })) }));
    router.replace("/checkout");
  };
  return (
    <Screen
      header={<TopBar title="Rate your order" />}
      footer={<Button label="Order this again" onPress={again} />}
    >
      <T v="h1" center style={{ marginTop: 24 }}>
        How was your food?
      </T>
      <View
        style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 18 }}
        accessibilityRole="radiogroup"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            accessibilityRole="radio"
            accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
            accessibilityState={{ checked: rating === n }}
            style={{ padding: 6 }}
          >
            <Star
              size={42}
              color={t.yellow}
              fill={n <= rating ? t.yellow : "transparent"}
              strokeWidth={2}
            />
          </Pressable>
        ))}
      </View>
      {rating ? (
        <Notice kind="ok">{`Thanks. Your ${rating}-star rating is saved.`}</Notice>
      ) : (
        <T muted center style={{ marginTop: 8 }}>
          Tap a star.
        </T>
      )}
    </Screen>
  );
}
