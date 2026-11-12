import { fontFamily } from "@cke/brand-tokens";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line as SvgLine, Path, Polygon, Text as SvgText } from "react-native-svg";
import { BOUNDARY, KITCHEN, type Point } from "../data/geo";
import { useTheme } from "../state/theme";

const W = 320;
const H = 240;

/**
 * A drawn stand-in for the map until MapLibre with OpenFreeMap tiles is added in a later native build
 * (architecture.md 14.3). Markers follow design.md 4.4: a red kitchen pin, a charcoal rider marker,
 * and a yellow customer pin with a charcoal outline.
 */
export function MapStandIn({
  pin,
  rider,
  boundary,
  onPick,
  label,
}: {
  pin?: Point;
  rider?: Point;
  boundary?: boolean;
  onPick?: (p: Point) => void;
  label: string;
}) {
  const t = useTheme();
  const land = t.mode === "dark" ? "#2E2926" : "#F3EBDD";
  const road = t.mode === "dark" ? "#4A423C" : "#FFFFFF";
  // Converts a tap on the screen into map coordinates.
  const scale = useRef({ x: 1, y: 1 });
  return (
    <View style={[styles.wrap, { borderColor: t.line }]}>
      <Pressable
        disabled={!onPick}
        style={styles.canvas}
        accessibilityRole={onPick ? "adjustable" : "image"}
        accessibilityLabel={label}
        onPress={(e) => {
          if (!onPick) return;
          const { locationX, locationY } = e.nativeEvent;
          onPick([
            Math.round(locationX * scale.current.x),
            Math.round(locationY * scale.current.y),
          ]);
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          scale.current = { x: W / width, y: H / height };
        }}
      >
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
          <Path d={`M0 0 H${W} V${H} H0 Z`} fill={land} />
          <SvgLine x1="0" y1="226" x2="320" y2="20" stroke={road} strokeWidth={9} />
          <SvgLine x1="60" y1="240" x2="150" y2="120" stroke={road} strokeWidth={5} />
          <SvgLine x1="180" y1="240" x2="230" y2="60" stroke={road} strokeWidth={4} />
          {boundary ? (
            <Polygon
              points={BOUNDARY.map((p) => p.join(",")).join(" ")}
              fill={t.accent}
              fillOpacity={0.07}
              stroke={t.accent}
              strokeWidth={2}
              strokeDasharray="6 5"
            />
          ) : null}
          <SvgText x="18" y="232" fontSize="10" fill={t.muted} fontFamily={fontFamily.bodySemiBold}>
            Uselu
          </SvgText>
          <SvgText x="236" y="24" fontSize="10" fill={t.muted} fontFamily={fontFamily.bodySemiBold}>
            Oluku Market
          </SvgText>
          <Circle
            cx={KITCHEN[0]}
            cy={KITCHEN[1]}
            r="9"
            fill="#C83F2D"
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
          {pin ? (
            <Path
              d={`M${pin[0]} ${pin[1]} l-9 -14 a11 11 0 1 1 18 0 z`}
              fill="#F2B544"
              stroke="#292522"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ) : null}
          {rider ? (
            <Circle
              cx={rider[0]}
              cy={rider[1]}
              r="8"
              fill="#292522"
              stroke="#FFFFFF"
              strokeWidth={2.5}
            />
          ) : null}
        </Svg>
      </Pressable>
      <Text style={[styles.note, { color: t.muted }]}>
        Map preview. The real map comes in a later build.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The drawing keeps its 4:3 shape at any screen width.
  canvas: { width: "100%", aspectRatio: W / H },
  wrap: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  note: { fontFamily: fontFamily.body, fontSize: 11, paddingHorizontal: 10, paddingVertical: 6 },
});
