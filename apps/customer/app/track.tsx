import { DEFAULTS } from "@cke/validation";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { toTab } from "../src/nav";
import { Check, MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  CANCEL_REASONS,
  clockTime,
  DELIVERY_STEPS,
  DEMO_DELIVERY_CODE,
  PICKUP_STEPS,
  WHATSAPP_URL,
} from "../src/data/order";
import type { Point } from "../src/data/geo";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Checkbox, Notice, Option, QuietLink, Screen, T, TopBar } from "../src/ui/kit";
import { MapStandIn } from "../src/ui/map";
import { Sheet } from "../src/ui/sheet";
import { useToast } from "../src/ui/toast";

const CUSTOMER_PIN: Point = [205, 104];

// Order tracking (CUS-08 to CUS-11). Cancelling follows architecture.md 4.6: a quiet link, a reason,
// and a tick; a request after the kitchen acknowledges; nothing once the food is ready.
export default function TrackScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "cancel" | "request">(null);
  const [reason, setReason] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  const o = s.order;
  if (!o) {
    return (
      <Screen header={<TopBar title="Order tracking" onBack={() => toTab("/orders")} />}>
        <T muted>Nothing in progress. Your next order will show here while it’s on its way.</T>
        <Button label="Browse the menu" onPress={() => toTab("/")} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const steps = o.mode === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const st = o.stage;
  const done = st >= steps.length - 1;
  const limited = s.recentCancels >= DEFAULTS.cancellationLimit;
  const canCancel = !o.cancelled && !done && st <= 1 && !limited;
  const canRequest = !o.cancelled && !done && !o.requested && st <= 3 && (st > 1 || limited);
  const rider: Point | undefined =
    st >= 8 ? CUSTOMER_PIN : st === 7 ? [196, 110] : st === 6 ? [172, 124] : undefined;

  const openSheet = (kind: "cancel" | "request") => {
    setReason(null);
    setAgree(false);
    setSheet(kind);
  };

  const confirm = () => {
    if (!reason || !agree) return;
    if (sheet === "cancel") {
      set((x) => ({
        order: x.order && { ...x.order, cancelled: true, refund: "pending" },
        recentCancels: x.recentCancels + 1,
      }));
      setTimeout(
        () =>
          set((x) => ({
            order: x.order && x.order.cancelled ? { ...x.order, refund: "completed" } : x.order,
          })),
        2500,
      );
    } else {
      set((x) => ({ order: x.order && { ...x.order, requested: true } }));
      toast("Request sent");
    }
    setSheet(null);
  };

  return (
    <Screen header={<TopBar title={`Order ${o.no}`} onBack={() => toTab("/orders")} />}>
      {o.cancelled ? (
        <Notice>
          <T>
            <T bold>Order cancelled.</T>{" "}
            {o.refund === "completed"
              ? "Refund completed."
              : "Refund pending. It usually completes within minutes."}
          </T>
        </Notice>
      ) : o.requested ? (
        <Notice kind="ok">
          <T>
            <T bold>Cancellation requested.</T> A manager will reply here shortly.
          </T>
        </Notice>
      ) : null}

      {o.mode === "delivery" && !o.cancelled && !done ? (
        <View style={[styles.code, { backgroundColor: t.surface, borderColor: t.yellow }]}>
          <T v="label" center>
            Give this code to your rider at the door
          </T>
          <T
            v="display"
            center
            style={styles.digits}
            accessibilityLabel={`Delivery code ${DEMO_DELIVERY_CODE.split("").join(" ")}`}
          >
            {DEMO_DELIVERY_CODE}
          </T>
        </View>
      ) : null}

      {o.mode === "pickup" && !o.cancelled && st === 4 ? (
        <View style={[styles.code, { backgroundColor: t.surface, borderColor: t.yellow }]}>
          <T v="label" center>
            Show this at the counter
          </T>
          <T v="display" center style={styles.digits}>
            {o.no}
          </T>
        </View>
      ) : null}

      {o.mode === "delivery" && st >= 6 && !done && !o.cancelled ? (
        <View style={{ marginTop: 14 }}>
          <MapStandIn pin={CUSTOMER_PIN} rider={rider} label="Map showing your rider on the way" />
          <T v="small" muted style={{ marginTop: 6 }}>
            The rider’s position updates about every 45 seconds.
          </T>
        </View>
      ) : null}

      <View style={{ marginTop: 18 }} accessibilityLabel="Order progress">
        {steps.map(([label, after], i) => {
          const isDone = i < st || (i === st && (done || !!o.cancelled));
          const isNow = i === st && !done && !o.cancelled;
          const reached = i <= st;
          const faded = o.cancelled && i > st;
          return (
            <View key={label} style={styles.step}>
              <View style={{ alignItems: "center" }}>
                <View
                  style={[
                    styles.dot,
                    { borderColor: isDone ? t.success : isNow ? t.accent : t.line },
                    isDone && { backgroundColor: t.success },
                  ]}
                >
                  {isDone ? (
                    <Check size={14} color={t.mode === "dark" ? "#000" : "#fff"} strokeWidth={3} />
                  ) : null}
                  {isNow ? <View style={[styles.nowDot, { backgroundColor: t.accent }]} /> : null}
                </View>
                {i < steps.length - 1 ? (
                  <View style={[styles.rail, { backgroundColor: i < st ? t.success : t.line }]} />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 14, opacity: faded ? 0.4 : 1 }}>
                <T v={isNow ? "label" : "body"} muted={!reached}>
                  {label}
                </T>
                {reached ? (
                  <T v="small" muted>
                    {clockTime(o.placedAt + after * 60_000)}
                  </T>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {done && !o.cancelled ? (
        <Button
          label="Rate your order"
          onPress={() => router.push("/rate")}
          style={{ marginTop: 6 }}
        />
      ) : null}
      {canCancel ? <QuietLink label="Cancel order" onPress={() => openSheet("cancel")} /> : null}
      {canRequest ? (
        <QuietLink label="Request cancellation" onPress={() => openSheet("request")} />
      ) : null}

      <Button
        label="Contact the restaurant"
        variant="ghost"
        small
        icon={<MessageCircle size={18} color={t.text} />}
        onPress={() => Linking.openURL(WHATSAPP_URL)}
        style={{ marginTop: 12 }}
      />

      <Sheet
        visible={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet === "request" ? "Request cancellation" : "Cancel this order?"}
      >
        <T muted>
          {sheet === "request"
            ? limited && st <= 1
              ? `You’ve cancelled ${s.recentCancels} orders in the last 7 days, so a manager now decides. You’ll get a reply in the app.`
              : "The kitchen has started your order, so a manager decides. You’ll get a reply in the app."
            : "The kitchen hasn’t started it yet, so you get a full refund, including the delivery fee."}
        </T>
        <T v="h2" style={{ marginTop: 16 }}>
          Why are you cancelling?
        </T>
        <T v="small" muted>
          Pick one to continue
        </T>
        {CANCEL_REASONS.map((r) => (
          <Option key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
        <Checkbox
          label={
            sheet === "request"
              ? "I understand a manager may decline this request."
              : "I understand this order will be cancelled and can’t be restored."
          }
          checked={agree}
          onToggle={() => setAgree(!agree)}
        />
        <T v="small" muted>
          Cancelling often can limit cancelling on your account.
        </T>
        <Button
          label={sheet === "request" ? "Send request" : "Cancel order"}
          onPress={confirm}
          disabled={!reason || !agree}
          style={{ marginTop: 14 }}
        />
        <Button
          label="Keep my order"
          variant="ghost"
          onPress={() => setSheet(null)}
          style={{ marginTop: 8 }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { marginTop: 12, padding: 16, borderRadius: 18, borderWidth: 2 },
  digits: { fontSize: 44, lineHeight: 52, letterSpacing: 10, marginTop: 4 },
  step: { flexDirection: "row", gap: 12 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nowDot: { width: 10, height: 10, borderRadius: 5 },
  rail: { width: 2, flex: 1, minHeight: 14 },
});
