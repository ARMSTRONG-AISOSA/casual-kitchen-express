import { color, fontFamily, space } from "@cke/brand-tokens";
import { StyleSheet, Text, View } from "react-native";

// Placeholder first screen. The real first screen is sign-in, then the order board (design.md 6.4).
export default function Index() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>CKE Kitchen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.white,
    padding: space(2),
  },
  title: { fontFamily: fontFamily.heading, fontSize: 28, color: color.charcoal },
});
