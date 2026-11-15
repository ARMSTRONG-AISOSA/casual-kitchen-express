import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useRiderOps } from "../src/state/live";
import { useStore } from "../src/state/store";
import { Button, Card, KV, Screen, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";

// Pickup (RID-07): match the number on each sealed bag, then one tap picks them all up.
// The screen stays awake here and on code entry only (RID-15).
export default function Pickup() {
  useKeepAwake();
  const { s } = useStore();
  const ops = useRiderOps();
  const toast = useToast();
  const bags = s.carrying.filter((o) => !o.picked);
  const done = async () => {
    if (!(await ops.pickUpAll())) return;
    toast("Picked up");
    router.replace("/drop-off");
  };
  return (
    <Screen
      header={<TopBar title="Pick up" back />}
      footer={
        <>
          <Button label="Picked up" onPress={() => void done()} disabled={!bags.length} />
          <Button label="Need help" variant="alt" onPress={() => router.push("/help")} />
        </>
      }
    >
      <T>
        {bags.length > 1
          ? "Match these numbers with the sealed bags."
          : "Match this number with the sealed bag."}
      </T>
      {bags.map((o) => (
        <Card key={o.no} strong>
          <T v="big">{o.no}</T>
          {o.items.length ? (
            <>
              <KV k="Food" v={o.items.map((i) => i.name).join(", ")} />
              <KV k="Bags" v={o.items.some((i) => i.load === 3) ? 2 : 1} />
            </>
          ) : (
            <KV k="Items" v={o.itemCount ?? 0} />
          )}
        </Card>
      ))}
    </Screen>
  );
}
