import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { PAGES } from "../../../src/data/pages";
import { Screen, T, TopBar } from "../../../src/ui/kit";

// One plain text page with a back button to More.
export default function TextPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const p = PAGES.find((x) => x.id === page);
  return (
    <Screen tabs header={<TopBar title={p?.title ?? "Not found"} />}>
      {(p?.blocks ?? []).map((b, i) => (
        <View key={i} style={{ marginTop: b.h ? 18 : 8 }}>
          {b.h ? <T v="h2">{b.h}</T> : null}
          {b.p ? <T style={{ marginTop: b.h ? 4 : 0 }}>{b.p}</T> : null}
          {b.list?.map((li) => (
            <T key={li} style={{ marginTop: 6 }}>
              {"•  "}
              {li}
            </T>
          ))}
        </View>
      ))}
    </Screen>
  );
}
