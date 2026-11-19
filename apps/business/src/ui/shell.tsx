import { fontFamily, logos } from "@cke/brand-tokens";
import { router, usePathname } from "expo-router";
import { signOut as endSession } from "../state/session";
import {
  Bell,
  Bike,
  ChartColumn,
  HandCoins,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Moon,
  Play,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sun,
  ToggleLeft,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { ROLE_LABEL, signInOf, type Role } from "../data/seed";
import { clock, log, me, myRole, useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Sheet, T } from "./kit";
import { Avatar } from "./avatar";
import { useToast } from "./toast";
import { goTo } from "./nav";
import { TOUR, TourOverlay, TourProvider, type Rect } from "./tour";

// The side rail and top bar (design.md 6.3). Each role sees only its own items
// (architecture.md 3.0). The backend checks every role too; hiding a menu is not enough.

export type NavId =
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

const NAV: Record<NavId, { label: string; icon: LucideIcon }> = {
  board: { label: "Board", icon: LayoutGrid },
  "walk-in": { label: "Walk-in", icon: ShoppingBag },
  "sold-out": { label: "Sold out", icon: ToggleLeft },
  alerts: { label: "Alerts", icon: Bell },
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  orders: { label: "Orders", icon: ReceiptText },
  riders: { label: "Riders", icon: Bike },
  people: { label: "People", icon: Users },
  menu: { label: "Menu", icon: UtensilsCrossed },
  "rider-pay": { label: "Rider pay", icon: HandCoins },
  reports: { label: "Reports", icon: ChartColumn },
  finance: { label: "Finance", icon: Wallet },
  settings: { label: "Settings", icon: Settings },
  demo: { label: "Demo", icon: Play },
};

const KITCHEN: NavId[] = ["board", "walk-in", "sold-out", "alerts"];
const MANAGER: NavId[] = [
  "dashboard",
  "orders",
  "riders",
  "people",
  "menu",
  "rider-pay",
  "reports",
  "finance",
  "settings",
  "demo",
];

export const RAIL: Record<Role, { main: NavId[]; manager?: NavId[] }> = {
  kitchen: { main: KITCHEN },
  dispatch: { main: ["alerts", "orders", "riders", "settings"] },
  accounts: { main: ["reports", "rider-pay", "finance"] },
  manager: { main: KITCHEN, manager: MANAGER },
};

/** Screens reachable from each menu item (task screens open from their parent). */
const SCREEN_OWNER: Record<string, NavId> = {
  board: "board",
  ticket: "board",
  "walk-in": "walk-in",
  "walk-in-pay": "walk-in",
  "walk-in-sent": "walk-in",
  "sold-out": "sold-out",
  alerts: "alerts",
  "cash-up": "board",
  dashboard: "dashboard",
  orders: "orders",
  order: "orders",
  assign: "orders",
  riders: "riders",
  people: "people",
  person: "people",
  menu: "menu",
  item: "menu",
  "rider-pay": "rider-pay",
  reports: "reports",
  finance: "finance",
  settings: "settings",
  demo: "demo",
};

export const allowedFor = (role: Role) => [...RAIL[role].main, ...(RAIL[role].manager ?? [])];

/** Whether a role can open a screen. Kitchen staff can also open Cash-up at close. */
export function canOpen(role: Role, screen: string) {
  if (screen === "cash-up") return role === "kitchen" || role === "manager";
  const owner = SCREEN_OWNER[screen];
  return owner ? allowedFor(role).includes(owner) : false;
}

export const homeFor = (role: Role) => `/${RAIL[role].main[0]}` as const;

const TITLES: Record<string, string> = {
  board: "Order board",
  ticket: "Ticket",
  "walk-in": "New walk-in order",
  "walk-in-pay": "Take payment",
  "walk-in-sent": "Order sent",
  "sold-out": "Sold out",
  alerts: "Alerts",
  "cash-up": "Cash-up",
  dashboard: "Dashboard",
  orders: "Orders",
  order: "Order",
  assign: "Assign to a rider",
  riders: "Riders",
  people: "People",
  person: "Person",
  menu: "Menu",
  item: "Item",
  "rider-pay": "Rider pay",
  reports: "Reports",
  finance: "Finance",
  settings: "Settings",
  demo: "Demo controls",
};

const KITCHEN_SCREENS = [
  "board",
  "ticket",
  "walk-in",
  "walk-in-pay",
  "walk-in-sent",
  "sold-out",
  "alerts",
  "cash-up",
];

const nowClock = () => clock(Date.now());

export function Shell({ children }: { children: ReactNode }) {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  // Room for the title, the pause switch, the person, and Switch person on one row.
  const roomy = width >= 1100;
  // A phone: the content beside the rail is under 300 dp, so Switch person goes on the second row.
  const phone = width < 600;
  // Only the smallest phones (425 dp wide or less) have no room for the clock beside the switch.
  const tiny = width <= 425;
  const path = usePathname();
  const screen = path.split("/")[1] || "board";
  const role = myRole(s);
  const user = me(s);
  const [leaving, setLeaving] = useState(false);
  // Tapping your photo in the top bar opens your profile, with Sign out.
  const [profile, setProfile] = useState(false);
  const active = SCREEN_OWNER[screen];

  // The managers' tour guide (MGR-39): each step opens a screen and rings its menu item.
  const [tourStep, setTourStep] = useState<number | null>(null);
  // The measured menu item, kept with the step and screen size it was measured for.
  const [measured, setMeasured] = useState<{ key: string; rect: Rect } | null>(null);
  const tourKey = `${tourStep}-${width}x${height}`;
  const target = measured?.key === tourKey ? measured.rect : null;
  const [area, setArea] = useState({ w: width, h: height });
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const railRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const itemRefs = useRef<Partial<Record<NavId, ComponentRef<typeof View> | null>>>({});
  const itemY = useRef<Partial<Record<NavId, number>>>({});
  const endTour = () => {
    setTourStep(null);
    goTo("/demo");
  };
  useEffect(() => {
    if (tourStep === null) return;
    const s = TOUR[tourStep]!;
    goTo(`/${s.id}`);
    AccessibilityInfo.announceForAccessibility(
      `Step ${tourStep + 1} of ${TOUR.length}. ${s.title}. ${s.body}`,
    );
  }, [tourStep]);
  // Scroll the rail to the item, then measure where it sits (again after the tablet turns).
  useEffect(() => {
    if (tourStep === null) return;
    const id = TOUR[tourStep]!.id;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        railRef.current?.scrollTo({
          y: Math.max(0, (itemY.current[id] ?? 0) - 120),
          animated: false,
        });
        timers.push(
          setTimeout(() => {
            rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
              setArea({ w: rw, h: rh });
              itemRefs.current[id]?.measureInWindow((x, y, w, h) =>
                setMeasured({ key: tourKey, rect: { x: x - rx, y: y - ry, w, h } }),
              );
            });
          }, 120),
        );
      }, 80),
    );
    return () => timers.forEach(clearTimeout);
  }, [tourStep, tourKey]);
  // The tablet's back button: during the tour it goes to the previous step. On a main screen
  // with nothing under it, it goes to the person's first screen (the Board, Alerts, or Reports);
  // there it leaves the app as usual. Task screens go back to their list.
  const home = homeFor(myRole(s));
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tourStep !== null) {
        setTourStep((n) => (n ? n - 1 : n));
        return true;
      }
      if (!router.canGoBack() && `/${screen}` !== home) {
        goTo(home);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tourStep, screen, home]);
  const isManagerScreen = MANAGER.includes(active ?? "board") || screen === "assign";
  const showPause = screen === "board" && (role === "manager" || role === "kitchen");
  const pauseControl = (
    <View style={styles.pause}>
      <T v="small" bold>
        {s.settings.paused ? "Orders paused" : "Taking orders"}
      </T>
      <Switch
        value={!s.settings.paused}
        onValueChange={(on) => {
          set((st) => ({
            settings: { ...st.settings, paused: !on },
            ...log(st, "setting", on ? "Resumed new orders" : "Paused new orders"),
          }));
          toast(on ? "Taking new orders" : "New orders paused");
        }}
        accessibilityLabel="Take new online orders"
        trackColor={{ true: t.success, false: t.danger }}
        thumbColor="#FFFFFF"
      />
      {/* The smallest phones show the time in the status bar, and the row has no room for it. */}
      {tiny ? null : (
        <T v="small" muted>
          {nowClock()}
        </T>
      )}
    </View>
  );
  const isKitchenScreen = KITCHEN_SCREENS.includes(screen);

  const signOut = () => {
    void endSession(set);
  };
  const askSignOut = () => {
    // The person on the counter cashes up before leaving (ACC-04).
    if ((role === "kitchen" || role === "manager") && s.today.counted === null) setLeaving(true);
    else signOut();
  };

  const item = (id: NavId) => {
    const n = NAV[id];
    const on = active === id;
    const count = id === "alerts" ? s.alerts.length : 0;
    const Icon = n.icon;
    return (
      <Pressable
        key={id}
        ref={(v) => {
          itemRefs.current[id] = v;
        }}
        onLayout={(e) => {
          itemY.current[id] = e.nativeEvent.layout.y;
        }}
        onPress={() => goTo(`/${id}`)}
        accessibilityRole="button"
        accessibilityLabel={count ? `${n.label}, ${count}` : n.label}
        accessibilityState={{ selected: on }}
        style={[
          styles.item,
          wide ? styles.itemWide : styles.itemNarrow,
          on && { backgroundColor: t.chip },
        ]}
      >
        <View>
          <Icon size={24} color={on ? t.primary : t.text} />
          {count ? (
            <View style={[styles.count, { backgroundColor: t.danger }]}>
              <Text style={[styles.countText, { color: t.onDanger }]}>{count}</Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.itemText,
            { color: on ? t.primary : t.text },
            !wide && { fontSize: 12, textAlign: "center" },
          ]}
        >
          {n.label}
        </Text>
      </Pressable>
    );
  };

  const rail = RAIL[role];
  const icon = t.mode === "dark" ? logos.iconCharcoal : logos.iconCream;

  return (
    <TourProvider value={{ start: () => setTourStep(0) }}>
      <View ref={rootRef} style={{ flex: 1, flexDirection: "row", backgroundColor: t.bg }}>
        <View
          style={[
            styles.rail,
            {
              width: wide ? 210 : 96,
              backgroundColor: t.rail,
              borderRightColor: t.line,
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 10,
            },
          ]}
        >
          <View
            style={{
              alignItems: wide ? "flex-start" : "center",
              paddingHorizontal: wide ? 16 : 0,
              marginBottom: 10,
            }}
          >
            <SvgXml xml={icon.xml} width={wide ? 52 : 44} height={(wide ? 52 : 44) / icon.ratio} />
          </View>
          {/* Scrolls when the menu is taller than the screen (the manager has 14 items). */}
          <ScrollView
            ref={railRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 2, paddingBottom: 8 }}
          >
            {rail.main.map(item)}
            {rail.manager ? (
              <>
                <Text
                  style={[
                    styles.group,
                    { color: t.muted },
                    !wide && { textAlign: "center", paddingHorizontal: 0 },
                  ]}
                >
                  Manager
                </Text>
                {rail.manager.map(item)}
              </>
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() => set({ themePref: t.mode === "dark" ? "light" : "dark" })}
            accessibilityRole="button"
            accessibilityLabel={t.mode === "dark" ? "Light theme" : "Dark theme"}
            style={[styles.item, wide ? styles.itemWide : styles.itemNarrow]}
          >
            {t.mode === "dark" ? (
              <Sun size={22} color={t.text} />
            ) : (
              <Moon size={22} color={t.text} />
            )}
            <Text style={[styles.itemText, { color: t.text }, !wide && { fontSize: 12 }]}>
              {t.mode === "dark" ? "Light" : "Dark"}
            </Text>
          </Pressable>
          <Pressable
            onPress={askSignOut}
            accessibilityRole="button"
            style={[styles.item, wide ? styles.itemWide : styles.itemNarrow]}
          >
            <LogOut size={22} color={t.text} />
            <Text style={[styles.itemText, { color: t.text }, !wide && { fontSize: 12 }]}>
              Sign out
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingTop: insets.top + 8,
              borderBottomWidth: 1,
              borderBottomColor: t.line,
              backgroundColor: t.bg,
            }}
          >
            <View style={styles.top}>
              <T
                v="title"
                style={{ flexShrink: phone ? 1 : 0 }}
                numberOfLines={1}
                adjustsFontSizeToFit={phone}
                minimumFontScale={0.75}
              >
                {TITLES[screen] ?? "CKE"}
              </T>
              {isManagerScreen && (!s.live || STILL_DEMO.has(screen)) ? (
                <View style={[styles.demo, { backgroundColor: t.newBg }]}>
                  <Text style={[styles.demoText, { color: t.onNew }]}>Demo</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              {showPause && roomy ? pauseControl : null}
              <Pressable
                onPress={() => setProfile(true)}
                accessibilityRole="button"
                accessibilityLabel={`Your profile, ${user?.name ?? ""}`}
                style={styles.who}
              >
                <Avatar code={user?.id} name={user?.name} size={44} />
                {/* On the board the pause switch needs the room, so only the initials show there. */}
                {wide && (screen !== "board" || width >= 1400) ? (
                  <View style={{ flexShrink: 1 }}>
                    <T v="label" numberOfLines={1}>
                      {user?.name}
                    </T>
                    <T v="small" muted>
                      {ROLE_LABEL[role]}, {user?.id}
                    </T>
                  </View>
                ) : null}
              </Pressable>
              {isKitchenScreen && !phone ? (
                <Button label="Switch person" variant="ghost" small onPress={signOut} />
              ) : null}
            </View>
            {/* Narrow screens (a tablet in portrait) put the pause switch on its own row; phones
                put Switch person there too. */}
            {(showPause && !roomy) || (isKitchenScreen && phone) ? (
              <View style={[styles.topRow2, { alignItems: "center", flexWrap: "wrap", gap: 12 }]}>
                {showPause && !roomy ? pauseControl : null}
                {isKitchenScreen && phone ? (
                  <View style={{ marginLeft: "auto" }}>
                    <Button label="Switch person" variant="ghost" small onPress={signOut} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          {/* Keeps content clear of Android's navigation buttons on phones that show them. */}
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
        </View>

        <Sheet visible={profile} onClose={() => setProfile(false)} title="Your profile">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar code={user?.id} name={user?.name} size={72} />
            <View style={{ flexShrink: 1 }}>
              <T v="h2">{user?.name}</T>
              <T muted>
                {ROLE_LABEL[role]}, {user?.id}
              </T>
            </View>
          </View>
          {[
            ["Job", user?.job],
            user ? [signInOf(user).label, signInOf(user).value] : ["", ""],
            ["Phone", user?.phone],
          ].map(([label, value]) =>
            value ? (
              <View key={label} style={{ marginTop: 12 }}>
                <T v="small" muted>
                  {label}
                </T>
                <T>{value}</T>
              </View>
            ) : null,
          )}
          <Button
            label="Sign out"
            style={{ marginTop: 20 }}
            onPress={() => {
              setProfile(false);
              askSignOut();
            }}
          />
        </Sheet>

        <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Cash up before you go?">
          <T muted>
            Count the cash in the drawer and enter it, so today’s cash-up is ready for sign-off.
          </T>
          <Button
            label="Cash up now"
            style={{ marginTop: 16 }}
            onPress={() => {
              setLeaving(false);
              router.push("/cash-up");
            }}
          />
          <Button
            label="Sign out anyway"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => {
              setLeaving(false);
              signOut();
            }}
          />
        </Sheet>

        {tourStep !== null ? (
          <TourOverlay
            step={tourStep}
            target={target}
            area={{ ...area, top: insets.top, bottom: insets.bottom }}
            railWidth={wide ? 210 : 96}
            onBack={() => setTourStep((n) => (n ? n - 1 : n))}
            onNext={() => (tourStep < TOUR.length - 1 ? setTourStep(tourStep + 1) : endTour())}
            onSkip={endTour}
          />
        ) : null}
      </View>
    </TourProvider>
  );
}

/** Shown when a role opens a screen it can't use. */
export function NotForRole() {
  const { s } = useStore();
  return (
    <View style={{ padding: 24 }}>
      <T v="h2">Not available</T>
      <T muted style={{ marginTop: 6 }}>
        {ROLE_LABEL[myRole(s)]} accounts can’t open this screen.
      </T>
      <Button
        label="Go back"
        variant="ghost"
        style={{ marginTop: 16, alignSelf: "flex-start" }}
        onPress={() => goTo(homeFor(myRole(s)))}
      />
    </View>
  );
}

/**
 * Manager screens still on demo data when the app is live: reports, Finance, and rider pay come
 * with build step 9, and Demo controls stay demo. Everything else shows live data, so its "Demo"
 * badge goes (build step 6).
 */
const STILL_DEMO = new Set(["reports", "finance", "rider-pay", "cash-up", "demo"]);

const styles = StyleSheet.create({
  rail: { borderRightWidth: 1 },
  item: { borderRadius: 12, marginHorizontal: 8 },
  itemWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  itemNarrow: {
    alignItems: "center",
    gap: 4,
    minHeight: 62,
    justifyContent: "center",
    paddingVertical: 6,
  },
  itemText: { fontFamily: fontFamily.bodySemiBold, fontSize: 16 },
  group: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  count: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: { fontFamily: fontFamily.bodyBold, fontSize: 12 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  topRow2: { flexDirection: "row", paddingHorizontal: 18, paddingBottom: 10 },
  demo: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  demoText: { fontFamily: fontFamily.bodyBold, fontSize: 13 },
  pause: { flexDirection: "row", alignItems: "center", gap: 6 },
  who: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fontFamily.bodyBold, fontSize: 15 },
});
