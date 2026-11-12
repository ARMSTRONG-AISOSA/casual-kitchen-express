import { fontFamily, logos } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { ROLE_LABEL, type Role } from "../src/data/seed";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Field, T } from "../src/ui/kit";
import { homeFor } from "../src/ui/shell";

// Sign in (design.md 6.4). Managers continue with Google. Every other staff role uses the
// username and password a manager set up. There is no forgot-password screen.
export default function SignIn() {
  const { s, set } = useStore();
  const t = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const staff = s.people.filter((p) => p.username && p.role !== "rider" && p.active);

  const enter = (id: string, role: Role) => {
    set({ userId: id });
    router.replace(homeFor(role));
  };
  const signIn = () => {
    const p = staff.find((x) => x.username === username.trim().toLowerCase());
    if (!p || !password)
      return setError("That username and password don’t match. Ask your manager if you’re stuck.");
    enter(p.id, p.role as Role);
  };
  const logo = t.mode === "dark" ? logos.logoHorizontalCharcoal : logos.logoHorizontalCream;

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.bg }}
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        <SvgXml xml={logo.xml} height={40} width={40 * logo.ratio} />
        <T v="title" style={{ marginTop: 16 }}>
          Kitchen and business
        </T>
        <T muted style={{ marginTop: 4 }}>
          Sign in with the username and password from your manager.
        </T>
        <Field
          label="Username"
          value={username}
          onChangeText={(v) => (setUsername(v), setError(""))}
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={(v) => (setPassword(v), setError(""))}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={signIn}
        />
        {error ? (
          <T v="small" color={t.danger} style={{ marginTop: 8 }}>
            {error}
          </T>
        ) : null}
        <Button label="Sign in" onPress={signIn} style={{ marginTop: 16 }} />
        <T v="small" muted style={{ marginTop: 8 }}>
          Forgot your password? Ask your manager.
        </T>
        <View style={[styles.or, { borderTopColor: t.line }]}>
          <T v="label">Managers</T>
          <Button
            label="Continue with Google"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => enter("M-001", "manager")}
          />
        </View>
        <View style={[styles.or, { borderTopColor: t.line }]}>
          <T v="label">Demo accounts</T>
          <T v="small" muted>
            Tap one to fill in the username. Any password works in the demo.
          </T>
          <View style={styles.demo}>
            {staff.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setUsername(p.username ?? "");
                  setPassword("demo");
                  setError("");
                }}
                accessibilityRole="button"
                style={[
                  styles.demoBtn,
                  {
                    borderColor: t.line,
                    backgroundColor: username === p.username ? t.chip : t.surface,
                  },
                ]}
              >
                <Text style={[styles.demoName, { color: t.text }]}>{p.name}</Text>
                <Text style={[styles.demoRole, { color: t.muted }]}>
                  {ROLE_LABEL[p.role as Role]}, {p.username}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingVertical: 48,
  },
  card: { width: "100%", maxWidth: 520, borderRadius: 20, borderWidth: 1, padding: 24 },
  or: { marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  demo: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  demoBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
    flexBasis: 200,
  },
  demoName: { fontFamily: fontFamily.bodyBold, fontSize: 15 },
  demoRole: { fontFamily: fontFamily.body, fontSize: 13 },
});
