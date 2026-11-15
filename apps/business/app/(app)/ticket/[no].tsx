import { naira } from "@cke/brand-tokens";
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { orderTotal, type Station } from "../../../src/data/seed";
import {
  actorLabel,
  cancelOrder,
  findOrder,
  firstName,
  markCollected,
  markReady,
  tick,
  useStore,
} from "../../../src/state/store";
import { useTheme } from "../../../src/state/theme";
import {
  Button,
  Card,
  Chip,
  Chips,
  ConfirmTick,
  Page,
  Row,
  Sheet,
  StatusPill,
  T,
} from "../../../src/ui/kit";
import { NEW_PICK, RefundPicker, refundFor, type RefundPick } from "../../../src/ui/refund";
import { useToast } from "../../../src/ui/toast";

const STATIONS: Station[] = ["Rice", "Soups and swallows", "Snacks and drinks"];
const REASONS = [
  "Customer changed their mind",
  "Item not available",
  "Entered by mistake",
  "Something else",
];

// Ticket detail (design.md 6.4): items by station with one tap per tick, then Ready or Collected.
export default function Ticket() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  // The walk-in's refund: full by default, or a typed partial amount (MGR-15).
  const [pick, setPick] = useState<RefundPick>(NEW_PICK);
  const o = findOrder(s, no);
  if (!o)
    return (
      <Page>
        <T>This order is no longer on the board.</T>
      </Page>
    );
  const collectable = o.status === "ready" && o.type !== "delivery";
  const paid = orderTotal(o);
  const { amount } = refundFor(pick, paid, paid - (o.refunded ?? 0));

  return (
    <Page>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <T v="big">{o.no}</T>
        <StatusPill status={o.status} />
      </Row>
      <T muted style={{ marginTop: 4 }}>
        {o.channel === "walkin" ? "Walk-in" : "Online"},{" "}
        {o.type === "delivery"
          ? "delivery"
          : o.type === "pickup"
            ? "pickup"
            : o.type === "eatin"
              ? "eat in"
              : "take away"}
        {o.name ? `, for ${o.name}` : ""}
        {o.riderId ? `, rider ${firstName(s, o.riderId)}` : ""}
      </T>
      {STATIONS.map((st) => {
        const lines = o.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.station === st);
        if (!lines.length) return null;
        return (
          <Card key={st}>
            <T v="h3">{st}</T>
            {lines.map(({ l, i }) => (
              <Pressable
                key={i}
                onPress={() => set((x) => tick(x, o.no, i))}
                disabled={o.status !== "preparing"}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: l.ticked }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: l.ticked ? t.success : t.line,
                    backgroundColor: l.ticked ? t.success : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {l.ticked ? <Check size={20} color="#fff" strokeWidth={3} /> : null}
                </View>
                <T
                  v="h2"
                  style={{ flex: 1, textDecorationLine: l.ticked ? "line-through" : "none" }}
                >
                  {l.qty} × {l.name}
                </T>
              </Pressable>
            ))}
          </Card>
        );
      })}
      <View style={{ gap: 10, marginTop: 20 }}>
        {o.status === "preparing" ? (
          <Button
            label="Ready"
            onPress={() => {
              set((x) => markReady(x, o.no));
              toast(
                o.type === "delivery"
                  ? `${o.no} is in the rider queue`
                  : `${o.no} is ready to collect`,
              );
              router.back();
            }}
          />
        ) : null}
        {collectable ? (
          <Button
            label="Collected"
            onPress={() => {
              set((x) => markCollected(x, o.no));
              toast(`${o.no} collected`);
              router.back();
            }}
          />
        ) : null}
        {o.channel === "walkin" && (o.status === "new" || o.status === "preparing") ? (
          <Button
            label="Cancel order"
            variant="ghost"
            onPress={() => (setCancel(true), setSure(false), setPick(NEW_PICK))}
          />
        ) : null}
      </View>
      <Sheet visible={cancel} onClose={() => setCancel(false)} title={`Cancel ${o.no}?`}>
        <T muted>
          The payment is refunded (simulated), in full or in part, and the cancellation is recorded
          against you.
        </T>
        <View style={{ marginTop: 12 }}>
          <RefundPicker
            paid={paid}
            left={paid - (o.refunded ?? 0)}
            value={pick}
            onChange={(v) => (setPick(v), setSure(false))}
          />
        </View>
        <Chips style={{ marginTop: 12 }}>
          {REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
          ))}
        </Chips>
        <ConfirmTick
          checked={sure}
          onChange={setSure}
          label={
            amount
              ? `I’m sure I want to refund ${naira(amount)} for ${o.no}`
              : "Enter the amount to refund first"
          }
        />
        <T v="small" muted style={{ marginTop: 6 }}>
          Recorded as {actorLabel(s)}, with the time.
        </T>
        <Button
          label="Cancel and refund"
          variant="danger"
          disabled={!reason || !sure || !amount}
          style={{ marginTop: 16 }}
          onPress={() => {
            set((x) => cancelOrder(x, o.no, reason ?? "", amount ?? undefined));
            setCancel(false);
            toast(`${o.no} cancelled and ${naira(amount ?? 0)} refunded`);
            router.back();
          }}
        />
        <Button
          label="Keep the order"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => setCancel(false)}
        />
      </Sheet>
    </Page>
  );
}
