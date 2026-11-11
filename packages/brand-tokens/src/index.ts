// Brand tokens for the apps. Values come from brand/cke-logo-package/tokens/brand-tokens.json,
// which is the source of truth. Don't redefine brand colours anywhere else.
import tokens from "../../../brand/cke-logo-package/tokens/brand-tokens.json";

export const color = tokens.color;
export const font = tokens.font;
export const typeScale = tokens.typeScale;
export const minTapTarget = tokens.minTapTarget;
export const darkTheme = tokens.darkTheme;
export const riderPalette = tokens.riderPalette;

/** Deep Tomato and the other accents listed in design.md 3.1 and 3.2. */
export const accent = {
  deepTomato: "#A32A1B",
  lightTomato: "#E4604C",
  successLight: "#1B7A3A",
  successDark: "#5CC47E",
} as const;

/** Font family names as registered with expo-font. */
export const fontFamily = {
  heading: "Nunito_800ExtraBold",
  headingBold: "Nunito_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;

/** Spacing on an 8 px grid (design.md 3.5). */
export const space = (n: number) => n * 8;

export const radius = { card: 16, button: 12 } as const;

/** Formats whole naira as ₦2,000. */
export const naira = (amount: number) => "₦" + Math.round(amount).toLocaleString("en-US");
