import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ROLE_LABEL, type Person, type Role } from "../../../src/data/seed";
import { log, useStore } from "../../../src/state/store";
import { useTheme } from "../../../src/state/theme";
import { Button, Card, Chip, Chips, Field, Page, Sheet, T } from "../../../src/ui/kit";
import { api } from "../../../src/api";
import { refreshPeople, refreshStaff } from "../../../src/state/catalog";
import { Avatar } from "../../../src/ui/avatar";
import { PhotoEditor } from "../../../src/ui/photo-editor";
import { useToast } from "../../../src/ui/toast";
import { PEOPLE } from "../../../src/data/seed";
import { View } from "react-native";

const PREFIX: Record<Person["role"], string> = {
  rider: "R",
  kitchen: "K",
  dispatch: "D",
  accounts: "A",
  manager: "M",
};
const ROLES: Person["role"][] = ["rider", "kitchen", "dispatch", "accounts", "manager"];

// Add or edit a person (design.md 7.2). Managers are added by Google email; everyone else gets a
// username and a temporary password.
export default function PersonEditor() {
  const { id, role: roleParam } = useLocalSearchParams<{ id: string; role?: Person["role"] }>();
  const { s, set } = useStore();
  const toast = useToast();
  const t = useTheme();
  const existing = s.people.find((p) => p.id === id);
  const [role, setRole] = useState<Person["role"]>(existing?.role ?? roleParam ?? "rider");
  const [name, setName] = useState(existing?.name ?? "");
  const [job, setJob] = useState(existing?.job ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [login, setLogin] = useState(existing?.username ?? existing?.email ?? "");
  const [gender, setGender] = useState<Person["gender"]>(existing?.gender);
  const [homeAddress, setHomeAddress] = useState(existing?.homeAddress ?? "");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // A new person's temporary password, shown once before going back (MGR-25).
  const [created, setCreated] = useState<{ code: string; pass: string | null } | null>(null);
  // Staff photos are stored with the staff record, which exists for the starting staff now and for
  // everyone once sign-in is built.
  const inSystem = !!existing && (!!api || PEOPLE.some((p) => p.id === existing.id));
  const isManager = role === "manager";

  // With the API connected, saves to the database (the username can't change once set).
  const saveLive = async () => {
    if (busy || !api) return;
    setBusy(true);
    setError("");
    const profile = {
      fullName: name.trim(),
      jobTitle: job.trim(),
      phone: phone.trim(),
      gender: gender ?? null,
      homeAddress: homeAddress.trim(),
    };
    try {
      if (existing) {
        await api.editPerson(existing.id, { ...profile, role });
        await refreshPeople();
        toast("Saved");
        router.back();
      } else {
        const res = await api.addPerson({
          ...profile,
          role,
          ...(isManager ? { email: login.trim() } : { username: login.trim().toLowerCase() }),
        });
        await refreshPeople();
        setCreated({ code: res.code, pass: res.temporaryPassword });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (api) return void saveLive();
    if (existing) {
      set((st) => ({
        people: st.people.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                name,
                job,
                phone,
                role,
                gender,
                homeAddress: homeAddress.trim() || undefined,
                ...(isManager ? { email: login } : { username: login }),
              }
            : p,
        ),
        ...log(st, "account", `Edited ${existing.id}`),
      }));
      toast("Saved");
    } else {
      const n = s.people.filter((p) => p.role === role).length + 1;
      const newId = `${PREFIX[role]}-${String(n).padStart(3, "0")}`;
      set((st) => ({
        people: [
          ...st.people,
          {
            id: newId,
            name,
            role,
            job,
            phone,
            gender,
            homeAddress: homeAddress.trim() || undefined,
            active: true,
            ...(isManager ? { email: login } : { username: login }),
          },
        ],
        ...log(
          st,
          "account",
          `Added ${newId} (${role === "rider" ? "Rider" : ROLE_LABEL[role as Role]})`,
        ),
      }));
      toast(
        isManager
          ? `${newId} added. They continue with Google.`
          : `${newId} added. Temporary password: cke-${Math.floor(1000 + Math.random() * 9000)}`,
      );
    }
    router.back();
  };

  return (
    <Page>
      <T v="label">Role</T>
      <Chips style={{ marginTop: 8 }}>
        {ROLES.map((r) => (
          <Chip
            key={r}
            label={r === "rider" ? "Rider" : ROLE_LABEL[r as Role]}
            selected={role === r}
            onPress={() => setRole(r)}
          />
        ))}
      </Chips>
      <Card>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Field
          label={isManager ? "Google email" : "Username"}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          editable={!(api && existing)}
          hint={
            isManager
              ? "They continue with Google, so there’s no password."
              : "A temporary password is shown when you save."
          }
        />
        <Field
          label="Job title"
          value={job}
          onChangeText={setJob}
          hint="A label only. The role controls what they can do."
        />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <T v="label" style={{ marginTop: 14 }}>
          Gender (optional)
        </T>
        <Chips style={{ marginTop: 8 }}>
          <Chip label="Female" selected={gender === "female"} onPress={() => setGender("female")} />
          <Chip label="Male" selected={gender === "male"} onPress={() => setGender("male")} />
          <Chip
            label="Prefer not to say"
            selected={gender === "prefer_not_to_say"}
            onPress={() => setGender("prefer_not_to_say")}
          />
        </Chips>
        <Field
          label="Home address (optional)"
          value={homeAddress}
          onChangeText={setHomeAddress}
          hint="Seen only by managers and the person themself."
        />
      </Card>
      <Card>
        <T v="label">Photo (optional)</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 }}>
          <Avatar code={existing?.id} name={name || "?"} size={72} />
          <Button
            label={existing && s.staffPhotos[existing.id] ? "Change photo" : "Add photo"}
            variant="ghost"
            onPress={() =>
              inSystem
                ? setPhotoOpen(true)
                : toast(
                    existing
                      ? "Photos for new staff can be added once sign-in is built."
                      : "Save the person first, then add their photo.",
                  )
            }
          />
        </View>
        <T v="small" muted style={{ marginTop: 6 }}>
          Cropped square and compressed before upload. Shown when they sign in.
        </T>
      </Card>
      <PhotoEditor
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        kind="staff"
        targetId={existing?.id}
        title={existing?.name ?? name}
        currentUri={existing ? s.staffPhotos[existing.id]?.uri : undefined}
        photoKey={existing?.id}
        onSaved={refreshStaff}
      />
      {error ? (
        <T v="small" color={t.danger} style={{ marginTop: 12 }}>
          {error}
        </T>
      ) : null}
      <Button
        label={busy ? "Saving…" : "Save"}
        style={{ marginTop: 16 }}
        disabled={busy || !name.trim() || !login.trim()}
        onPress={save}
      />
      <Sheet
        visible={!!created}
        onClose={() => (setCreated(null), router.back())}
        title={`${created?.code ?? ""} added`}
      >
        {created?.pass ? (
          <>
            <T muted>
              Give this temporary password to {name.trim()}. It’s shown once. They choose their own
              at the first sign-in.
            </T>
            <T v="title" style={{ marginTop: 12 }}>
              {created.pass}
            </T>
          </>
        ) : (
          <T muted>They continue with Google, so there’s no password.</T>
        )}
        <Button
          label="Done"
          style={{ marginTop: 16 }}
          onPress={() => (setCreated(null), router.back())}
        />
      </Sheet>
    </Page>
  );
}
