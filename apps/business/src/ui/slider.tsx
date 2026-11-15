import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { useTheme } from "../state/theme";
import { T } from "./kit";

// A slider for whole numbers within a range (design.md 7.2, Alerts): drag the handle or tap the
// track, and − and + step one at a time for an exact value. Snaps to whole steps. Built on React
// Native's own touch handling (the responder props on the track), so it needs no extra package. Screen readers can swipe up and down
// to change it.

const THUMB = 30;

export function Slider({
  label,
  value,
  min,
  max,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Shown after numbers, for example "min". */
  unit: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  // The value under the finger, snapped to a whole step. The track's children ignore touches,
  // so the position is always measured from the track's left edge.
  const follow = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    const at = Math.min(1, Math.max(0, (e.nativeEvent.locationX - THUMB / 2) / (width - THUMB)));
    const v = Math.round(min + at * (max - min));
    if (v !== value) onChange(v);
  };

  const share = max > min ? (value - min) / (max - min) : 0;
  const left = share * Math.max(0, width - THUMB);
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  const btn = (sign: "−" | "+", d: number, disabled: boolean) => (
    <Pressable
      onPress={() => step(d)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${d < 0 ? "Decrease" : "Increase"} ${label}`}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: t.line,
        backgroundColor: t.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text style={{ color: t.text, fontSize: 22, lineHeight: 26 }}>{sign}</Text>
    </Pressable>
  );

  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T v="label">{label}</T>
          {hint ? (
            <T v="small" muted>
              {hint}
            </T>
          ) : null}
        </View>
        <View importantForAccessibility="no-hide-descendants">
          <T v="h2">
            {value} {unit}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
        {btn("−", -1, value <= min)}
        <View
          style={{ flex: 1, height: 48, justifyContent: "center" }}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // Keep the drag even when the finger drifts up or down inside a scrolling page.
          onResponderTerminationRequest={() => false}
          onResponderGrant={follow}
          onResponderMove={follow}
        >
          {/* The track, the filled part up to the handle, and the handle. */}
          <View
            pointerEvents="none"
            style={{
              height: 6,
              borderRadius: 3,
              marginHorizontal: THUMB / 2,
              backgroundColor: t.line,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: THUMB / 2,
              width: left,
              height: 6,
              borderRadius: 3,
              backgroundColor: t.primary,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: t.primary,
              borderWidth: 3,
              borderColor: t.surface,
              elevation: 3,
            }}
          />
        </View>
        {btn("+", 1, value >= max)}
      </View>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 56 }}
        importantForAccessibility="no-hide-descendants"
      >
        <T v="small" muted>
          {min} {unit}
        </T>
        <T v="small" muted>
          {max} {unit}
        </T>
      </View>
    </View>
  );
}
