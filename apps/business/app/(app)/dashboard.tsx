import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { View } from "react-native";
import { orderTotal } from "../../src/data/seed";
import { useStore } from "../../src/state/store";
import { Button, Page, Section, Stat, T } from "../../src/ui/kit";

// Live dashboard (MGR-01): today's orders and sales, the online and walk-in split, payments, and
// what needs attention.
export default function Dashboard() {
  const { s } = useStore();
  const valid = s.orders.filter((o) => o.status !== "cancelled");
  const online = valid.filter((o) => o.channel === "online");
  const walkin = valid.filter((o) => o.channel === "walkin");
  const sum = (l: typeof valid) => l.reduce((a, o) => a + orderTotal(o), 0);
  const cash = valid.filter((o) => o.pay === "cash");
  const active = valid.filter((o) => ["new", "preparing", "ready", "out"].includes(o.status));
  const ridersOnline = s.riders.filter((r) => r.online).length;
  return (
    <Page>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat
          label="Orders today"
          value={String(valid.length)}
          hint={`${online.length} online, ${walkin.length} walk-in`}
        />
        <Stat
          label="Sales today"
          value={naira(sum(valid))}
          hint={`${naira(sum(online))} online, ${naira(sum(walkin))} walk-in`}
        />
        <Stat
          label="Payments"
          value={naira(sum(cash))}
          hint={`cash, and ${naira(sum(valid) - sum(cash))} card or transfer`}
        />
        <Stat
          label="In progress"
          value={String(active.length)}
          hint={`${ridersOnline} riders online`}
        />
      </View>
      <Section title="Needs attention">
        {s.alerts.length ? (
          s.alerts.map((a) => (
            <T key={a.id} style={{ marginTop: 6 }}>
              {a.text}
            </T>
          ))
        ) : (
          <T muted>Nothing right now.</T>
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Button label="Open alerts" small onPress={() => router.navigate("/alerts")} />
          <Button
            label="Open the board"
            variant="ghost"
            small
            onPress={() => router.navigate("/board")}
          />
        </View>
      </Section>
    </Page>
  );
}
