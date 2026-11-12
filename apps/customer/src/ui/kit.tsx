import { fontFamily, logos, naira, radius } from "@cke/brand-tokens";
import { router } from "expo-router";
import { Check, ChevronLeft, Info } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { useTheme } from "../state/theme";

/* ---------- text ---------- */

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "small" | "price" | "label";

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 32 },
  h1: { fontFamily: fontFamily.heading, fontSize: 24, lineHeight: 29 },
  h2: { fontFamily: fontFamily.headingBold, fontSize: 18, lineHeight: 23 },
  h3: { fontFamily: fontFamily.headingBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
  price: { fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: 14, lineHeight: 19 },
};

export function T({
  v = "body",
  muted,
  bold,
  color,
  center,
  style,
  children,
  ...rest
}: {
  v?: Variant;
  muted?: boolean;
  bold?: boolean;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        variants[v],
        { color: color ?? (muted ? t.muted : t.text) },
        bold && { fontFamily: fontFamily.bodyBold },
        center && { textAlign: "center" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const Price = ({ amount, style }: { amount: number; style?: StyleProp<TextStyle> }) => (
  <T v="price" style={style}>
    {naira(amount)}
  </T>
);

/* ---------- layout ---------- */

/** A screen with the safe-area top, an optional scroll body, and an optional fixed footer. */
export function Screen({
  children,
  footer,
  scroll = true,
  header,
  tabs,
  bottomSpace = 24,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  tabs?: boolean;
  bottomSpace?: number;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Without a footer or the tab bar, keep the last item clear of Android's navigation buttons.
  const navSpace = !footer && !tabs ? insets.bottom : 0;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomSpace + navSpace }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: navSpace }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {header}
      {/* Lifts the content and the footer buttons above the keyboard while typing. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={{ flex: 1 }}>{body}</View>
        {footer ? (
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 10,
              paddingBottom: (tabs ? 0 : insets.bottom) + 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: t.line,
              backgroundColor: t.bg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export function TopBar({
  title,
  back = true,
  onBack,
}: {
  title?: string;
  back?: boolean;
  onBack?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.topbar}>
      {back ? (
        <Pressable
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={[styles.back, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <ChevronLeft size={22} color={t.text} />
        </Pressable>
      ) : null}
      {title ? (
        <T v="h1" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </T>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>
      {children}
    </View>
  );
}

export const Gap = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>
  );
}

/** A label and a value on one line, used for totals and summaries. */
export function Line({ label, value, total }: { label: string; value: string; total?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.line,
        total && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.line,
          marginTop: 4,
          paddingTop: 10,
        },
      ]}
    >
      <T v={total ? "label" : "body"}>{label}</T>
      <T v={total ? "price" : "body"}>{value}</T>
    </View>
  );
}

/* ---------- controls ---------- */

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  small,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.primary : variant === "danger" ? t.danger : "transparent";
  const fg = variant === "primary" ? t.onPrimary : variant === "danger" ? t.onDanger : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, minHeight: small ? 44 : 52 },
        variant === "ghost" && {
          borderWidth: 1.5,
          borderColor: t.line,
          backgroundColor: t.surface,
        },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.8 },
        style,
      ]}
    >
      {icon}
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: small ? 15 : 16, color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** An underlined text link for actions that shouldn't be tapped by accident (design.md 4.4). */
export function QuietLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={{ paddingVertical: 12, alignSelf: "center" }}
    >
      <T v="label" muted style={{ textDecorationLine: "underline" }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        { borderColor: selected ? t.text : t.line, backgroundColor: selected ? t.text : t.surface },
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.bodySemiBold,
          fontSize: 14,
          color: selected ? t.bg : t.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: [V, string][];
  value: V;
  onChange: (v: V) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.chip }]} accessibilityRole="tablist">
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: t.surface }]}
          >
            <Text
              style={{
                fontFamily: fontFamily.bodySemiBold,
                fontSize: 15,
                color: on ? t.text : t.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Qty({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const t = useTheme();
  const btn = (label: string, delta: number, a11y: string) => (
    <Pressable
      onPress={() => onChange(Math.max(min, value + delta))}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={[styles.qtyBtn, { borderColor: t.line, backgroundColor: t.surface }]}
    >
      <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 20, color: t.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row style={{ gap: 6 }}>
      {btn("−", -1, "One fewer")}
      <T v="label" style={{ minWidth: 26, textAlign: "center" }}>
        {value}
      </T>
      {btn("+", 1, "One more")}
    </Row>
  );
}

/** A selectable option row, used for dish options and cancellation reasons. */
export function Option({
  label,
  extra,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  extra?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      style={[
        styles.option,
        { borderColor: selected ? t.accent : t.line, backgroundColor: t.surface },
        selected && { borderWidth: 2 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? t.accent : t.muted }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: t.accent }]} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
      {extra ? <T v="label">{extra}</T> : null}
    </Pressable>
  );
}

/** A large tick box with a plain sentence, used before cancelling, deactivating, and deleting. */
export function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 12 }}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? t.accent : t.muted,
            backgroundColor: checked ? t.accent : "transparent",
          },
        ]}
      >
        {checked ? (
          <Check size={18} color={t.mode === "dark" ? "#000" : "#fff"} strokeWidth={3} />
        ) : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}

