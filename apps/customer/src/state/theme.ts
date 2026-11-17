import { accent, color, darkTheme } from "@cke/brand-tokens";
import { useColorScheme } from "react-native";
import { useStore } from "./store";

// Light and dark palettes for the customer app (design.md 3.2 and 3.9).
export type Palette = {
  mode: "light" | "dark";
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  primary: string;
  onPrimary: string;
  accent: string;
  chip: string;
  success: string;
  danger: string;
  onDanger: string;
  hero: string;
  onHero: string;
  heroMuted: string;
  warnBg: string;
  okBg: string;
  yellow: string;
  kraft: string;
};

export const light: Palette = {
  mode: "light",
  bg: color.cream,
  surface: color.white,
  text: color.charcoal,
  muted: color.mutedText,
  line: "#E8DCC8",
  primary: color.red,
  onPrimary: color.cream,
  accent: color.red,
  chip: "#F5E7CF",
  success: accent.successLight,
  danger: accent.deepTomato,
  onDanger: color.white,
  hero: color.charcoal,
  onHero: color.cream,
  heroMuted: "#E9DCC4",
  warnBg: "#FBE4DE",
  okBg: "#E4F1E6",
  yellow: color.yellow,
  kraft: color.kraft,
};

export const dark: Palette = {
  mode: "dark",
  bg: darkTheme.background,
  surface: darkTheme.surface,
  text: darkTheme.text,
  muted: darkTheme.mutedText,
  line: "#3A332E",
  primary: color.cream,
  onPrimary: color.charcoal,
  accent: accent.lightTomato,
  chip: "#332C28",
  success: accent.successDark,
  danger: accent.lightTomato,
  onDanger: darkTheme.background, // 4.9:1 on Light Tomato (charcoal was 4.4)
  hero: "#332C28",
  onHero: color.cream,
  heroMuted: "#E9DCC4",
  warnBg: "#3B2622",
  okBg: "#1F3324",
  yellow: color.yellow,
  kraft: "#8A7356",
};

export function useTheme(): Palette {
  const system = useColorScheme();
  const pref = useStore().s.themePref;
  const mode = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return mode === "dark" ? dark : light;
}
