import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { RIDER } from "../src/data/orders";
import { useStore } from "../src/state/store";
import { BrandIcon, Button, Field, Screen, T } from "../src/ui/kit";

// Sign in with the username and password from the manager (RID-01). No sign-up, and no
// forgot-password screen (RID-20).
export default function SignIn() {
  const { s, set } = useStore();
  const [user, setUser] = useState(RIDER.username);
  const [pass, setPass] = useState("temporary");
  const signIn = () => {
    set({ signedIn: true });
    router.replace(s.mustSetPassword ? "/new-password" : "/(tabs)");
  };
  return (
    <Screen footer={<Button label="Sign in" onPress={signIn} disabled={!user.trim() || !pass} />}>
      <View style={{ alignItems: "center", marginTop: 36, marginBottom: 12 }}>
        <BrandIcon size={92} />
      </View>
      <T v="title" center>
        CKE Rider
      </T>
      <Field
        label="Username"
        value={user}
        onChangeText={setUser}
        autoCapitalize="none"
        autoComplete="username"
      />
      <Field
        label="Password"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        autoComplete="current-password"
      />
      <T muted style={{ marginTop: 16 }}>
        Forgot your password? Ask your manager.
      </T>
      <T v="small" muted style={{ marginTop: 6 }}>
        Demo: the details are filled in.
      </T>
    </Screen>
  );
}
