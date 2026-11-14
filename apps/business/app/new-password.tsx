import { newPassword } from "@cke/validation";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { api } from "../src/api";
import { enterAs, signOut, takeTyped } from "../src/state/session";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Field, T } from "../src/ui/kit";

// Set a new password (design.md 6.4, architecture.md 12.1): at the first sign-in and after a
// manager resets it. The temporary password typed at sign-in is reused, so it isn't asked again.
export default function NewPassword() {
  const { set } = useStore();
  const t = useTheme();
  const [temporary] = useState(takeTyped);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy || !api) return;
    const checked = newPassword.safeParse(next);
    if (!checked.success)
      return setError(checked.error.issues[0]?.message ?? "Try another password");
    if (next !== again) return setError("The two new passwords don’t match.");
    setBusy(true);
    setError("");
    try {
      await api.changePassword(temporary || current, next);
      enterAs(await api.me(), set);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: t.bg }}
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
        <T v="title">Set a new password</T>
        <T muted style={{ marginTop: 4 }}>
          Your manager gave you a temporary password. Choose your own to keep using CKE.
        </T>
        {temporary ? null : (
          <Field
            label="Temporary password"
            value={current}
            onChangeText={(v) => (setCurrent(v), setError(""))}
            secureTextEntry
          />
        )}
        <Field
          label="New password"
          value={next}
          onChangeText={(v) => (setNext(v), setError(""))}
          secureTextEntry
          hint="At least 8 characters."
        />
        <Field
          label="New password again"
          value={again}
          onChangeText={(v) => (setAgain(v), setError(""))}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={save}
        />
        {error ? (
          <T v="small" color={t.danger} style={{ marginTop: 8 }}>
            {error}
          </T>
        ) : null}
        <Button
          label={busy ? "Saving…" : "Save and continue"}
          disabled={busy}
          onPress={save}
          style={{ marginTop: 16 }}
        />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => void signOut(set)}
          style={{ marginTop: 8 }}
        />
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
});
