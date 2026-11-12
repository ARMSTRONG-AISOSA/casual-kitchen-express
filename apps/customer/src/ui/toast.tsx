import { fontFamily } from "@cke/brand-tokens";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useTheme } from "../state/theme";

const ToastContext = createContext<(msg: string) => void>(() => {});

/** Short confirmation messages, such as "Jollof rice added". Inverted colours, so it stands out in both themes. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={styles.layer}>
          <Animated.View
            key={msg.id}
            entering={FadeInDown.duration(200)}
            exiting={FadeOut}
            style={[styles.toast, { backgroundColor: t.text }]}
          >
            <Text accessibilityRole="alert" style={[styles.text, { color: t.bg }]}>
              {msg.text}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  // High enough to clear the tab bar plus the sticky order bar, and the footer buttons on other screens.
  layer: { position: "absolute", left: 0, right: 0, bottom: 176, alignItems: "center" },
  toast: {
    maxWidth: "86%",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#292522",
  },
  text: { fontFamily: fontFamily.bodyMedium, fontSize: 14 },
});
