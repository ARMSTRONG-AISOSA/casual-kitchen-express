import { fontFamily, naira } from "@cke/brand-tokens";
import { Bell, Check, CookingPot, TriangleAlert } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OrderStatus } from "../data/seed";
import { useTheme } from "../state/theme";

// Building blocks for the Business and Kitchen app (design.md 6.2): readable at a distance, big
// touch targets, a calm look, and status that always has a colour, an icon, and a label.

type TV = "title" | "h2" | "h3" | "big" | "stat" | "body" | "small" | "label";

const type: Record<TV, TextStyle> = {
  title: { fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: fontFamily.headingBold, fontSize: 17, lineHeight: 22 },
  big: { fontFamily: fontFamily.bodyBold, fontSize: 30, lineHeight: 36 },
  stat: { fontFamily: fontFamily.bodyBold, fontSize: 26, lineHeight: 32 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: 15, lineHeight: 21 },
};

export function T({
  v = "body",
  muted,
  center,
  bold,
  color,
  style,
  children,
  numberOfLines,
}: {
  v?: TV;
  muted?: boolean;
  center?: boolean;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        type[v],
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

/** Scrolling page content inside the shell. */
export function Page({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[padded && { padding: 18 }, { paddingBottom: 40 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  small,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "dark";
  small?: boolean;
  icon?: (c: string) => ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg =
    variant === "primary"
      ? t.primary
      : variant === "danger"
        ? t.danger
        : variant === "dark"
          ? t.text
          : t.surface;
  const fg =
    variant === "primary"
      ? t.onPrimary
      : variant === "danger"
        ? t.onDanger
        : variant === "dark"
          ? t.bg
          : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        {
          minHeight: small ? 44 : 54,
          backgroundColor: bg,
          borderColor: variant === "ghost" ? t.line : bg,
        },
        small && { paddingHorizontal: 14 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? icon(fg) : null}
      <Text style={[styles.btnText, { color: fg, fontSize: small ? 15 : 17 }]}>{label}</Text>
    </Pressable>
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

export function KV({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.kv, { borderBottomColor: t.line }]}>
      <T muted={!strong} bold={strong} style={{ flexShrink: 1 }}>
        {k}
      </T>
      {typeof v === "string" || typeof v === "number" ? (
        <T bold style={{ textAlign: "right", flexShrink: 1 }}>
          {v}
        </T>
      ) : (
        v
      )}
    </View>
  );
}

export function Money({ n, strong }: { n: number; strong?: boolean }) {
  return (
    <T bold={strong} style={{ textAlign: "right" }}>
      {n < 0 ? `−${naira(-n)}` : naira(n)}
    </T>
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
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.text : t.surface, borderColor: selected ? t.text : t.line },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? t.bg : t.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 8 }, style]}>{children}</View>
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
    <View style={[styles.seg, { backgroundColor: t.chip }]}>
      {options.map(([v, l]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          accessibilityRole="radio"
          accessibilityState={{ checked: v === value }}
          style={[styles.segBtn, v === value && { backgroundColor: t.surface }]}
        >
          <Text style={[styles.chipText, { color: v === value ? t.text : t.muted }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <T v="label" style={{ marginBottom: 6 }}>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        {...input}
        style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.surface }]}
      />
      {hint ? (
        <T v="small" muted style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.switchRow, { borderBottomColor: t.line }]}>
      <View style={{ flex: 1 }}>
        <T v="label">{label}</T>
        {hint ? (
          <T v="small" muted>
            {hint}
          </T>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: t.success, false: t.line }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const btn = (label: string, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => onChange(Math.round(next * 10) / 10)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === "−" ? "Decrease" : "Increase"}
      style={[
        styles.stepBtn,
        { borderColor: t.line, backgroundColor: t.surface },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text style={[styles.btnText, { color: t.text, fontSize: 22 }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {btn("−", value - step, value - step < min)}
      <T bold style={{ minWidth: 60, textAlign: "center" }}>
        {format(value)}
      </T>
      {btn("+", value + step, value + step > max)}
    </View>
  );
}

const STATUS: Record<
  OrderStatus,
  { label: string; kind: "new" | "progress" | "ready" | "problem" }
> = {
  new: { label: "New", kind: "new" },
  preparing: { label: "Preparing", kind: "progress" },
  ready: { label: "Ready", kind: "ready" },
  out: { label: "Out for delivery", kind: "progress" },
  done: { label: "Completed", kind: "ready" },
  cancelled: { label: "Cancelled", kind: "problem" },
};

/** Status pill: colour, icon, and label together (design.md 3.3). */
export function StatusPill({ status, label }: { status: OrderStatus | "problem"; label?: string }) {
  const t = useTheme();
  const s =
    status === "problem" ? { label: "Needs attention", kind: "problem" as const } : STATUS[status];
  const bg =
    s.kind === "new"
      ? t.newBg
      : s.kind === "progress"
        ? t.progressBg
        : s.kind === "ready"
          ? t.readyBg
          : t.danger;
  const fg =
    s.kind === "new"
      ? t.onNew
      : s.kind === "progress"
        ? t.onProgress
        : s.kind === "ready"
          ? t.onReady
          : t.onDanger;
  const Icon =
    s.kind === "new"
      ? Bell
      : s.kind === "progress"
        ? CookingPot
        : s.kind === "ready"
          ? Check
          : TriangleAlert;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon size={14} color={fg} strokeWidth={2.5} />
      <Text style={[styles.pillText, { color: fg }]}>{label ?? s.label}</Text>
    </View>
  );
}

export function Badge({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.chip }]}>
      <Text style={[styles.pillText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

/** A centred dialog for confirmations and short forms. */
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { backgroundColor: t.surface }]} onPress={() => {}}>
          {/* Long forms (such as a photo's credit) scroll inside the dialog. */}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
            <T v="h2" style={{ marginBottom: 10 }}>
              {title}
            </T>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <T v="h2">{title}</T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 180, marginTop: 0 }}>
      <T muted>{label}</T>
      <T v="stat" style={{ marginTop: 4 }}>
        {value}
      </T>
      {hint ? (
        <T v="small" muted>
          {hint}
        </T>
      ) : null}
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>
  );
}

export function DemoNote({ text = "Demo. No money is moved." }: { text?: string }) {
  return (
    <T v="small" muted style={{ marginTop: 10 }}>
      {text}
    </T>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  btnText: { fontFamily: fontFamily.bodyBold },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12 },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
  },
  chipText: { fontFamily: fontFamily.bodySemiBold, fontSize: 15 },
  seg: { flexDirection: "row", borderRadius: 12, padding: 4 },
  segBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fontFamily.body,
    fontSize: 17,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fontFamily.bodyBold, fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: { width: "100%", maxWidth: 520, maxHeight: "100%", borderRadius: 18, overflow: "hidden" },
});

/**
 * A large tick box with a plain sentence, for actions that move money (refunds): the button stays
 * off until it's ticked.
 */
export function ConfirmTick({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, minHeight: 48 }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? t.primary : t.muted,
          backgroundColor: checked ? t.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={20} color={t.onPrimary} strokeWidth={3} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}
