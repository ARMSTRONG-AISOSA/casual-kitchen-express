import { fontFamily } from "@cke/brand-tokens";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Camera, LogOut, MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WHATSAPP_URL } from "../../src/data/order";
import { useStore } from "../../src/state/store";
import { api } from "../../src/api";
import { pickProfilePhoto, sizeNote, type Compressed } from "../../src/media/compress";
import { photoUrl, saveProfile, signInWithGoogle, signOutCustomer } from "../../src/state/session";
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
  // The photo just taken or chosen, already cropped and compressed, waiting for Save photo.
  const [picked, setPicked] = useState<Compressed | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (from: "camera" | "library") => {
    setSheet(null);
    try {
      const c = await pickProfilePhoto(from);
      if (!c) return;
      setPicked(c);
      setSheet("crop");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn’t open the photo. Try again.");
    }
  };

  const savePhoto = async () => {
    if (!picked || busy) return;
    setBusy(true);
    try {
      if (api) {
        // Expo's fetch sends files as Blobs, so read the compressed file into one first.
        const blob = await (await fetch(picked.uri)).blob();
        const { photoId } = await api.uploadMyPhoto(blob);
        set({ photo: true, photoUri: photoUrl(photoId) });
      } else set({ photo: true, photoUri: picked.uri });
      setSheet(null);
      setPicked(null);
      toast("Photo saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn’t save the photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (api) await api.removeMyPhoto();
      set({ photo: false, photoUri: "" });
      setSheet(null);
      toast("Photo removed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn’t remove the photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

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
            onPress={async () => {
              if (s.deactivated) return setSheet("reactivate");
              if (api) {
                const error = await signInWithGoogle(set, "/profile");
                toast(error ?? "Signed in with Google");
                return;
              }
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
          {s.photoUri ? (
            <ProfilePhoto uri={s.photoUri} size={72} />
          ) : (
            <Text
              style={{
                fontFamily: fontFamily.heading,
                fontSize: s.photo ? 13 : 26,
                color: s.photo ? "#fff" : t.onPrimary,
              }}
            >
              {s.photo ? "Photo" : initials}
            </Text>
          )}
          <View style={[styles.camera, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Camera size={14} color={t.text} />
          </View>
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
        <T v="h2">Profile photo</T>
        <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
          {s.photo
            ? "Change or remove your photo. Only you and the restaurant staff who handle orders see it."
            : "Add a photo so your profile feels like yours. It’s cropped square and shrunk on your phone before upload, so it uses very little data."}
        </T>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            label={s.photo ? "Change photo" : "Add photo"}
            variant="ghost"
            small
            icon={<Camera size={18} color={t.text} />}
            onPress={() => setSheet("photo")}
          />
          {s.photo ? (
            <Button label="Remove" variant="ghost" small onPress={() => setSheet("remove")} />
          ) : null}
        </View>
      </Card>

      <Card>
        <Field
          label="Name"
          value={s.name}
          onChangeText={(name) => set({ name })}
          onEndEditing={async () => {
            if (s.name.trim().length < 2) return toast("Enter your name");
            const error = await saveProfile({ name: s.name });
            if (error) toast(error);
          }}
        />
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
              onPress={async () => {
                const gender = s.gender === g ? "" : g;
                set({ gender });
                const error = await saveProfile({ gender });
                if (error) toast(error);
              }}
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

      <Card>
        <T v="h2">Sign out</T>
        <T v="small" muted style={{ marginTop: 4, marginBottom: 12 }}>
          {s.email ? `Signed in as ${s.email}. ` : ""}Your orders and addresses stay saved for next
          time.
        </T>
        <Button
          label="Sign out"
          variant="ghost"
          small
          icon={<LogOut size={18} color={t.text} />}
          onPress={async () => {
            await signOutCustomer(set);
            toast("Signed out");
          }}
        />
      </Card>

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
          onPress={() => void choose("camera")}
          style={{ marginTop: 8 }}
        />
        <Button
          label="Choose from gallery"
          variant="ghost"
          onPress={() => void choose("library")}
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
      <Sheet
        visible={sheet === "crop"}
        onClose={() => (setSheet(null), setPicked(null))}
        title="Your new photo"
      >
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          {picked ? <ProfilePhoto uri={picked.uri} size={150} /> : null}
        </View>
        {picked ? (
          <Notice kind="ok">{`Compressed on your phone: ${sizeNote(picked)}.`}</Notice>
        ) : null}
        <Button
          label={busy ? "Saving…" : "Save photo"}
          style={{ marginTop: 14 }}
          disabled={busy}
          onPress={() => void savePhoto()}
        />
        <Button
          label="Choose another"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => (setPicked(null), setSheet("photo"))}
        />
      </Sheet>
      <Sheet visible={sheet === "remove"} onClose={() => setSheet(null)} title="Remove your photo?">
        <T muted>Your initials show instead.</T>
        <Button
          label={busy ? "Removing…" : "Remove photo"}
          style={{ marginTop: 16 }}
          disabled={busy}
          onPress={() => void removePhoto()}
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

/** A round profile photo. A saved one needs the session to load; a just-picked file is local. */
function ProfilePhoto({ uri, size }: { uri: string; size: number }) {
  return (
    <Image
      source={{ uri, headers: uri.startsWith("http") ? api?.imageHeaders() : undefined }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      accessibilityLabel="Your profile photo"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
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
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
