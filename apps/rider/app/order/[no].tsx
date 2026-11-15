import { router, useLocalSearchParams } from "expo-router";
import { KITCHEN, km, orderLoad } from "../../src/data/orders";
import { useRiderOps } from "../../src/state/live";
import { accept, fits, useStore } from "../../src/state/store";
import { Button, Card, KV, Screen, StateBanner, T, TopBar } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Review before accepting. The first rider to accept wins (RID-03, RID-04).
export default function OrderDetail() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { s, set } = useStore();
  const ops = useRiderOps();
  const toast = useToast();
  const o = s.queue.find((q) => q.no === no);
  if (!o) {
    return (
      <Screen
        header={<TopBar title="Order" back />}
        footer={<Button label="Back to queue" onPress={() => router.back()} />}
      >
        <T>This order has left the queue.</T>
      </Screen>
    );
  }
  const ok = fits(s, o);
  const take = async () => {
    if (ops.live) {
      const r = await ops.accept(o);
      if (r === "gone") router.replace({ pathname: "/taken", params: { no: o.no } });
      else if (r === "taken") {
        toast(`${o.no} accepted`);
        router.replace("/deliveries");
      }
      return;
    }
    if (s.raceLost) {
      // Another rider accepted first: the order leaves this rider's queue.
      set({ queue: s.queue.filter((q) => q.no !== o.no) });
      router.replace({ pathname: "/taken", params: { no: o.no } });
      return;
    }
    set((st) => accept(st, o.no));
    toast(`${o.no} accepted`);
    router.replace("/deliveries");
  };
  return (
    <Screen
      header={<TopBar title={o.no} back />}
      footer={
        <>
          <Button label="Accept order" onPress={() => void take()} disabled={!ok} />
          <Button label="Back to queue" variant="alt" onPress={() => router.back()} />
        </>
      }
    >
      <Card strong>
        <KV k="Pick up" v={KITCHEN} />
        <KV k="Drop off" v={o.area} />
        <KV k="Distance" v={km(o.km)} />
        <KV k="Load" v={`${orderLoad(o)} of ${s.budget}`} />
        {o.items.length ? <KV k="Food" v={o.items.map((i) => i.name).join(", ")} /> : null}
      </Card>
      {!ok ? <StateBanner kind="alert" label="This order won’t fit what you’re carrying." /> : null}
    </Screen>
  );
}
