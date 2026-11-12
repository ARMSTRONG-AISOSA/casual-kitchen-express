import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { cartCount, cartFood, placeOrder, showPaid, useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import {
  Button,
  Card,
  Chip,
  DemoNote,
  Line,
  Row,
  Screen,
  Segmented,
  T,
  TopBar,
} from "../src/ui/kit";
import { Sheet } from "../src/ui/sheet";
import { useToast } from "../src/ui/toast";

// Single-screen checkout (CUS-05). First-time customers continue with Google, then add an address
// and an optional gender on the same screen. Returning customers pay in one tap.
export default function CheckoutScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [reactivate, setReactivate] = useState(false);

  const food = cartFood(s.cart);
  const fee = s.mode === "delivery" ? s.fee : 0;
  const n = cartCount(s.cart);
  const open = s.open === "open";
  const ready = s.signedIn && (s.mode === "pickup" || s.hasAddress) && open && s.cart.length > 0;

  const google = () => {
    if (s.deactivated) return setReactivate(true);
    set((st) => ({
      signedIn: true,
      name: st.name || "Ada Okoro",
      email: st.email || "ada.okoro@gmail.com",
      customerId: st.customerId || "C-01093",
    }));
    toast("Signed in with Google");
  };

  const pay = () => {
    if (s.savedCard && s.pay === "card") {
      set((st) => placeOrder(st));
      showPaid();
    } else {
      router.push("/pay");
    }
  };

  const hint = !s.cart.length
    ? "Your order is empty"
    : !open
      ? s.open === "paused"
        ? "Orders are paused"
        : "Online orders open at 8:00 am"
      : !s.signedIn
        ? "Sign in to continue"
        : !ready
          ? "Add a delivery address to continue"
          : null;

  return (
    <Screen
      header={<TopBar title="Checkout" />}
      footer={
        <>
          {hint ? (
            <T v="small" muted center style={{ marginBottom: 8 }}>
              {hint}
            </T>
          ) : null}
          <Button label={`Pay ${naira(food + fee)}`} onPress={pay} disabled={!ready} />
        </>
      }
    >
      <Segmented
        options={[
          ["delivery", "Delivery"],
          ["pickup", "Pickup"],
        ]}
        value={s.mode}
        onChange={(mode) => set({ mode })}
      />

      {!s.signedIn ? (
        <Card>
          <T v="h2">Sign in to place your order</T>
          <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
            One tap, no password. Your email comes from Google.
          </T>
          <Button label="Continue with Google" variant="ghost" onPress={google} />
        </Card>
      ) : (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T v="label">{s.name}</T>
              <T v="small" muted>
                {s.email}
              </T>
            </View>
            <View style={[styles.pill, { backgroundColor: t.chip }]}>
              <T v="small" bold>
                Signed in
              </T>
            </View>
          </Row>
        </Card>
      )}

      {s.mode === "pickup" ? (
        <Card>
          <T v="h2">Pickup</T>
          <T v="small" muted style={{ marginTop: 4 }}>
            Collect at our kitchen in Ugbowo, near the University of Benin. We’ll tell you when it’s
            ready.
          </T>
        </Card>
      ) : s.signedIn && s.hasAddress ? (
        <Card>
          <T v="h2">Deliver to</T>
          <Row style={{ marginTop: 6, justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <T v="label">
                {s.address.label}, {s.address.area}
              </T>
              <T v="small" muted>
                {s.address.landmark}
              </T>
              <T v="small" muted>
                {s.address.phone}
              </T>
            </View>
            <Button label="Change" variant="ghost" small onPress={() => router.push("/address")} />
          </Row>
        </Card>
      ) : s.signedIn ? (
        <Card>
          <T v="h2">Delivery address</T>
          <T v="small" muted style={{ marginTop: 4, marginBottom: 10 }}>
            Pick your area, drop a pin, and add a landmark.
          </T>
          <Button
            label="Add delivery address"
            variant="ghost"
            small
            icon={<MapPin size={18} color={t.text} />}
            onPress={() => router.push("/address")}
          />
        </Card>
      ) : null}

      {s.signedIn && !s.returning ? (
        <Card>
          <T v="label">
            Gender{" "}
            <T v="small" muted>
              (optional)
            </T>
          </T>
          <View style={styles.chips}>
            {["Female", "Male", "Prefer not to say"].map((g) => (
              <Chip
                key={g}
                label={g}
                selected={s.gender === g}
                onPress={() => set({ gender: s.gender === g ? "" : g })}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {s.signedIn ? (
        <Card>
          <T v="h2" style={{ marginBottom: 6 }}>
            Pay with
          </T>
          <Segmented
            options={[
              ["card", "Card"],
              ["transfer", "Bank transfer"],
            ]}
            value={s.pay}
            onChange={(pay) => set({ pay })}
          />
          {s.pay === "card" && s.savedCard ? (
            <T v="small" style={{ marginTop: 10 }}>
              Demo card ending 4242
            </T>
          ) : null}
          <DemoNote />
        </Card>
      ) : null}

      <Card>
        <Line label={`Food (${n} item${n === 1 ? "" : "s"})`} value={naira(food)} />
        <Line
          label={s.mode === "delivery" ? "Delivery" : "Pickup"}
          value={s.mode === "delivery" ? naira(fee) : "Free"}
        />
        <Line label="Total" value={naira(food + fee)} total />
      </Card>

      <Sheet visible={reactivate} onClose={() => setReactivate(false)} title="Welcome back">
        <T muted>
          Your account is deactivated. Reactivate it to see your orders and addresses again.
        </T>
        <Button
          label="Reactivate my account"
          style={{ marginTop: 16 }}
          onPress={() => {
            set({ deactivated: false, signedIn: true });
            setReactivate(false);
            toast("Welcome back. Your account is active.");
          }}
        />
        <Button
          label="Not now"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => setReactivate(false)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
});
