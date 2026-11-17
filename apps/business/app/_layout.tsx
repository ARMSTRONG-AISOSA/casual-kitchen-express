import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useKeepAwake } from "expo-keep-awake";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CatalogProvider } from "../src/state/catalog";
import { SessionProvider } from "../src/state/session";
import { StoreProvider } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { ToastProvider } from "../src/ui/toast";
import { UpdateNotice } from "../src/update";

function Root() {
  // The counter tablet's screen stays on while the app is open (design.md 6.2).
  useKeepAwake();
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: "fade",
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
      <CatalogProvider>
        <SessionProvider>
          <ToastProvider>
            <UpdateNotice />
            <Root />
          </ToastProvider>
        </SessionProvider>
      </CatalogProvider>
    </StoreProvider>
  );
}
