import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { deliveredToday, nameOf, owedDeliveries, payRider, useStore } from "../../src/state/store";
import { Button, Card, DemoNote, KV, Page, Row, Section, Sheet, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Rider pay (MGR-30, ACC-02): owed balances, per-delivery pay, and simulated payouts. Account
// officers and managers can mark a period as paid.
export default function RiderPay() {
  const { s, set } = useStore();
  const toast = useToast();
  const [pay, setPay] = useState<string | null>(null);
  const riders = s.people.filter((p) => p.role === "rider");
  const rate = s.settings.riderPay;
  return (
    <Page>
      <T muted>{naira(rate)} per delivery. Payouts are weekly and simulated.</T>
      {riders.map((r) => {
        const owed = owedDeliveries(s, r.id);
        return (
          <Card key={r.id}>
            <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <T v="h3">
                {r.name}, {r.id}
              </T>
              <T v="h3">{naira(owed * rate)} owed</T>
            </Row>
            <T muted>
              {owed} unpaid deliver{owed === 1 ? "y" : "ies"} this week, {deliveredToday(s, r.id)}{" "}
              of them today
            </T>
            <Button
              label="Mark as paid"
              small
              disabled={!owed}
              style={{ marginTop: 10, alignSelf: "flex-start" }}
              onPress={() => setPay(r.id)}
            />
          </Card>
        );
      })}
      <Section title="Payout history">
        <Card style={{ marginTop: 0 }}>
          {s.payouts.map((p, i) => (
            <KV
              key={i}
              k={`${p.period}, ${nameOf(s, p.riderId)} (${p.deliveries} deliveries), paid by ${p.paidBy}`}
              v={naira(p.amount)}
            />
          ))}
        </Card>
      </Section>
      <Sheet visible={!!pay} onClose={() => setPay(null)} title={`Pay ${nameOf(s, pay ?? "")}?`}>
        <T muted>
          {naira(owedDeliveries(s, pay ?? "") * rate)} for {owedDeliveries(s, pay ?? "")}{" "}
          deliveries, the week to Thu 12 Nov. The payout is recorded with your name.
        </T>
        <Button
          label="Mark as paid"
          style={{ marginTop: 16 }}
          onPress={() => {
            set((st) => payRider(st, pay ?? ""));
            toast("Payout recorded");
            setPay(null);
          }}
        />
        <DemoNote />
      </Sheet>
    </Page>
  );
}
