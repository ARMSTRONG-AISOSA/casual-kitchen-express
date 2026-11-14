import { Redirect } from "expo-router";
import { useSessionReady } from "../src/state/session";
import { myRole, useStore } from "../src/state/store";
import { homeFor } from "../src/ui/shell";

export default function Index() {
  const { s } = useStore();
  // Wait while a saved session is checked, so a signed-in person doesn't see the sign-in screen.
  if (!useSessionReady()) return null;
  if (!s.userId) return <Redirect href="/sign-in" />;
  return <Redirect href={homeFor(myRole(s))} />;
}
