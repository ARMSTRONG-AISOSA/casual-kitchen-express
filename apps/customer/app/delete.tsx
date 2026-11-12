import { DELETE_ACCOUNT_PHRASE } from "@cke/validation";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useStore } from "../src/state/store";
import { useTheme } from "../src/state/theme";
import { Button, Checkbox, Field, Notice, Screen, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";

// Delete account: high friction on purpose. A tick and typing DELETE ACCOUNT exactly (CUS-17).
export default function DeleteScreen() {
  const { s, reset } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [agree, setAgree] = useState(false);
  const [text, setText] = useState("");
  const busy =
    !!s.order && !s.order.cancelled && s.order.stage < (s.order.mode === "delivery" ? 8 : 5);
  const ok = agree && text === DELETE_ACCOUNT_PHRASE && !busy;
  return (
    <Screen
      header={<TopBar title="Delete account" />}
      footer={
        <>
          <Button
            label="Delete my account"
            variant="danger"
            disabled={!ok}
            onPress={() => {
              reset();
              toast("Account deleted");
              router.replace("/");
            }}
          />
          <Button
            label="Keep my account"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => router.back()}
          />
        </>
      }
    >
      <View
        style={{
          borderWidth: 2,
          borderColor: t.danger,
          borderRadius: 16,
          padding: 16,
          marginTop: 6,
        }}
      >
        <T v="h2" color={t.danger}>
          Danger zone
        </T>
        <T style={{ marginTop: 4 }}>Deleting your account is permanent.</T>
      </View>
      <T style={{ marginTop: 14 }}>
        This removes your name, email, addresses, photo, and saved demo card. Past orders stay in
        our records without your details. It can’t be undone.
      </T>
      <Notice kind="ok">
        <T>Want a break instead?</T>
        <Pressable
          onPress={() => router.replace("/deactivate")}
          accessibilityRole="link"
          hitSlop={8}
          style={{ marginTop: 4 }}
        >
          <T bold style={{ textDecorationLine: "underline" }}>
            Deactivate your account
          </T>
        </Pressable>
      </Notice>
      {busy ? <Notice>You have an order in progress. Wait until it’s delivered.</Notice> : null}
      <Checkbox
        label="I understand my account will be deleted for good."
        checked={agree}
        onToggle={() => setAgree(!agree)}
      />
      <Field
        label="Type DELETE ACCOUNT to confirm"
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        hint={text && text !== DELETE_ACCOUNT_PHRASE ? "Type it exactly, in capitals." : undefined}
      />
    </Screen>
  );
}
