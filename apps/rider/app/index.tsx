import { Redirect } from "expo-router";
import { useSessionReady } from "../src/state/session";
import { useStore } from "../src/state/store";

// The rider stays signed in on the device (design.md 5.4).
export default function Index() {
  const { s } = useStore();
  // Wait while a saved session is checked, so the sign-in screen doesn't flash.
  if (!useSessionReady()) return null;
  if (!s.signedIn) return <Redirect href="/sign-in" />;
  if (s.mustSetPassword) return <Redirect href="/new-password" />;
  return <Redirect href="/(tabs)" />;
}