export function Field({
  label,
  optional,
  hint,
  ...input
}: TextInputProps & { label: string; optional?: boolean; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <T v="label" style={{ marginBottom: 6 }}>
        {label}
        {optional ? (
          <T v="small" muted>
            {"  (optional)"}
          </T>
        ) : null}
      </T>
      <TextInput
        placeholderTextColor={t.muted}
        {...input}
        style={[
          styles.input,
          {
            borderColor: t.line,
            backgroundColor: input.editable === false ? t.chip : t.surface,
            color: t.text,
          },
        ]}
      />
      {hint ? (
        <T v="small" muted style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/* ---------- messages ---------- */

export function Notice({ kind = "warn", children }: { kind?: "warn" | "ok"; children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={[styles.notice, { backgroundColor: kind === "warn" ? t.warnBg : t.okBg }]}
      accessibilityRole={kind === "warn" ? "alert" : undefined}
    >
      {typeof children === "string" ? <T>{children}</T> : children}
    </View>
  );
}

/** "Demo payment. No money is taken." (CUS-21) */
export function DemoNote() {
  const t = useTheme();
  return (
    <View style={[styles.demoNote, { backgroundColor: t.chip }]}>
      <Info size={18} color={t.text} />
      <T v="label">Demo payment. No money is taken.</T>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <T v="h2" style={{ marginTop: 22, marginBottom: 10 }}>
      {children}
    </T>
  );
}

/* ---------- brand ---------- */

/** The horizontal lockup from the logo package, chosen for the background. */
export function Logo({ height = 26, onDark }: { height?: number; onDark?: boolean }) {
  const t = useTheme();
  const dark = onDark ?? t.mode === "dark";
  const l = dark ? logos.logoHorizontalCharcoal : logos.logoHorizontalCream;
  return (
    <View accessibilityRole="image" accessibilityLabel="Casual Kitchen Express">
      <SvgXml xml={l.xml} height={height} width={height * l.ratio} />
    </View>
  );
}

export function BrandIcon({ size = 64, onDark }: { size?: number; onDark?: boolean }) {
  const l = onDark ? logos.iconCharcoal : logos.iconCream;
  return <SvgXml xml={l.xml} height={size / l.ratio} width={size} />;
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  card: { borderRadius: radius.card, borderWidth: 1, padding: 16, marginTop: 12 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  button: {
    borderRadius: radius.button,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
  },
  segmented: { flexDirection: "row", borderRadius: 14, padding: 4, marginTop: 4 },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  box: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fontFamily.body,
    fontSize: 16,
  },
  notice: { borderRadius: 12, padding: 14, marginTop: 12 },
  demoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
});
