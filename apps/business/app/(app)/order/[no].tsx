import { naira } from "@cke/brand-tokens";
import { router, useLocalSearchParams } from "expo-router";
import { goTo } from "../../../src/ui/nav";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { CUSTOMERS, orderTotal } from "../../../src/data/seed";
import {
  actorLabel,
  cancelOrder,
  clock,
  findOrder,
  log,
  myRole,
  nameOf,
  partialRefund,
  useStore,
} from "../../../src/state/store";
import {
  Button,
  Card,
  Chip,
  Chips,
  ConfirmTick,
  DemoNote,
  KV,
  Page,
  Row,
  Section,
  Sheet,
  StatusPill,
  T,
} from "../../../src/ui/kit";
import { useToast } from "../../../src/ui/toast";

const REFUND_REASONS = [
  "Late delivery",
  "Wrong or missing item",
  "Quality problem",
  "Something else",
];

// Order detail (MGR-24, DSP-02): the timeline, payment, and for online orders the customer's
// contact details with Call and WhatsApp. Refunds are for managers only.
export default function OrderDetail() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { s, set } = useStore();
  const toast = useToast();
  const role = myRole(s);
  const [refund, setRefund] = useState(false);
  const [kind, setKind] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const o = findOrder(s, no);
  if (!o)
    return (
      <Page>
        <T>Order not found.</T>
      </Page>
    );
  const c = CUSTOMERS.find((x) => x.id === o.customerId);
  const waiting = o.status === "ready" && o.type === "delivery" && !o.riderId;
  const pendingCancel = s.alerts.find((a) => a.kind === "cancel" && a.orderNo === o.no);

  // Demo: the customers are made up, so nothing is dialled. The real app opens the dialer or WhatsApp.
  const contact = (how: "Call" | "WhatsApp") => {
    if (!c) return;
    set((st) =>
      log(
        st,
        "contact",
        `${how === "Call" ? "Called" : "Messaged on WhatsApp"} ${c.id} about ${o.no}`,
      ),
    );
    toast(`In the real app this ${how === "Call" ? "calls" : "opens WhatsApp with"} ${c.name}`);
  };

  const refunds = s.refunds.filter((r) => r.orderNo === o.no);
  const amount = kind === "full" ? orderTotal(o) : Math.round(o.food / 2);

  return (
    <Page>
      <Button
        label="Back to Orders"
        variant="ghost"
        small
        icon={(col) => <ChevronLeft size={20} color={col} />}
        style={{ alignSelf: "flex-start", marginBottom: 12 }}
        onPress={() => goTo("/orders")}
      />
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <T v="big">{o.no}</T>
        <StatusPill status={o.status} />
      </Row>
      <T muted>
        {o.channel === "walkin" ? "Walk-in" : "Online"}, placed {clock(o.placedAt)}
        {o.riderId ? `, rider ${nameOf(s, o.riderId)} (${o.riderId})` : ""}
      </T>

      {c ? (
        <Card>
          <T v="h2">Customer</T>
          <KV k="Name" v={c.name} />
          <KV k="Customer ID" v={c.id} />
          <KV k="Phone" v={c.phone} />
          {o.type === "delivery" ? (
            <>
              <KV k="Deliver to" v={`${c.label}, ${c.area}`} />
              <KV k="Landmark" v={c.landmark} />
            </>
          ) : (
            <KV k="Collecting" v="Pickup at the kitchen" />
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <Button
              label="Call"
              icon={(col) => <Phone size={20} color={col} />}
              onPress={() => contact("Call")}
            />
            <Button
              label="WhatsApp"
              variant="ghost"
              icon={(col) => <MessageCircle size={20} color={col} />}
              onPress={() => contact("WhatsApp")}
            />
          </View>
        </Card>
      ) : o.name ? (
        <Card>
          <KV k="Name" v={o.name} />
        </Card>
      ) : null}

      {waiting && (role === "dispatch" || role === "manager") ? (
        <Button
          label="Assign to a rider"
          style={{ marginTop: 14 }}
          onPress={() => router.push(`/assign/${o.no}`)}
        />
      ) : null}
      {pendingCancel ? (
        <T style={{ marginTop: 14 }}>
          The customer asked to cancel this order. Approve or decline it in Alerts.
        </T>
      ) : null}

      <Section title="Items">
        <Card style={{ marginTop: 0 }}>
          {o.lines.map((l, i) => (
            <KV key={i} k={`${l.qty} × ${l.name}`} v="" />
          ))}
          <KV k="Food" v={naira(o.food)} />
          {o.fee ? <KV k="Delivery fee" v={naira(o.fee)} /> : null}
          <KV k="Total" v={naira(orderTotal(o))} strong />
          <KV
            k="Paid by"
            v={
              o.pay === "cash"
                ? `Cash${o.cashReceived ? `, received ${naira(o.cashReceived)}` : ""}`
                : o.pay === "card"
                  ? "Card"
                  : "Transfer"
            }
          />
          {o.refunded ? <KV k="Refunded" v={naira(o.refunded)} /> : null}
          {refunds.map((r, i) => (
            <KV
              key={i}
              k={`Refunded by`}
              v={`${r.byName}, ${r.byRole} (${r.by}), ${clock(r.at)}`}
            />
          ))}
        </Card>
      </Section>

      <Section title="Timeline">
        <Card style={{ marginTop: 0 }}>
          {o.events.map((e, i) => (
            <KV
              key={i}
              k={`${clock(e.at)}  ${e.label}`}
              v={e.by === "System" ? "System" : `${nameOf(s, e.by)}, ${e.by}`}
            />
          ))}
        </Card>
      </Section>

      {role === "manager" && o.status !== "cancelled" && !o.refunded ? (
        <Button
          label="Refund"
          variant="ghost"
          style={{ marginTop: 18 }}
          onPress={() => (setRefund(true), setSure(false), setReason(null))}
        />
      ) : null}

      <Sheet visible={refund} onClose={() => setRefund(false)} title={`Refund ${o.no}`}>
        <Chips>
          <Chip
            label={`Full, ${naira(orderTotal(o))}`}
            selected={kind === "full"}
            onPress={() => setKind("full")}
          />
          <Chip
            label={`Partial, ${naira(Math.round(o.food / 2))}`}
            selected={kind === "partial"}
            onPress={() => setKind("partial")}
          />
        </Chips>
        <Chips style={{ marginTop: 10 }}>
          {REFUND_REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </Chips>
        <ConfirmTick
          checked={sure}
          onChange={setSure}
          label={`I’m sure I want to refund ${naira(amount)} for ${o.no}`}
        />
        <T v="small" muted style={{ marginTop: 6 }}>
          Recorded as {actorLabel(s)}, with the time.
        </T>
        <Button
          label="Confirm refund"
          disabled={!reason || !sure}
          style={{ marginTop: 16 }}
          onPress={() => {
            set((st) =>
              kind === "full"
                ? cancelOrder(st, o.no, reason ?? "")
                : partialRefund(st, o.no, amount, reason ?? ""),
            );
            setRefund(false);
            toast(`Refund of ${naira(amount)} pending`);
          }}
        />
        <DemoNote text="Demo refund. No money is moved." />
      </Sheet>
    </Page>
  );
}
