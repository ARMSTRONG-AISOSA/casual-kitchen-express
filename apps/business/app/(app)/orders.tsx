import { fontFamily, naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { orderTotal } from "../../src/data/seed";
import { clock, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Chip, Chips, Page, Row, StatusPill, T } from "../../src/ui/kit";

type Channel = "all" | "online" | "walkin";

// Orders (MGR-13): today's orders here; earlier days and ranges load from the API, 150 at a time.
export default function Orders() {
  const { s } = useStore();
  const t = useTheme();
  const [channel, setChannel] = useState<Channel>("all");
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();
  const list = (day === "today" ? s.orders : [])
    .filter((o) => channel === "all" || o.channel === channel)
    .filter((o) => !query || o.no.includes(query) || (o.customerId ?? "").includes(query))
    .sort((a, b) => b.placedAt - a.placedAt);
  const total = list.filter((o) => o.status !== "cancelled").reduce((a, o) => a + orderTotal(o), 0);

  return (
    <Page>
      <Row style={{ flexWrap: "wrap" }}>
        <Chips>
          <Chip label="Today" selected={day === "today"} onPress={() => setDay("today")} />
          <Chip
            label="Yesterday"
            selected={day === "yesterday"}
            onPress={() => setDay("yesterday")}
          />
        </Chips>
        <View style={{ width: 12 }} />
        <Chips>
          <Chip label="All" selected={channel === "all"} onPress={() => setChannel("all")} />
          <Chip
            label="Online"
            selected={channel === "online"}
            onPress={() => setChannel("online")}
          />
          <Chip
            label="Walk-in"
            selected={channel === "walkin"}
            onPress={() => setChannel("walkin")}
          />
        </Chips>
      </Row>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          borderWidth: 1.5,
          borderColor: t.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: t.surface,
        }}
      >
        <Search size={20} color={t.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by order number or customer ID"
          placeholderTextColor={t.muted}
          accessibilityLabel="Search by order number or customer ID"
          autoCapitalize="characters"
          style={{
            flex: 1,
            minHeight: 50,
            fontFamily: fontFamily.body,
            fontSize: 16,
            color: t.text,
          }}
        />
      </View>
      <T muted style={{ marginTop: 10 }}>
        {list.length} order{list.length === 1 ? "" : "s"}, {naira(total)}
      </T>
      {day === "yesterday" ? (
        <T muted style={{ marginTop: 10 }}>
          Earlier days load from the server once the backend is connected.
        </T>
      ) : null}
      <View style={{ marginTop: 8 }}>
        {list.map((o) => (
          <Pressable
            key={o.no}
            onPress={() => router.push(`/order/${o.no}`)}
            accessibilityRole="button"
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: t.line,
                flexWrap: "wrap",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <T v="h3" style={{ width: 80 }}>
              {o.no}
            </T>
            <T muted style={{ width: 80 }}>
              {clock(o.placedAt)}
            </T>
            <T style={{ flex: 1, minWidth: 160 }} numberOfLines={1}>
              {o.channel === "walkin" ? `Walk-in${o.name ? `, ${o.name}` : ""}` : o.customerId}
            </T>
            <T bold style={{ width: 90, textAlign: "right" }}>
              {naira(orderTotal(o))}
            </T>
            <View style={{ width: 170, alignItems: "flex-end" }}>
              <StatusPill status={o.status} />
            </View>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}
