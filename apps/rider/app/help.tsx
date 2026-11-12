import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { HELP_REASONS } from "../src/data/orders";
import { alertRider, useStore } from "../src/state/store";
import { Button, Screen, StateBanner, T, TopBar } from "../src/ui/kit";

// Need help (RID-11): problems go straight to the manager, who can call the customer or approve a
// manual completion. Release order hands the order back to the queue (RID-12).
export default function Help() {
  const { s } = useStore();
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <Screen
        header={<TopBar title="Need help" back />}
        footer={<Button label="Back to my delivery" onPress={() => router.back()} />}
      >
        <StateBanner kind="success" label="Help request sent" />
        <T style={{ marginTop: 14 }}>The manager will call you. Stay where you are if you can.</T>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar title="Need help" back />}
      footer={
        s.carrying.length ? (
          <Button
            label="Release order"
            variant="alert"
            icon={(c) => <TriangleAlert size={26} color={c} strokeWidth={2.5} />}
            onPress={() => router.push("/release")}
          />
        ) : null
      }
    >
      <T>What’s wrong?</T>
      <View style={{ gap: 10, marginTop: 12 }}>
        {HELP_REASONS.map((r) => (
          <Button
            key={r}
            label={r}
            variant="alt"
            onPress={() => {
              setSent(true);
              alertRider(s);
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
