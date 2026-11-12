import { fontFamily } from "@cke/brand-tokens";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WHATSAPP_URL } from "../../src/data/order";
import { useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import { Button, Card, Chip, Field, Notice, Screen, Segmented, T } from "../../src/ui/kit";
import { Sheet } from "../../src/ui/sheet";
import { useToast } from "../../src/ui/toast";

// Profile (CUS-15, CUS-16, CUS-17, CUS-25, CUS-27). Fields save as you change them, with no save button.
export default function ProfileScreen() {
  const { s, set } = useStore();
  const t = useTheme();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | "photo" | "crop" | "remove" | "reactivate">(null);

  const header = (
    <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
      <T v="h1">Profile</T>
    </View>
  );

  if (!s.signedIn) {
    return (
      <Screen tabs header={header}>
        <Card>
          <T v="h2">You’re browsing as a guest</T>
          <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
            Sign in when you check out, or now.
          </T>
          <Button
            label="Continue with Google"
            variant="ghost"
            onPress={() => {
              if (s.deactivated) return setSheet("reactivate");
              set((x) => ({
                signedIn: true,
                name: x.name || "Ada Okoro",
                email: x.email || "ada.okoro@gmail.com",
                customerId: x.customerId || "C-01093",
              }));
              toast("Signed in with Google");
            }}
          />
        </Card>
        <ThemeCard />
        <HelpCard />
        <Sheet visible={sheet === "reactivate"} onClose={() => setSheet(null)} title="Welcome back">
          <T muted>
            Your account is deactivated. Reactivate it to see your orders and addresses again.
          </T>
          <Button
            label="Reactivate my account"
            style={{ marginTop: 16 }}
            onPress={() => {
              set({ deactivated: false, signedIn: true });
              setSheet(null);
              toast("Welcome back. Your account is active.");
            }}
          />
          <Button
            label="Not now"
            variant="ghost"
            style={{ marginTop: 8 }}
            onPress={() => setSheet(null)}
          />
        </Sheet>
      </Screen>
    );
  }

  const initials = s.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2);

  return (
    <Screen tabs header={header}>
      <View style={styles.who}>
        <Pressable
          onPress={() => setSheet("photo")}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          style={[styles.avatar, { backgroundColor: s.photo ? "#9C6B47" : t.primary }]}
        >
          <Text
            style={{
              fontFamily: fontFamily.heading,
              fontSize: s.photo ? 13 : 26,
              color: s.photo ? "#fff" : t.onPrimary,
            }}
          >
            {s.photo ? "Photo" : initials}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <T v="h2">{s.name}</T>
          <T v="small" muted>
            {s.email}
          </T>
          <T v="small" muted>
            Customer ID {s.customerId}
          </T>
        </View>
      </View>

      <Card>
        <Field label="Name" value={s.name} onChangeText={(name) => set({ name })} />
        <T v="label" style={{ marginTop: 14 }}>
          Gender{" "}
          <T v="small" muted>
            (optional)
          </T>
        </T>
        <View style={styles.chips}>
          {["Female", "Male", "Prefer not to say"].map((g) => (
            <Chip
              key={g}
              label={g}
              selected={s.gender === g}
              onPress={() => set({ gender: s.gender === g ? "" : g })}
            />
          ))}
        </View>
      </Card>

      <Card>
        <T v="h2">Addresses</T>
        {s.hasAddress ? (
          <View style={styles.addr}>
            <View style={{ flex: 1 }}>
              <T v="label">
                {s.address.label}, {s.address.area}
              </T>
              <T v="small" muted>
                {s.address.landmark}
              </T>
              <T v="small" muted>
                Default
              </T>
            </View>
            <Button label="Edit" variant="ghost" small onPress={() => router.push("/address")} />
          </View>
        ) : (
          <T muted style={{ marginTop: 4 }}>
            No saved addresses yet.
          </T>
        )}
        <Button
          label="Add address"
          variant="ghost"
          small
          onPress={() => router.push("/address")}
          style={{ marginTop: 10 }}
        />
      </Card>

      <ThemeCard />
      <HelpCard />

      <Card>
        <T v="h2">Account</T>
        <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
          Take a break without losing anything. Come back any time by signing in again.
        </T>
        <Button
          label="Deactivate my account"
          variant="ghost"
          small
          onPress={() => router.push("/deactivate")}
        />
      </Card>

      <View style={[styles.danger, { borderColor: t.danger }]} accessibilityLabel="Danger zone">
        <T v="h2" color={t.danger}>
          Danger zone
        </T>
        <T v="small" style={{ marginTop: 4, marginBottom: 12 }}>
          Deleting your account removes your details for good. This can’t be undone.
        </T>
        <Button
          label="Delete my account"
          variant="danger"
          small
          onPress={() => router.push("/delete")}
        />
      </View>

      <Sheet visible={sheet === "photo"} onClose={() => setSheet(null)} title="Profile photo">
        <Button
          label="Take photo"
          variant="ghost"
          onPress={() => setSheet("crop")}
          style={{ marginTop: 8 }}
        />
        <Button
          label="Choose from gallery"
          variant="ghost"
          onPress={() => setSheet("crop")}
          style={{ marginTop: 8 }}
        />
        {s.photo ? (
          <Button
            label="Remove photo"
            variant="ghost"
            onPress={() => setSheet("remove")}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </Sheet>
      <Sheet visible={sheet === "crop"} onClose={() => setSheet(null)} title="Crop your photo">
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <View style={[styles.cropPreview]}>
            <Text style={{ color: "#fff", fontFamily: fontFamily.bodySemiBold }}>Your photo</Text>
          </View>
        </View>
        <Notice kind="ok">Compressed on your phone before upload: 3.8 MB to 74 KB.</Notice>
        <Button
          label="Save photo"
          style={{ marginTop: 14 }}
          onPress={() => {
            set({ photo: true });
            setSheet(null);
            toast("Photo saved");
          }}
        />
      </Sheet>
      <Sheet visible={sheet === "remove"} onClose={() => setSheet(null)} title="Remove your photo?">
        <T muted>Your initials show instead.</T>
        <Button
          label="Remove photo"
          style={{ marginTop: 16 }}
          onPress={() => {
            set({ photo: false });
            setSheet(null);
            toast("Photo removed");
          }}
        />
        <Button
          label="Keep it"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => setSheet(null)}
        />
      </Sheet>
    </Screen>
  );
}

function ThemeCard() {
  const { s, set } = useStore();
  return (
    <Card>
      <T v="h2" style={{ marginBottom: 6 }}>
        Theme
      </T>
      <Segmented
        options={[
          ["light", "Light"],
          ["dark", "Dark"],
          ["system", "Follow phone"],
        ]}
        value={s.themePref}
        onChange={(themePref) => set({ themePref })}
      />
    </Card>
  );
}

function HelpCard() {
  const t = useTheme();
  return (
    <Card>
      <T v="h2">Help</T>
      <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
        Questions about an order? Message the restaurant on WhatsApp.
      </T>
      <Button
        label="Contact the restaurant"
        variant="ghost"
        small
        icon={<MessageCircle size={18} color={t.text} />}
        onPress={() => Linking.openURL(WHATSAPP_URL)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  addr: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  danger: { marginTop: 20, borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 12 },
  cropPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#9C6B47",
    alignItems: "center",
    justifyContent: "center",
  },
});
