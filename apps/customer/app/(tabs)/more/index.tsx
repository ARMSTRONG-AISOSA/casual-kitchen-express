import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { PAGES } from "../../../src/data/pages";
import { useTheme } from "../../../src/state/theme";
import { Card, Screen, T } from "../../../src/ui/kit";
import { PreviewTools } from "../../../src/ui/preview-tools";

// More: a list of text pages (CUS-26), and the photo credits.
export default function MoreScreen() {
  const t = useTheme();
  return (
    <Screen
      tabs
      header={
        <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
          <T v="h1">More</T>
        </View>
      }
    >
      <Card style={{ paddingVertical: 2 }}>
        {PAGES.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/more/${p.id}`)}
            accessibilityRole="button"
            style={[
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
            ]}
          >
            <T style={{ flex: 1 }}>{p.title}</T>
            <ChevronRight size={20} color={t.muted} />
          </Pressable>
        ))}
        <Pressable
          onPress={() => router.push("/more/photo-credits")}
          accessibilityRole="button"
          style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}
        >
          <T style={{ flex: 1 }}>Photo credits</T>
          <ChevronRight size={20} color={t.muted} />
        </Pressable>
      </Card>
      <T v="small" muted center style={{ marginTop: 14 }}>
        CKE app version {Constants.expoConfig?.version ?? "1.0.0"} (demo)
      </T>
      {__DEV__ ? <PreviewTools /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 54 },
});
