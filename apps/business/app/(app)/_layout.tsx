import { Redirect, Stack, usePathname } from "expo-router";
import { myRole, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { NotForRole, Shell, canOpen } from "../../src/ui/shell";

// Everything behind sign-in. A role that opens a screen outside its menu sees "Not available".
export default function AppLayout() {
  const { s } = useStore();
  const t = useTheme();
  const path = usePathname();
  if (!s.userId) return <Redirect href="/sign-in" />;
  const screen = path.split("/")[1] || "board";
  return (
    <Shell>
      {canOpen(myRole(s), screen) ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.bg },
            animation: "none",
          }}
        />
      ) : (
        <NotForRole />
      )}
    </Shell>
  );
}
