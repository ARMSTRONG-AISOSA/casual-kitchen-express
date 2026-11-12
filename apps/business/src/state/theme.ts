import { accent, color, darkTheme } from "@cke/brand-tokens";
import { useColorScheme } from "react-native";
import { useStore } from "./store";

// Kitchen and manager palettes (design.md 3.2, 3.3, and 3.9): white and cream, charcoal text,
// Tomato Red buttons with white text, and status colours that always come with an icon and a label.
export type Palette = {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  rail: string;
  text: string;
  muted: string;
  line: string;
  primary: string;
  onPrimary: string;
  chip: string;
  danger: string;
  onDanger: string;
  newBg: string;
  onNew: string;
  progressBg: string;
  onProgress: string;
  readyBg: string;
  onReady: string;
  success: string;
};

export const light: Palette = {
  mode: "light",
  bg: color.cream,
  surface: color.white,
  rail: color.white,
  text: color.charcoal,
  muted: color.mutedText,
  line: color.border,
  primary: color.red,
  onPrimary: color.white,
  chip: "#F5E7CF",
  danger: accent.deepTomato,
  onDanger: color.white,
  newBg: color.yellow,
  onNew: color.charcoal,
  progressBg: "#4A5560",
  onProgress: color.white,
  readyBg: accent.successLight,
  onReady: color.white,
  success: accent.successLight,
};

export const dark: Palette = {
  mode: "dark",
  bg: darkTheme.background,
  surface: darkTheme.surface,
  rail: "#171412",
  text: darkTheme.text,
  muted: darkTheme.mutedText,
  line: "#3A332E",
  primary: accent.lightTomato,
  onPrimary: color.charcoal,
  chip: "#332C28",
  danger: accent.lightTomato,
  onDanger: color.charcoal,
  newBg: color.yellow,
  onNew: color.charcoal,
  progressBg: "#9FB0C0",
  onProgress: color.charcoal,
  readyBg: accent.successDark,
  onReady: color.charcoal,
  success: accent.successDark,
};

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useStore().s.themePref;
  const mode = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return mode === "dark" ? dark : light;
}
