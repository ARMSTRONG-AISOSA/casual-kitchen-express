import { naira } from "@cke/brand-tokens";
import { toDeliveries } from "../../src/nav";
import { useRider } from "../../src/state/session";
import { useRiderOps } from "../../src/state/live";
import { MAX_ORDERS, alertRider, useStore } from "../../src/state/store";
import { Button, Card, KV, Screen, StateBanner, T, TopBar } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Home: one big switch to go online, and today's summary (RID-02, RID-13).
export default function Home() {
  const { s } = useStore();
  const ops = useRiderOps();
  const rider = useRider();
  const toast = useToast();
  const today = s.delivered.length;
  const toggle = async () => {
    const online = !s.online;
    if (!(await ops.setOnline(online))) return;
    toast(online ? "You’re online" : "You’re offline");
    if (online && s.queue.length) alertRider(s);
  };
  return (
    <Screen
      tabs
      header={<TopBar title={`Hello, ${rider.first}`} />}
      footer={
        s.online ? (
          <Button
            label="Go offline"
            variant="alt"
            onPress={() => void toggle()}
            disabled={s.carrying.length > 0}
          />
        ) : (
          <Button label="Go online" onPress={() => void toggle()} />
        )
      }
    >
      <StateBanner
        kind={s.online ? "on" : "off"}
        label={s.online ? "You’re online and can take orders" : "You’re offline"}
      />
      <Card strong>
        <KV k="Delivered today" v={today} />
        <KV k="Earned today" v={naira(s.delivered.reduce((a, d) => a + d.pay, 0))} />
        <KV k="Carrying now" v={`${s.carrying.length} of ${MAX_ORDERS}`} />
      </Card>
      {s.carrying.length ? (
        <Button
          label="Go to my deliveries"
          variant="alt"
          onPress={toDeliveries}
          style={{ marginTop: 14 }}
        />
      ) : null}
      {s.online && s.carrying.length ? (
        <T v="small" muted style={{ marginTop: 10 }}>
          Finish your deliveries before going offline.
        </T>
      ) : null}
      <T v="small" muted style={{ marginTop: 14 }}>
        Your location is shared only while you’re carrying an order.
      </T>
    </Screen>
  );
}
