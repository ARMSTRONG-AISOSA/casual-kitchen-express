import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useRiderOps } from "../src/state/live";
import { useStore } from "../src/state/store";
import { Button, Screen, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";
import { toQueue } from "../src/nav";

// A deliberate confirmation, in the alert colour, before an order goes back to the queue (RID-12).
export default function Release() {
  const { s } = useStore();
  const ops = useRiderOps();
  const toast = useToast();
  const o = s.carrying[0];
  const release = async () => {
    if (!(await ops.release())) return;
    toast("Order released to the queue");
    toQueue();
  };
  return (
    <Screen
      header={<TopBar title={`Release ${o?.no ?? "order"}?`} back />}
      footer={
        <>
          <Button
            label="Release order"
            variant="alert"
            icon={(c) => <TriangleAlert size={26} color={c} strokeWidth={2.5} />}
            onPress={() => void release()}
            disabled={!o}
          />
          <Button label="Keep it" variant="alt" onPress={() => router.back()} />
        </>
      }
    >
      <T>
        It goes back to the queue for another rider. Only do this if you can’t finish the delivery.
      </T>
    </Screen>
  );
}
