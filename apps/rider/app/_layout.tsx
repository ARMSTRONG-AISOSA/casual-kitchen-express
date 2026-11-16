import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/state/session";
import { StoreProvider } from "../src/state/store";
import { RiderLive } from "../src/state/live";
import { useTheme } from "../src/state/theme";
import { ToastProvider } from "../src/ui/toast";
import { PushTaps } from "../src/push";

function Shell() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      {/* No screen animation: the rider app keeps motion to clear state changes (design.md 3.5). */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: "none",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded) return null;
  return (
    <StoreProvider>
      <SessionProvider>
        <ToastProvider>
          <RiderLive />
          <PushTaps />
          <Shell />
        </ToastProvider>
      </SessionProvider>
    </StoreProvider>
  );
}
