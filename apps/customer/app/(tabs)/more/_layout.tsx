import { Stack } from "expo-router";
import { useTheme } from "../../../src/state/theme";

// More keeps its own stack, so text pages open inside the tab and Back returns to the list.
export default function MoreLayout() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />;
}
