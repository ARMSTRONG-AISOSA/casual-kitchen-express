import { fontFamily } from "@cke/brand-tokens";
import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DEMO_DELIVERY_CODE } from "../src/data/orders";
import { completeNext, useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Screen, StateBanner, T, TopBar } from "../src/ui/kit";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Delete"];
const MAX_TRIES = 3;

// Delivery code (RID-10): the customer reads out 4 digits, and the right code completes the
// delivery. The screen stays awake here (RID-15). Demo code: 4827.
export default function Code() {
  useKeepAwake();
  const { s, set } = useStore();
  const t = useTheme();
  const [code, setCode] = useState("");
  const o = s.carrying[0];
  const locked = s.codeTries >= MAX_TRIES;

  // The ref always holds the latest digits, so quick taps never drop one.
  const entered = useRef("");
  const press = (k: string) => {
    const c = entered.current;
    const next = k === "Clear" ? "" : k === "Delete" ? c.slice(0, -1) : (c + k).slice(0, 4);
    if (next.length < 4) {
      entered.current = next;
      setCode(next);
      return;
    }
    entered.current = "";
    if (next === DEMO_DELIVERY_CODE) {
      setCode(next);
      set((st) => completeNext(st));
      router.replace({ pathname: "/delivered", params: { no: o?.no ?? "" } });
    } else {
      setCode("");
      set((st) => ({ codeTries: st.codeTries + 1 }));
    }
  };

  return (
    <Screen
      header={<TopBar title="Enter the code" back />}
      footer={<Button label="Need help" variant="alt" onPress={() => router.push("/help")} />}
    >
      <T>Ask {o?.customer ?? "the customer"} for the 4-digit code.</T>
      <View style={styles.boxes} accessibilityLabel={`Code entered: ${code.length} of 4 digits`}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.box, { borderColor: t.border, backgroundColor: t.surface }]}>
            <Text style={[styles.digit, { color: t.text }]}>{code[i] ?? ""}</Text>
          </View>
        ))}
      </View>
      {locked ? (
        <StateBanner
          kind="alert"
          label="Too many tries. Tap Need help and the manager will sort it out."
        />
      ) : (
        <>
          {s.codeTries > 0 ? (
            <StateBanner
              kind="alert"
              label="That code doesn’t match. Check with the customer and try again."
            />
          ) : null}
          <View style={styles.pad}>
            {KEYS.map((k) => (
              <Pressable
                key={k}
                onPress={() => press(k)}
                accessibilityRole="button"
                accessibilityLabel={k}
                style={({ pressed }) => [
                  styles.key,
                  { borderColor: t.border, backgroundColor: pressed ? t.surface : t.bg },
                ]}
              >
                <Text style={[styles.keyText, { color: t.text }, k.length > 1 && { fontSize: 20 }]}>
                  {k}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <T v="small" muted style={{ marginTop: 12 }}>
        Demo code: {DEMO_DELIVERY_CODE}
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 18 },
  box: {
    width: 64,
    height: 76,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  digit: { fontFamily: fontFamily.bodyBold, fontSize: 36 },
  pad: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  key: {
    width: "31%",
    flexGrow: 1,
    minHeight: 68,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontFamily: fontFamily.bodyBold, fontSize: 28 },
});
