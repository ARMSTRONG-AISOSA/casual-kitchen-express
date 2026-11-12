import { naira } from "@cke/brand-tokens";
import { useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { View } from "react-native";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Screen, T } from "../src/ui/kit";
import { toDeliveries, toQueue } from "../src/nav";

// A clear confirmation, the pay added to earnings, then the next stop or the queue (RID-10, RID-18).
export default function Delivered() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { s } = useStore();
  const t = useTheme();
  const more = s.carrying.length > 0;
  return (
    <Screen
      footer={
        more ? (
          <Button label="Next stop" onPress={toDeliveries} />
        ) : (
          <Button label="Back to queue" onPress={toQueue} />
        )
      }
    >
      <View style={{ alignItems: "center", marginTop: 60 }}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: t.success,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={70} color={t.onSuccess} strokeWidth={3} />
        </View>
        <T v="title" center style={{ marginTop: 20, fontSize: 36, lineHeight: 42 }}>
          Delivered
        </T>
        <T center style={{ marginTop: 8 }}>
          {no ? `${no}. ` : ""}
          {naira(s.pay)} added to your earnings.
        </T>
        {more ? (
          <T center muted style={{ marginTop: 6 }}>
            {s.carrying.length} more stop{s.carrying.length === 1 ? "" : "s"} to go.
          </T>
        ) : null}
      </View>
    </Screen>
  );
}
