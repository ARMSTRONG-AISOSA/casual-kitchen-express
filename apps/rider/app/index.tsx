import { fontFamily, space } from "@cke/brand-tokens";
import { StyleSheet, Text, View } from "react-native";

// Placeholder first screen. The real first screen is sign-in (design.md 5.3).
export default function Index() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>CKE Rider</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: space(2),
  },
  title: { fontFamily: fontFamily.heading, fontSize: 28, color: "#000000" },
});
