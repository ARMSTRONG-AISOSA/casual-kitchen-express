import { router } from "expo-router";
import { useState } from "react";
import { api } from "../src/api";
import { enterAs, signOut, takeTyped } from "../src/state/session";
import { useStore } from "../src/state/store";
import { Button, Field, Screen, StateBanner, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";

// Shown at the first sign-in and after a manager resets the password (RID-20). The temporary
// password typed at sign-in is reused, so it isn't asked again.
export default function NewPassword() {
  const { set } = useStore();
  const toast = useToast();
  const [temporary] = useState(takeTyped);
  const [current, setCurrent] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // The app was reopened before the password was changed: ask for the temporary one.
  const needCurrent = !!api && !temporary;
  const short = a.length > 0 && a.length < 8;
  const mismatch = b.length > 0 && a !== b;
  const ok = a.length >= 8 && a === b && (!needCurrent || !!current) && !busy;

  const save = async () => {
    if (!ok) return;
    if (!api) {
      set({ mustSetPassword: false });
      toast("Password saved");
      router.replace("/(tabs)");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.changePassword(temporary || current, a);
      toast("Password saved");
      await enterAs(await api.me(), set);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<TopBar title="New password" />}
      footer={
        <>
          <Button label={busy ? "Saving…" : "Save password"} onPress={save} disabled={!ok} />
          {api ? (
            <Button
              label="Sign out"
              variant="alt"
              onPress={() => void signOut(set)}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </>
      }
    >
      <T>Your manager gave you a temporary password. Choose your own to continue.</T>
      {needCurrent ? (
        <Field
          label="Temporary password"
          value={current}
          onChangeText={(v) => (setCurrent(v), setError(""))}
          secureTextEntry
        />
      ) : null}
      <Field
        label="New password"
        value={a}
        onChangeText={(v) => (setA(v), setError(""))}
        secureTextEntry
        autoComplete="new-password"
      />
      <Field
        label="Type it again"
        value={b}
        onChangeText={(v) => (setB(v), setError(""))}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={save}
      />
      {short ? <StateBanner kind="alert" label="Use at least 8 characters." /> : null}
      {mismatch && !short ? (
        <StateBanner kind="alert" label="The two passwords don’t match." />
      ) : null}
      {error ? <StateBanner kind="alert" label={error} /> : null}
    </Screen>
  );
}
