import { fontFamily } from "@cke/brand-tokens";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../state/theme";

const ToastContext = createContext<(msg: string) => void>(() => {});

/** Short confirmations such as "Picked up". Plain, with no animation (design.md 5.2). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(text);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={styles.layer}>
          <View style={[styles.toast, { backgroundColor: t.text }]}>
            <Text accessibilityRole="alert" style={[styles.text, { color: t.bg }]}>
              {msg}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  // Above the tall footer buttons and the tab bar.
  layer: { position: "absolute", left: 0, right: 0, bottom: 250, alignItems: "center" },
  toast: { maxWidth: "88%", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14 },
  text: { fontFamily: fontFamily.bodyBold, fontSize: 18 },
});
