import { fontFamily, logos } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { api } from "../src/api";
import { authClient, refreshCookie, signInError } from "../src/auth";
import { ROLE_LABEL, type Role } from "../src/data/seed";
import { enterAs, rememberTyped } from "../src/state/session";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Field, T } from "../src/ui/kit";
import { homeFor } from "../src/ui/shell";

// The demo staff in the API's local database (apps/api/scripts/seed-people.ts). Shown only in
// development builds, to fill in a username. Managers get usernames only on the laptop, until
// Google sign-in is set up.
const DEMO_PASSWORD = "cke-demo-2026";
const LIVE_DEMO: { username: string; name: string; role: Role }[] = [
  { username: "owner.m", name: "The owner", role: "manager" },
  { username: "ivie.m", name: "Ivie Osagie", role: "manager" },
  { username: "blessing.k", name: "Blessing Okafor", role: "kitchen" },
  { username: "samuel.k", name: "Samuel Eze", role: "kitchen" },
  { username: "osas.d", name: "Osas Edo", role: "dispatch" },
  { username: "ngozi.a", name: "Ngozi Bello", role: "accounts" },
];

// Sign in (design.md 6.4). Managers continue with Google. Every other staff role uses the
// username and password a manager set up. There is no forgot-password screen. With the API
// connected, this signs in through Better Auth (architecture.md 12); without it, demo sign-in.
export default function SignIn() {
  const { s, set } = useStore();
  const t = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const live = !!api && !!authClient;
  // When the keyboard opens, the page shrinks above it and scrolls just far enough to show the
  // error line and the Sign in button, so nobody has to close the keyboard to sign in.
  const scroll = useRef<ScrollViewInstance>(null);
  const spot = useRef({ card: 0, button: 0, view: 0 });
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      setTimeout(() => {
        const { card, button, view } = spot.current;
        scroll.current?.scrollTo({ y: Math.max(0, card + button + 16 - view), animated: true });
      }, 120),
    );
    return () => sub.remove();
  }, []);
  const staff = live
    ? LIVE_DEMO.map((p) => ({ id: p.username, ...p }))
    : s.people.filter((p) => p.username && p.role !== "rider" && p.active);

  const enter = (id: string, role: Role) => {
    set({ userId: id });
    router.replace(homeFor(role));
  };
  const signInLive = async () => {
    if (busy) return;
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true);
    setError("");
    try {
      const res = await authClient!.signIn.username({
        username: username.trim().toLowerCase(),
        password,
      });
      if (res.error) return setError(signInError(res.error));
      await refreshCookie();
      const me = await api!.me();
      // Riders have their own app (design.md 5).
      if (me.role === "rider" || me.role === "customer") {
        await authClient!.signOut();
        await refreshCookie();
        return setError("Riders sign in on the CKE Rider app.");
      }
      if (me.mustChangePassword) rememberTyped(password);
      enterAs(me, set);
    } catch {
      setError(signInError(null));
    } finally {
      setBusy(false);
    }
  };
  // Managers: Google's page opens in the browser and comes back here (architecture.md 12.2).
  const signInGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await authClient!.signIn.social({ provider: "google", callbackURL: "/sign-in" });
      if (res.error)
        return setError(
          res.error.status === 404 || /provider/i.test(res.error.message ?? "")
            ? "Google sign-in isn’t set up on the server yet."
            : signInError(res.error),
        );
      // Closed, cancelled, or refused (a deactivated account, or an email no manager added).
      if (!(await refreshCookie()))
        return setError(
          "Google sign-in didn’t finish. If you’re a manager, check that the owner added this Google email in People.",
        );
      const me = await api!.me();
      if (me.role !== "manager") {
        await authClient!.signOut();
        await refreshCookie();
        return setError(
          me.role === "customer"
            ? "That Google account isn’t a CKE manager. Ask the owner to add you in People."
            : "Sign in with your username and password above.",
        );
      }
      enterAs(me, set);
    } catch {
      setError(signInError(null));
    } finally {
      setBusy(false);
    }
  };
  const signIn = () => {
    if (live) return void signInLive();
    const p = staff.find((x) => x.username === username.trim().toLowerCase());
    if (!p || !password)
      return setError("That username and password don’t match. Ask your manager if you’re stuck.");
    enter(p.id, p.role as Role);
  };
  const logo = t.mode === "dark" ? logos.logoHorizontalCharcoal : logos.logoHorizontalCream;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => (spot.current.view = e.nativeEvent.layout.height)}
      >
        <View
          style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}
          onLayout={(e) => (spot.current.card = e.nativeEvent.layout.y)}
        >
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
          <View
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              spot.current.button = y + height;
            }}
          >
            {error ? (
              <T v="small" color={t.danger} style={{ marginTop: 8 }}>
                {error}
              </T>
            ) : null}
            <Button
              label={busy ? "Signing in…" : "Sign in"}
              disabled={busy}
              onPress={signIn}
              style={{ marginTop: 16 }}
            />
          </View>
          <T v="small" muted style={{ marginTop: 8 }}>
            Forgot your password? Ask your manager.
          </T>
          <View style={[styles.or, { borderTopColor: t.line }]}>
            <T v="label">Managers</T>
            <Button
              label="Continue with Google"
              variant="ghost"
              style={{ marginTop: 8 }}
              disabled={busy}
              onPress={() => (live ? void signInGoogle() : enter("M-001", "manager"))}
            />
          </View>
          {live && !__DEV__ ? null : (
            <View style={[styles.or, { borderTopColor: t.line }]}>
              <T v="label">Demo accounts</T>
              <T v="small" muted>
                {live
                  ? `Tap one to fill it in. The demo password is ${DEMO_PASSWORD}.`
                  : "Tap one to fill in the username. Any password works in the demo."}
              </T>
              <View style={styles.demo}>
                {staff.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setUsername(p.username ?? "");
                      setPassword(live ? DEMO_PASSWORD : "demo");
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
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
