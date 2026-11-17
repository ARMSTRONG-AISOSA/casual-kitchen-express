import { checkForUpdate } from "@cke/api-client";
import Constants from "expo-constants";
import { useEffect } from "react";
import { Alert, Linking } from "react-native";

/**
 * Tells the person when a newer version is on the release page (website FAQ, "How do I get
 * updates?"). Checked once, a few seconds after the app opens, in release builds only. The new
 * version installs over this one, keeping the person signed in.
 */
export function UpdateNotice() {
  useEffect(() => {
    if (__DEV__) return;
    const version = Constants.expoConfig?.version;
    if (!version) return;
    const timer = setTimeout(() => {
      void checkForUpdate(version).then((u) => {
        if (!u) return;
        Alert.alert(
          "A new version is ready",
          `Version ${u.version} is on our release page. Download it and install it over this one; you stay signed in.`,
          [
            { text: "Later", style: "cancel" },
            { text: "Download", onPress: () => void Linking.openURL(u.url) },
          ],
        );
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
