import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { api } from "../../../src/api";
import { useTheme } from "../../../src/state/theme";
import { Card, Screen, T, TopBar } from "../../../src/ui/kit";

// Photo credits (Casual-Kitchen-Express.md, Food Imagery): the photo of every dish and soup on the
// menu now, built from what the Business app has linked, so a changed or removed photo updates here.
// Photos from the internet show who took them and the licence; CKE's own photos show the business
// and, if given, the photographer. A line with a link opens it.
export default function PhotoCredits() {
  const t = useTheme();
  const { data, isError, isPending } = useQuery({
    queryKey: ["photo-credits"],
    enabled: !!api,
    queryFn: () => api!.photoCredits(),
    staleTime: 0, // credits follow photo changes, so check each time the page opens
  });
  const credits = data?.credits ?? [];
  return (
    <Screen tabs header={<TopBar title="Photo credits" />}>
      <T>
        Who took the photos on our menu. Some are ours, and some come from people who share their
        work freely. Thank you. Tap a line with a link to see where it came from.
      </T>
      {!api ? (
        <T muted style={{ marginTop: 14 }}>
          Photos appear when the app is connected.
        </T>
      ) : isPending ? (
        <T muted style={{ marginTop: 14 }}>
          Loading the credits…
        </T>
      ) : isError ? (
        <T muted style={{ marginTop: 14 }}>
          Couldn’t load the credits. Check your connection and try again.
        </T>
      ) : (
        <Card style={{ paddingVertical: 2 }}>
          {credits.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="link"
              disabled={!c.sourceUrl}
              onPress={() => c.sourceUrl && Linking.openURL(c.sourceUrl)}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
              ]}
            >
              <T v="label">{c.title}</T>
              <View>
                <T v="small" muted>
                  {c.sourceKind === "business"
                    ? `Photo by Casual Kitchen Express${c.author ? ` (${c.author})` : ""}`
                    : `Photo by ${c.author ?? "unknown"}${c.licence ? `, ${c.licence}` : ""}`}
                </T>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { paddingVertical: 10, gap: 2 } });
