import { ApiError } from "@cke/api-client";
import { naira } from "@cke/brand-tokens";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../src/api";
import { Button, Card, DemoNote, KV, Page, Row, Section, Sheet, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

const dayLabel = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

// Rider pay (MGR-30, ACC-02): each rider's owed balance from their real deliveries, and simulated
// payouts. Account officers and managers mark what's owed as paid; the payout is recorded with
// their name. No money moves.
export default function RiderPay() {
  const toast = useToast();
  const [paying, setPaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["rider-pay"],
    queryFn: () => api!.riderPay(),
    enabled: !!api,
  });
  const v = q.data;
  const rider = v?.riders.find((r) => r.code === paying);

  if (!v)
    return (
      <Page>
        <T muted>{q.isError ? "Can’t load rider pay right now. Try again." : "Loading…"}</T>
      </Page>
    );

  return (
    <Page>
      <T muted>{naira(v.rate)} per delivery. Payouts are simulated: no money moves.</T>
      {v.riders.map((r) => (
        <Card key={r.code}>
          <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <T v="h3">
              {r.name}, {r.code}
              {r.active ? "" : " (left)"}
            </T>
            <T v="h3">{naira(r.owed)} owed</T>
          </Row>
          <T muted>
            {r.owedDeliveries} unpaid deliver{r.owedDeliveries === 1 ? "y" : "ies"}
            {r.since ? ` since ${dayLabel(r.since)}` : ""}, {r.today} of them today
          </T>
          <Button
            label="Mark as paid"
            small
            disabled={!r.owed}
            style={{ marginTop: 10, alignSelf: "flex-start" }}
            onPress={() => setPaying(r.code)}
          />
        </Card>
      ))}
      <Section title="Payout history">
        <Card style={{ marginTop: 0 }}>
          {v.history.length ? (
            v.history.map((p, i) => (
              <KV
                key={i}
                k={`${dayLabel(p.periodStart)} to ${dayLabel(p.periodEnd)}, ${p.name} (${p.deliveries} deliveries)${p.paidBy ? `, paid by ${p.paidBy}` : ""}`}
                v={naira(p.amount)}
              />
            ))
          ) : (
            <T muted>No payouts yet.</T>
          )}
        </Card>
      </Section>
      <Sheet visible={!!rider} onClose={() => setPaying(null)} title={`Pay ${rider?.name ?? ""}?`}>
        <T muted>
          {naira(rider?.owed ?? 0)} for {rider?.owedDeliveries ?? 0} deliveries
          {rider?.since ? `, from ${dayLabel(rider.since)} to today` : ""}. The payout is recorded
          with your name.
        </T>
        <Button
          label="Mark as paid"
          disabled={busy}
          style={{ marginTop: 16 }}
          onPress={async () => {
            if (!rider) return;
            setBusy(true);
            try {
              await api!.payRider(rider.code);
              toast("Payout recorded");
              setPaying(null);
              await q.refetch();
            } catch (e) {
              toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
        <DemoNote />
      </Sheet>
    </Page>
  );
}
