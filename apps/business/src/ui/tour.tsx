import { fontFamily } from "@cke/brand-tokens";
import { createContext, useContext, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../state/theme";
import { Button, T } from "./kit";

// The managers' tour guide (design.md 7.3, MGR-39), started from Demo controls. It walks the
// manager's side rail from top to bottom: each step opens that screen, rings its menu item, and
// explains what the screen gets done. It only moves between screens; it never changes data.

export type TourStepId =
  | "board"
  | "walk-in"
  | "sold-out"
  | "alerts"
  | "dashboard"
  | "orders"
  | "riders"
  | "people"
  | "menu"
  | "rider-pay"
  | "reports"
  | "finance"
  | "settings"
  | "demo";

/** One card per menu item, in the order of the manager's side rail. */
export const TOUR: { id: TourStepId; title: string; body: string }[] = [
  {
    id: "board",
    title: "Board",
    body: "The kitchen’s main screen. New orders arrive in the New column with a sound. Tap a ticket to start it, tick items as they’re cooked, then mark it Ready. The switch at the top pauses new online orders when the kitchen is too busy.",
  },
  {
    id: "walk-in",
    title: "Walk-in",
    body: "For customers at the counter. Tap the dishes they want, choose eat in or take away, then take cash or an online payment. The order goes straight onto the Board with a number to call out.",
  },
  {
    id: "sold-out",
    title: "Sold out",
    body: "Ran out of something? Switch it off here and customers stop seeing it straight away. Today’s soup is picked at the top with one tap.",
  },
  {
    id: "alerts",
    title: "Alerts",
    body: "Anything that needs a person: an order nobody has accepted, a late order, a rider asking for help, or a customer asking to cancel. The number on the menu shows how many are waiting.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    body: "Today at a glance: orders and sales, online against walk-in, cash against online payments, and what’s still in progress.",
  },
  {
    id: "orders",
    title: "Orders",
    body: "Every order, from today back to the very first. Search by order number or customer ID, then filter and sort. Open an order to see its full timeline, give a refund, or assign it to a rider.",
  },
  {
    id: "riders",
    title: "Riders",
    body: "Who’s online now, what each rider is carrying, and how full their bag is. Tap Call rider to phone them.",
  },
  {
    id: "people",
    title: "People",
    body: "Your team. Add staff with a username and password (managers with their Google email), edit profiles and photos, reset a forgotten password, or deactivate someone who has left.",
  },
  {
    id: "menu",
    title: "Menu",
    body: "Dishes, prices, photos, and options. Switch items on or off, and look after the soups in the rotation.",
  },
  {
    id: "rider-pay",
    title: "Rider pay",
    body: "What each rider has earned per delivery and what’s still owed. Mark a period as paid and see past payouts.",
  },
  {
    id: "reports",
    title: "Reports",
    body: "Charts for orders, sales, timings, riders, areas, the menu, customers, and refunds. Choose 7, 30, or 60 days or your own dates, and online, walk-in, or both.",
  },
  {
    id: "finance",
    title: "Finance",
    body: "The money side: the monthly statement, each day’s cash-up to sign off, the audit trail of every money action, and closing the month. Export as CSV or PDF.",
  },
  {
    id: "settings",
    title: "Settings",
    body: "How the restaurant runs: opening hours, the delivery fee, rider pay, delivery areas, the WhatsApp contact number, and the tablet’s automatic sign-out at 8:30 pm.",
  },
  {
    id: "demo",
    title: "Demo",
    body: "Practise without real customers. New online order adds one pretend order to the Board, Auto-play moves orders along by itself, and Reset puts everything back to the start. You can take this tour again from here.",
  },
];

const TourContext = createContext<{ start: () => void }>({ start: () => {} });
export const TourProvider = TourContext.Provider;
/** Starts the tour (the Demo screen's Tour guide section). */
export const useTour = () => useContext(TourContext);

export type Rect = { x: number; y: number; w: number; h: number };

const GAP = 16;
const PAD = 4; // room between the menu item and the ring

/**
 * The dimmed layer with a ring around the menu item, and the step card beside the side rail.
 * Covers the whole app, so nothing behind it can be tapped by accident.
 */
export function TourOverlay({
  step,
  target,
  area,
  railWidth,
  onBack,
  onNext,
  onSkip,
}: {
  step: number;
  target: Rect | null;
  area: { w: number; h: number; top: number; bottom: number };
  railWidth: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const t = useTheme();
  const [cardH, setCardH] = useState(0);
  const s = TOUR[step]!;
  const last = step === TOUR.length - 1;
  const hole = target
    ? { x: target.x - PAD, y: target.y - PAD, w: target.w + PAD * 2, h: target.h + PAD * 2 }
    : null;

  // The card sits beside the rail, centred on the menu item and kept on screen.
  const left = railWidth + GAP;
  const width = Math.min(460, area.w - left - GAP);
  const centre = hole ? hole.y + hole.h / 2 : area.h / 2;
  const top = Math.max(
    area.top + GAP,
    Math.min(centre - cardH / 2, area.h - area.bottom - cardH - GAP),
  );
  const pointer = Math.max(18, Math.min(centre - top - 9, cardH - 36));

  const dim = "rgba(0,0,0,0.5)";
  return (
    <View style={StyleSheet.absoluteFill}>
      {hole ? (
        <>
          <View
            style={[
              styles.dim,
              { backgroundColor: dim, left: 0, right: 0, top: 0, height: Math.max(0, hole.y) },
            ]}
          />
          <View
            style={[
              styles.dim,
              { backgroundColor: dim, left: 0, right: 0, top: hole.y + hole.h, bottom: 0 },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                backgroundColor: dim,
                left: 0,
                width: Math.max(0, hole.x),
                top: hole.y,
                height: hole.h,
              },
            ]}
          />
          <View
            style={[
              styles.dim,
              {
                backgroundColor: dim,
                left: hole.x + hole.w,
                right: 0,
                top: hole.y,
                height: hole.h,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              { borderColor: t.newBg, left: hole.x, top: hole.y, width: hole.w, height: hole.h },
            ]}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dim }]} />
      )}

      <View
        accessibilityViewIsModal
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          {
            backgroundColor: t.surface,
            borderColor: t.line,
            left,
            width,
            top,
            opacity: cardH ? 1 : 0,
          },
        ]}
      >
        {hole ? (
          <View
            style={[
              styles.pointer,
              { backgroundColor: t.surface, borderColor: t.line, top: pointer },
            ]}
          />
        ) : null}
        <Text style={[styles.step, { color: t.muted }]}>
          Tour guide · Step {step + 1} of {TOUR.length}
        </Text>
        <View style={[styles.track, { backgroundColor: t.chip }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: t.primary, width: `${((step + 1) / TOUR.length) * 100}%` },
            ]}
          />
        </View>
        <T v="h2" style={{ marginTop: 12 }}>
          {s.title}
        </T>
        <T style={{ marginTop: 6 }}>{s.body}</T>
        <View style={styles.actions}>
          {last ? null : (
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              hitSlop={10}
              style={{ paddingVertical: 10 }}
            >
              <Text style={[styles.skip, { color: t.muted }]}>Skip tour</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          {step > 0 ? <Button label="Back" variant="ghost" small onPress={onBack} /> : null}
          <Button label={last ? "Finish" : "Next"} small onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: "absolute" },
  ring: { position: "absolute", borderWidth: 3, borderRadius: 4 },
  card: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pointer: {
    position: "absolute",
    left: -9,
    width: 18,
    height: 18,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: "45deg" }],
  },
  step: { fontFamily: fontFamily.bodySemiBold, fontSize: 13 },
  track: { height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  skip: { fontFamily: fontFamily.bodySemiBold, fontSize: 15, textDecorationLine: "underline" },
});
