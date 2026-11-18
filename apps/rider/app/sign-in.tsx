import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { api } from "../src/api";
import { authClient, refreshCookie, signInError } from "../src/auth";
import { RIDER } from "../src/data/orders";
import { NOT_A_RIDER, enterAs, rememberTyped } from "../src/state/session";
import { useStore } from "../src/state/store";
import { BrandIcon, Button, Field, Screen, StateBanner, T } from "../src/ui/kit";

// The seeded riders' password on the laptop's database (apps/api/scripts/seed-people.ts). Filled
// in only in development builds.
const DEMO_PASSWORD = "cke-demo-2026";
const live = !!authClient && !!api;

// Sign in with the username and password from the manager (RID-01). No sign-up, and no
// forgot-password screen (RID-20).
export default function SignIn() {
  const { s, set } = useStore();
  const [user, setUser] = useState(live ? (__DEV__ ? "musa.a" : "") : RIDER.username);
  const [pass, setPass] = useState(live ? (__DEV__ ? DEMO_PASSWORD : "") : "temporary");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (!authClient || !api) {
      set({ signedIn: true });
      router.replace(s.mustSetPassword ? "/new-password" : "/(tabs)");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authClient.signIn.username({
        username: user.trim().toLowerCase(),
        password: pass,
      });
      if (res.error) return setError(signInError(res.error));
      await refreshCookie();
      rememberTyped(pass);
      if (!(await enterAs(await api.me(), set))) setError(NOT_A_RIDER);
    } catch {
      setError(signInError(null));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          {/* Here, above the button, the message stays in sight when the keyboard is open. */}
          {error ? <StateBanner kind="alert" label={error} /> : null}
          <Button
            label={busy ? "Signing in…" : "Sign in"}
            onPress={signIn}
            disabled={!user.trim() || !pass || busy}
          />
        </>
      }
    >
      <View style={{ alignItems: "center", marginTop: 36, marginBottom: 12 }}>
        <BrandIcon size={92} />
      </View>
      <T v="title" center>
        CKE Rider
      </T>
      <Field
        label="Username"
        value={user}
        onChangeText={(v) => (setUser(v), setError(""))}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
      />
      <Field
        label="Password"
        value={pass}
        onChangeText={(v) => (setPass(v), setError(""))}
        secureTextEntry
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={signIn}
      />
      <T muted style={{ marginTop: 16 }}>
        Forgot your password? Ask your manager.
      </T>
      {__DEV__ || !live ? (
        <T v="small" muted style={{ marginTop: 6 }}>
          {live
            ? `Demo: Musa is filled in. The other riders are chidi.r, femi.r, and uyi.r, with the password ${DEMO_PASSWORD}.`
            : "Demo: the details are filled in."}
        </T>
      ) : null}
    </Screen>
  );
}
