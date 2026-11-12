import { fontFamily } from "@cke/brand-tokens";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { useTheme } from "../state/theme";

/** Placeholder until the food photos are sourced (progress.md, open item 1). */
export function PhotoPlaceholder({
  height,
  width,
  label,
  style,
}: {
  height: number;
  width?: number;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${label} photo, to come`}
      style={[styles.box, { height, width, backgroundColor: t.kraft }, style]}
    >
      <Svg viewBox="0 0 120 80" style={styles.dish}>
        <Ellipse cx="60" cy="52" rx="52" ry="20" fill="#FFF3DF" opacity={0.55} />
        <Ellipse cx="60" cy="48" rx="38" ry="13" fill="#C83F2D" opacity={0.35} />
        <Path
          d="M40 30 q-6 -8 2 -16 M60 26 q-6 -9 2 -18 M80 30 q-6 -8 2 -16"
          stroke="#5B3F23"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          opacity={0.45}
        />
      </Svg>
      {height >= 90 ? <Text style={styles.note}>Photo to come</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, overflow: "hidden", justifyContent: "flex-end" },
  dish: { position: "absolute", width: "80%", height: "70%", right: "4%", top: "12%" },
  note: {
    margin: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255,243,223,0.9)",
    color: "#5B3F23",
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
  },
});
