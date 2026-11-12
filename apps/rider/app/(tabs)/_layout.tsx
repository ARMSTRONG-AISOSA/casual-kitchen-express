import { fontFamily } from "@cke/brand-tokens";
import { Tabs } from "expo-router";
import { House, ListOrdered, User, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/state/theme";

// Four tabs: Home, Queue, Earnings, and Me (design.md 5.3). Task screens open without the tab bar.
export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.muted,
        tabBarActiveBackgroundColor: t.surface,
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
          borderTopWidth: 2,
          height: 76 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.bodyBold, fontSize: 15 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => <House color={color} size={28} /> }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: ({ color }) => <ListOrdered color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color }) => <Wallet color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: "Me", tabBarIcon: ({ color }) => <User color={color} size={28} /> }}
      />
    </Tabs>
  );
}
