import { accent, color, riderPalette } from "@cke/brand-tokens";
import { useColorScheme } from "react-native";
import { useStore } from "./store";

// The rider palette (design.md 3.2): black and white for sunlight, with brand colours only for
// alerts, notifications, and success. Every alert, success, or notice also carries an icon and a label.
export type Palette = {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  alert: string;
  onAlert: string;
  success: string;
  onSuccess: string;
  notice: string;
  onNotice: string;
};

export const light: Palette = {
  mode: "light",
  bg: riderPalette.light.background,
  surface: riderPalette.light.surface,
  text: riderPalette.light.text,
  muted: riderPalette.light.mutedText,
  border: "#000000",
  primary: "#000000",
  onPrimary: "#FFFFFF",
  alert: accent.deepTomato,
  onAlert: "#FFFFFF",
  success: "#176631", // Success green, a shade darker for 7:1 with white (design.md 3.6)
  onSuccess: "#FFFFFF",
  notice: color.yellow,
  onNotice: "#000000",
};

export const dark: Palette = {
  mode: "dark",
  bg: riderPalette.dark.background,
  surface: riderPalette.dark.surface,
  text: riderPalette.dark.text,
  muted: riderPalette.dark.mutedText,
  border: "#FFFFFF",
  primary: "#FFFFFF",
  onPrimary: "#000000",
  alert: "#E77361", // Light Tomato, a shade lighter for 7:1 with black (design.md 3.6)
  onAlert: "#000000",
  success: accent.successDark,
  onSuccess: "#000000",
  notice: color.yellow,
  onNotice: "#000000",
};

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useStore().s.themePref;
  const mode = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return mode === "dark" ? dark : light;
}
