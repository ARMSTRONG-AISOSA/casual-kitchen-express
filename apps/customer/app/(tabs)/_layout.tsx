import { fontFamily } from "@cke/brand-tokens";
import { Tabs } from "expo-router";
import { Ellipsis, ReceiptText, User, UtensilsCrossed } from "lucide-react-native";
import { useTheme } from "../../src/state/theme";

// Four tabs: Menu, Orders, Profile, and More (design.md 4.6). The cart is the order bar, not a tab.
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, minHeight: 64 },
        tabBarLabelStyle: { fontFamily: fontFamily.bodySemiBold, fontSize: 12 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <UtensilsCrossed color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <ReceiptText color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User color={color} size={24} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: ({ color }) => <Ellipsis color={color} size={24} /> }}
      />
    </Tabs>
  );
}
