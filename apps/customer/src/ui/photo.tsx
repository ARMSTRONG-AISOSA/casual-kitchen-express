import { fontFamily } from "@cke/brand-tokens";
import { Image } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useStore } from "../state/store";
import Svg, { Ellipse, Path } from "react-native-svg";
import { useTheme } from "../state/theme";

/**
 * A dish photo. Shows the real photo when the API has one (sourced as the brand document asks, with
 * credits on More, Photo credits), and the drawn placeholder otherwise. expo-image keeps photos on
 * the phone: each address never changes, so it downloads once.
 */
export function PhotoPlaceholder({
  height,
  width,
  label,
  caption = false,
  style,
}: {
  height: number;
  width?: number;
  /** What the photo shows, for example the dish, or today's soup for soup dishes. */
  label: string;
  /** Names the photo on large placeholders, so a change of soup shows in the picture too. */
  caption?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const { s } = useStore();
  const uri = s.photos[label];
  if (uri) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={`${label} photo`}
        style={[styles.box, { height, width, backgroundColor: t.kraft }, style]}
      >
        <Image
          source={{ uri }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          style={StyleSheet.absoluteFill}
        />
        {caption ? <Text style={styles.note}>{label}</Text> : null}
      </View>
    );
  }
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
      {height >= 90 ? (
        <Text style={styles.note}>{caption ? `${label} photo to come` : "Photo to come"}</Text>
      ) : null}
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
