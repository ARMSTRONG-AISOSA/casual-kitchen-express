import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View } from "react-native";
import { useCustomerOps } from "../src/state/live";
import { cartFood, placeOrder, showPaid, useStore } from "../src/state/store";
import { Button, Card, DemoNote, Field, Line, Screen, T, TopBar } from "../src/ui/kit";

// Demo payment (CUS-07). The card form never takes real details. No money moves.
export default function PayScreen() {
  const { s, set } = useStore();
  const ops = useCustomerOps();
  const total = cartFood(s.cart) + (s.mode === "delivery" ? s.fee : 0);
  const [sending, setSending] = useState(false);
  const confirm = async () => {
    if (ops.live) {
      setSending(true);
      const ok = await ops.placeOrder();
      setSending(false);
      if (ok) showPaid();
      return;
    }
    set((st) => placeOrder(st));
    showPaid();
  };
  return (
    <Screen
      header={<TopBar title={`Pay ${naira(total)}`} />}
      footer={
        <Button
          label={s.pay === "card" ? `Pay ${naira(total)}` : "I’ve sent the transfer"}
          onPress={() => void confirm()}
          disabled={!s.cart.length || sending}
        />
      }
    >
      <DemoNote />
      {s.pay === "card" ? (
        <Card>
          <T v="h2">Card</T>
          <Field label="Card number" value="Demo card 4242" editable={false} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Expiry" value="12 / 29" editable={false} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Security code" value="•••" editable={false} />
            </View>
          </View>
          <T v="small" muted style={{ marginTop: 10 }}>
            These fields are filled in for the demo and can’t be changed.
          </T>
        </Card>
      ) : (
        <Card>
          <T v="h2" style={{ marginBottom: 6 }}>
            Bank transfer
          </T>
          <Line label="Bank" value="Demo Bank" />
          <Line label="Account number" value="0123 456 789" />
          <Line label="Account name" value="CKE Demo" />
          <Line label="Amount" value={naira(total)} />
          <T v="small" muted style={{ marginTop: 8 }}>
            Normally this confirms by itself once the transfer lands. In this demo, it confirms when
            you tap the button.
          </T>
        </Card>
      )}
    </Screen>
  );
}
