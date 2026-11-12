import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { orderLoad } from "../../../src/data/seed";
import {
  assignRider,
  findOrder,
  nameOf,
  riderFits,
  riderLoad,
  riderOrders,
  useStore,
} from "../../../src/state/store";
import { Button, Card, Page, Row, Sheet, T } from "../../../src/ui/kit";
import { useToast } from "../../../src/ui/toast";

// Assign to a rider (DSP-05): only online riders whose remaining capacity fits the order.
export default function Assign() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { s, set } = useStore();
  const toast = useToast();
  const [pick, setPick] = useState<string | null>(null);
  const o = findOrder(s, no);
  if (!o)
    return (
      <Page>
        <T>Order not found.</T>
      </Page>
    );
  const online = s.riders.filter((r) => r.online);
  const fit = online.filter((r) => riderFits(s, r.id, o));
  const full = online.filter((r) => !riderFits(s, r.id, o));

  return (
    <Page>
      <T>
        {o.no} has a load of {orderLoad(o)}. Riders who can take it:
      </T>
      {fit.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <T v="h3">
              {nameOf(s, r.id)}, {r.id}
            </T>
            <Button label="Assign" small onPress={() => setPick(r.id)} />
          </Row>
          <T muted>
            Load {riderLoad(s, r.id)} of {s.settings.budget}, carrying {riderOrders(s, r.id).length}{" "}
            of 3
            {riderOrders(s, r.id).length
              ? `: ${riderOrders(s, r.id)
                  .map((x) => x.no)
                  .join(", ")}`
              : ""}
          </T>
        </Card>
      ))}
      {!fit.length ? (
        <T muted style={{ marginTop: 12 }}>
          No online rider has room for this order right now.
        </T>
      ) : null}
      {full.length ? (
        <T v="small" muted style={{ marginTop: 14 }}>
          Full right now: {full.map((r) => nameOf(s, r.id)).join(", ")}
        </T>
      ) : null}
      <Sheet
        visible={!!pick}
        onClose={() => setPick(null)}
        title={`Assign ${o.no} to ${nameOf(s, pick ?? "")}?`}
      >
        <T muted>
          It goes straight into their deliveries with a strong alert, and leaves the queue for
          everyone else.
        </T>
        <Button
          label="Assign"
          style={{ marginTop: 16 }}
          onPress={() => {
            set((st) => assignRider(st, o.no, pick ?? ""));
            toast(`${o.no} assigned to ${nameOf(s, pick ?? "")}`);
            setPick(null);
            router.back();
          }}
        />
        <Button
          label="Cancel"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => setPick(null)}
        />
      </Sheet>
    </Page>
  );
}
