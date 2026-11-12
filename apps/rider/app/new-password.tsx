import { router } from "expo-router";
import { useState } from "react";
import { useStore } from "../src/state/store";
import { Button, Field, Screen, StateBanner, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";

// Shown at the first sign-in and after a manager resets the password (RID-20).
export default function NewPassword() {
  const { set } = useStore();
  const toast = useToast();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const short = a.length > 0 && a.length < 8;
  const mismatch = b.length > 0 && a !== b;
  const ok = a.length >= 8 && a === b;
  const save = () => {
    set({ mustSetPassword: false });
    toast("Password saved");
    router.replace("/(tabs)");
  };
  return (
    <Screen
      header={<TopBar title="New password" />}
      footer={<Button label="Save password" onPress={save} disabled={!ok} />}
    >
      <T>Your manager gave you a temporary password. Choose your own to continue.</T>
      <Field
        label="New password"
        value={a}
        onChangeText={setA}
        secureTextEntry
        autoComplete="new-password"
      />
      <Field
        label="Type it again"
        value={b}
        onChangeText={setB}
        secureTextEntry
        autoComplete="new-password"
      />
      {short ? <StateBanner kind="alert" label="Use at least 8 characters." /> : null}
      {mismatch && !short ? (
        <StateBanner kind="alert" label="The two passwords don’t match." />
      ) : null}
    </Screen>
  );
}
