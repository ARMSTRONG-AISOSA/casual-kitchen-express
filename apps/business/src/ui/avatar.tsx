import { fontFamily } from "@cke/brand-tokens";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { useStore } from "../state/store";
import { useTheme } from "../state/theme";

/**
 * A staff member's photo, or their initials on Tomato Red when there's no photo yet (3.1). Used in
 * the top bar, People, and the profile view.
 */
export function Avatar({ code, name, size = 40 }: { code?: string; name?: string; size?: number }) {
  const { s } = useStore();
  const t = useTheme();
  const photo = code ? s.staffPhotos[code] : undefined;
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (photo)
    return (
      <Image
        source={{ uri: photo.uri }}
        contentFit="cover"
        style={box}
        accessibilityLabel={`${name ?? code} photo`}
      />
    );
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <View
      style={[box, { backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }]}
      accessibilityLabel={`${name ?? code}, no photo yet`}
    >
      <Text style={{ color: t.onPrimary, fontFamily: fontFamily.bodyBold, fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}
