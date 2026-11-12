import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../state/theme";
import { T } from "./kit";

/** A bottom sheet over a dimmed backdrop. Tapping the backdrop closes it. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.wrap}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />
        </Pressable>
        <View
          style={[styles.panel, { backgroundColor: t.bg, paddingBottom: insets.bottom + 16 }]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: t.line }]} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <T v="h1" style={{ marginBottom: 6 }}>
              {title}
            </T>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "88%",
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 12 },
});
