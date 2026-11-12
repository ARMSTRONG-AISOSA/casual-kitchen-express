import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AREAS } from "../src/data/menu";
import { inRange, type Point } from "../src/data/geo";
import { useStore, type Address } from "../src/state/store";
import { Button, Chip, Field, Notice, Screen, T, TopBar } from "../src/ui/kit";
import { MapStandIn } from "../src/ui/map";
import { useToast } from "../src/ui/toast";

// Address entry without search: pick an area, drop a pin, add a landmark (design.md 4.3, architecture.md 14.3).
// `?example=outside` opens with a pin beyond Oluku Market, to show the out-of-range message.
export default function AddressScreen() {
  const { s, set } = useStore();
  const toast = useToast();
  const { example } = useLocalSearchParams<{ example?: string }>();
  const outside = example === "outside";
  const [draft, setDraft] = useState<Address>({
    ...s.address,
    ...(outside ? { pin: [312, 16] as Point, area: "Other area in range" } : {}),
  });
  const ok = inRange(draft.pin);
  const edit = (p: Partial<Address>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Screen
      header={<TopBar title="Delivery address" />}
      footer={
        <Button
          label="Save address"
          disabled={!ok || !draft.landmark.trim() || !draft.phone.trim()}
          onPress={() => {
            set({ address: draft, hasAddress: true });
            toast("Address saved");
            router.back();
          }}
        />
      }
    >
      <View style={styles.chips}>
        {(["Home", "Work", "Other"] as const).map((l) => (
          <Chip key={l} label={l} selected={draft.label === l} onPress={() => edit({ label: l })} />
        ))}
      </View>

      <T v="label" style={{ marginTop: 18, marginBottom: 2 }}>
        Area
      </T>
      <View style={styles.chips}>
        {AREAS.map((a) => (
          <Chip key={a} label={a} selected={draft.area === a} onPress={() => edit({ area: a })} />
        ))}
      </View>

      <T v="label" style={{ marginTop: 18, marginBottom: 6 }}>
        Your pin{" "}
        <T v="small" muted>
          (tap the map to move it)
        </T>
      </T>
      <MapStandIn
        pin={draft.pin}
        boundary
        onPick={(pin) => edit({ pin })}
        label="Map of the delivery area with your pin. Tap to move the pin."
      />

      {!ok ? (
        <>
          <Notice>
            <T>
              <T bold>This pin is outside our delivery range.</T> We deliver from Uselu to Oluku
              Market. Move the pin, or switch to pickup.
            </T>
          </Notice>
          <Button
            label="Switch to pickup"
            variant="ghost"
            small
            style={{ marginTop: 10 }}
            onPress={() => {
              set({ mode: "pickup" });
              router.back();
            }}
          />
        </>
      ) : null}

      <Field
        label="Landmark"
        value={draft.landmark}
        onChangeText={(landmark) => edit({ landmark })}
        placeholder="For example: blue gate after Ekosodin Market"
      />
      <Field
        label="Phone for the rider"
        value={draft.phone}
        onChangeText={(phone) => edit({ phone })}
        keyboardType="phone-pad"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
});
