import { color, fontFamily, space } from "@cke/brand-tokens";
import { StyleSheet, Text, View } from "react-native";

// Placeholder first screen. The real first screen is the menu (design.md 4.6).
export default function Index() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>CKE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.cream,
    padding: space(2),
  },
  title: { fontFamily: fontFamily.heading, fontSize: 28, color: color.charcoal },
});
