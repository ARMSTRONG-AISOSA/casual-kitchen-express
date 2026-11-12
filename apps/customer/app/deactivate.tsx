import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useStore } from "../src/state/store";
import { Button, Checkbox, Notice, Screen, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";

// Deactivate: one confirmation tick, then sign out. Nothing is deleted (CUS-25).
export default function DeactivateScreen() {
  const { s, set } = useStore();
  const toast = useToast();
  const [agree, setAgree] = useState(false);
  const busy =
    !!s.order && !s.order.cancelled && s.order.stage < (s.order.mode === "delivery" ? 8 : 5);
  return (
    <Screen
      header={<TopBar title="Deactivate account" />}
      footer={
        <>
          <Button
            label="Deactivate my account"
            disabled={!agree || busy}
            onPress={() => {
              set({ deactivated: true, signedIn: false });
              toast("Account deactivated. Sign in again to come back.");
              router.replace("/");
            }}
          />
          <Button
            label="Keep it active"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => router.back()}
          />
        </>
      }
    >
      <T v="h1" style={{ marginTop: 6 }}>
        Take a break?
      </T>
      <T muted style={{ marginTop: 8 }}>
        When you deactivate your account, we:
      </T>
      <View style={{ marginTop: 6, gap: 4 }}>
        {[
          "sign you out on this phone",
          "keep your addresses, orders, and saved demo card",
          "stop order updates and messages",
        ].map((x) => (
          <T key={x} muted>
            {"•  "}
            {x}
          </T>
        ))}
      </View>
      <T muted style={{ marginTop: 10 }}>
        To come back, sign in with Google and confirm that you want to reactivate.
      </T>
      {busy ? (
        <Notice>
          You have an order in progress. Wait until it’s delivered before you deactivate.
        </Notice>
      ) : null}
      <Checkbox
        label="I want to deactivate my account."
        checked={agree}
        onToggle={() => setAgree(!agree)}
      />
    </Screen>
  );
}
