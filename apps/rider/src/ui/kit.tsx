import { fontFamily, logos } from "@cke/brand-tokens";
import { router } from "expo-router";
import {
  Bell,
  Check,
  ChevronLeft,
  CircleOff,
  Eye,
  EyeOff,
  Radio,
  TriangleAlert,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
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

// Rider building blocks (design.md 5.2 and 5.5): large type, very tall buttons, high contrast,
// no images, and no animation.

type TV = "title" | "big" | "h2" | "key" | "body" | "small";

const type: Record<TV, TextStyle> = {
  title: { fontFamily: fontFamily.heading, fontSize: 30, lineHeight: 36 },
  big: { fontFamily: fontFamily.bodyBold, fontSize: 44, lineHeight: 52, letterSpacing: 1 },
  h2: { fontFamily: fontFamily.heading, fontSize: 22, lineHeight: 28 },
  key: { fontFamily: fontFamily.bodyBold, fontSize: 24, lineHeight: 30 },
  body: { fontFamily: fontFamily.bodyMedium, fontSize: 18, lineHeight: 26 },
  small: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 22 },
};

export function T({
  v = "body",
  muted,
  center,
  color,
  style,
  children,
  ...rest
}: {
  v?: TV;
  muted?: boolean;
  center?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        type[v],
        { color: color ?? (muted ? t.muted : t.text) },
        center && { textAlign: "center" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  header,
  footer,
  tabs,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  tabs?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navSpace = !footer && !tabs ? insets.bottom : 0;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 + navSpace }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: (tabs ? 0 : insets.bottom) + 14,
              gap: 10,
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

/** Title row. With `back`, a large back button goes to the previous screen. */
export function TopBar({
  title,
  back,
  onBack,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.topbar}>
      {back || onBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={[styles.back, { borderColor: t.border }]}
        >
          <ChevronLeft size={30} color={t.text} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      <T v="title" style={{ flex: 1 }} numberOfLines={2}>
        {title}
      </T>
    </View>
  );
}

/**
 * Primary: full width, at least 72 px tall, black on white (white on black in dark mode).
 * Alt: outlined, at least 64 px. Alert: Deep Tomato, for release and other risky actions.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "alt" | "alert";
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.primary : variant === "alert" ? t.alert : t.bg;
  const fg = variant === "primary" ? t.onPrimary : variant === "alert" ? t.onAlert : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        {
          minHeight: variant === "primary" ? 72 : 64,
          backgroundColor: bg,
          borderColor: variant === "alert" ? t.alert : t.border,
        },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      {icon ? icon(fg) : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  strong,
  style,
}: {
  children: ReactNode;
  strong?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: strong ? t.border : t.surface },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A label on the left and its value on the right, in bold. */
export function KV({ k, v }: { k: string; v: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.kv, { borderBottomColor: t.mode === "dark" ? "#2A2A2A" : "#DDDDDD" }]}>
      <T muted style={{ flexShrink: 0, maxWidth: "45%" }}>
        {k}
      </T>
      <T style={{ flex: 1, textAlign: "right", fontFamily: fontFamily.bodyBold }}>{v}</T>
    </View>
  );
}

/** Online, offline, success, or alert, always with an icon and a label (design.md 3.2). */
export function StateBanner({
  kind,
  label,
}: {
  kind: "on" | "off" | "success" | "alert";
  label: string;
}) {
  const t = useTheme();
  const bg =
    kind === "on" || kind === "success" ? t.success : kind === "alert" ? t.alert : t.surface;
  const fg =
    kind === "on" || kind === "success" ? t.onSuccess : kind === "alert" ? t.onAlert : t.text;
  const Icon =
    kind === "on"
      ? Radio
      : kind === "success"
        ? Check
        : kind === "alert"
          ? TriangleAlert
          : CircleOff;
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.banner,
        { backgroundColor: bg },
        kind === "off" && { borderWidth: 2, borderColor: t.border },
      ]}
    >
      <Icon size={26} color={fg} strokeWidth={2.5} />
      <Text style={[styles.bannerText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Golden Yellow with black text, for new orders (design.md 5.5). */
export function NewOrderBanner({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: t.notice }]}>
      <Bell size={26} color={t.onNotice} strokeWidth={2.5} />
      <Text style={[styles.bannerText, { color: t.onNotice }]}>{label}</Text>
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [V, string][];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.seg, { borderColor: t.border }]}
    >
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segBtn, on && { backgroundColor: t.primary }]}
          >
            <Text style={[styles.segText, { color: on ? t.onPrimary : t.text }]}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.switchRow}>
      <T v="key" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        style={[
          styles.switch,
          { borderColor: t.border, backgroundColor: value ? t.primary : t.bg },
        ]}
      >
        <Text style={[styles.segText, { color: value ? t.onPrimary : t.text }]}>
          {value ? "On" : "Off"}
        </Text>
      </Pressable>
    </View>
  );
}

export function Field({ label, secureTextEntry, ...input }: { label: string } & TextInputProps) {
  const t = useTheme();
  // A password field gets an eye button that shows or hides what was typed.
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginTop: 16 }}>
      <T v="small" style={{ fontFamily: fontFamily.bodyBold, marginBottom: 6 }}>
        {label}
      </T>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={t.muted}
          {...input}
          secureTextEntry={!!secureTextEntry && hidden}
          style={[
            styles.input,
            { color: t.text, borderColor: t.border, backgroundColor: t.bg },
            !!secureTextEntry && { paddingRight: 60 },
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={4}
            style={styles.eye}
          >
            {hidden ? <Eye size={24} color={t.muted} /> : <EyeOff size={24} color={t.muted} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The CKE pot icon. The rider app shows the logo on the sign-in screen only (design.md 3.2). */
export function BrandIcon({ size = 92 }: { size?: number }) {
  const t = useTheme();
  const l = t.mode === "dark" ? logos.iconCharcoal : logos.iconCream;
  return (
    <View accessibilityRole="image" accessibilityLabel="Casual Kitchen Express">
      <SvgXml xml={l.xml} width={size} height={size / l.ratio} />
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
  },
  btnText: { fontFamily: fontFamily.bodyBold, fontSize: 22 },
  card: { borderRadius: 14, borderWidth: 2, padding: 16, marginTop: 12 },
  kv: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  bannerText: { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 20, lineHeight: 26 },
  seg: { flexDirection: "row", borderWidth: 2, borderRadius: 14, overflow: "hidden" },
  segBtn: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segText: { fontFamily: fontFamily.bodyBold, fontSize: 18 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, marginTop: 6 },
  switch: {
    minWidth: 88,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 60,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 20,
  },
  eye: {
    position: "absolute",
    right: 2,
    top: 2,
    bottom: 2,
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
});
