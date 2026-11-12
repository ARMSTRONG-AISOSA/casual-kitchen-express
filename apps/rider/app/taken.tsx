import { router, useLocalSearchParams } from "expo-router";
import { Button, Screen, StateBanner, T, TopBar } from "../src/ui/kit";

// Shown when another rider accepted the order first (RID-04).
export default function Taken() {
  const { no } = useLocalSearchParams<{ no: string }>();
  return (
    <Screen
      header={<TopBar title="Order taken" />}
      footer={<Button label="Back to queue" onPress={() => router.back()} />}
    >
      <StateBanner kind="off" label={`Another rider accepted ${no ?? "this order"} first.`} />
      <T style={{ marginTop: 14 }}>It has left your queue. Pick another order.</T>
    </Screen>
  );
}
