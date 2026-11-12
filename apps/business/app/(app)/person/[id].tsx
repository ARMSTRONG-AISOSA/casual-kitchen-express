import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ROLE_LABEL, type Person, type Role } from "../../../src/data/seed";
import { log, useStore } from "../../../src/state/store";
import { Button, Card, Chip, Chips, Field, Page, T } from "../../../src/ui/kit";
import { useToast } from "../../../src/ui/toast";

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
  const existing = s.people.find((p) => p.id === id);
  const [role, setRole] = useState<Person["role"]>(existing?.role ?? roleParam ?? "rider");
  const [name, setName] = useState(existing?.name ?? "");
  const [job, setJob] = useState(existing?.job ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [login, setLogin] = useState(existing?.username ?? existing?.email ?? "");
  const isManager = role === "manager";

  const save = () => {
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
      </Card>
      <Button
        label="Save"
        style={{ marginTop: 16 }}
        disabled={!name.trim() || !login.trim()}
        onPress={save}
      />
    </Page>
  );
}
