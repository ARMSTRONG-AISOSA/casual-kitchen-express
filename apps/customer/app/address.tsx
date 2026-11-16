import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AREAS } from "../src/data/menu";
import { useCustomerOps } from "../src/state/live";
import * as Location from "expo-location";
import { LocateFixed } from "lucide-react-native";
import {
  DEFAULT_BOUNDARY,
  AREA_CENTRE,
  inRange,
  nearestArea,
  OUTSIDE_EXAMPLE,
} from "../src/data/geo";
import { useTheme } from "../src/state/theme";
import { useStore, type Address } from "../src/state/store";
import { Button, Chip, Field, Notice, Screen, T, TopBar } from "../src/ui/kit";
import { CkeMap } from "../src/ui/map";
import { useToast } from "../src/ui/toast";

// Address entry without search: pick an area, drop a pin, add a landmark (design.md 4.3, architecture.md 14.3).
// `?example=outside` opens with a pin beyond Oluku Market, to show the out-of-range message.
export default function AddressScreen() {
  const { s, set } = useStore();
  const ops = useCustomerOps();
  const toast = useToast();
  const { example } = useLocalSearchParams<{ example?: string }>();
  const outside = example === "outside";
  const [draft, setDraft] = useState<Address>({
    ...s.address,
    ...(outside ? { pin: OUTSIDE_EXAMPLE, area: "Other area in range" } : {}),
  });
  // The boundary from Settings (the owner's pins), or the same starting copy before it loads (4.7).
  const boundary = s.boundary ?? DEFAULT_BOUNDARY;
  const ok = inRange(draft.pin, boundary);
  const edit = (p: Partial<Address>) => setDraft((d) => ({ ...d, ...p }));
  const t = useTheme();
  const [locating, setLocating] = useState(false);

  // One reading of where the phone is, only when asked (design.md 4.3). No tracking: the
  // permission is "while using the app" and nothing runs in the background.
  const locateMe = async () => {
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain)
        perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast("Location is off for CKE. Tap the map to place your pin instead.");
        return;
      }
      const here =
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((r) => setTimeout(() => r(null), 15_000)),
        ])) ?? (await Location.getLastKnownPositionAsync());
      if (!here) {
        toast("Couldn’t find your location. Tap the map to place your pin instead.");
        return;
      }
      const pin = { lat: here.coords.latitude, lng: here.coords.longitude };
      const area = nearestArea(pin);
      edit({ pin, ...(area && AREAS.includes(area) ? { area } : {}) });
    } catch {
      toast("Couldn’t find your location. Tap the map to place your pin instead.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen
      header={<TopBar title="Delivery address" />}
      footer={
        <Button
          label="Save address"
          disabled={!ok || !draft.landmark.trim() || !draft.phone.trim()}
          onPress={() => {
            void ops.saveAddress(draft).then((saved) => {
              if (!saved) return;
              toast("Address saved");
              router.back();
            });
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
          <Chip
            key={a}
            label={a}
            selected={draft.area === a}
            // The pin moves to the area, so most people only need to nudge it.
            onPress={() => edit({ area: a, pin: AREA_CENTRE[a] ?? draft.pin })}
          />
        ))}
      </View>

      <T v="label" style={{ marginTop: 18, marginBottom: 6 }}>
        Your pin{" "}
        <T v="small" muted>
          (tap the map to move it)
        </T>
      </T>
      <Button
        label={locating ? "Finding you…" : "Use my current location"}
        variant="ghost"
        small
        disabled={locating}
        icon={<LocateFixed size={18} color={t.text} />}
        onPress={() => void locateMe()}
        style={{ marginBottom: 10 }}
      />
      <CkeMap
        pin={draft.pin}
        boundary={boundary}
        onPick={(pin) => edit({ pin })}
        focus={draft.area}
        label={`Map of the delivery area with your pin in ${draft.area}. Tap the map to move the pin.`}
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
