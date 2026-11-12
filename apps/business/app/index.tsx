import { Redirect } from "expo-router";
import { myRole, useStore } from "../src/state/store";
import { homeFor } from "../src/ui/shell";

export default function Index() {
  const { s } = useStore();
  if (!s.userId) return <Redirect href="/sign-in" />;
  return <Redirect href={homeFor(myRole(s))} />;
}
