import { router } from "expo-router";
import { api } from "../../src/api";
import { refreshPeople } from "../../src/state/catalog";
import { useState } from "react";
import { View } from "react-native";
import { ROLE_LABEL, signInOf, type Person, type Role } from "../../src/data/seed";
import { log, useStore } from "../../src/state/store";
import { Avatar } from "../../src/ui/avatar";
import { Badge, Button, Card, Chip, Chips, KV, Page, Row, Sheet, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

type Tab = Person["role"];
const TABS: [Tab, string][] = [
  ["rider", "Riders"],
  ["kitchen", "Kitchen staff"],
  ["dispatch", "Dispatch officers"],
  ["accounts", "Account officers"],
  ["manager", "Managers"],
];

/** A temporary password, shown once (MGR-25). */
const tempPassword = () => `cke-${Math.floor(1000 + Math.random() * 9000)}`;

// People (MGR-03, MGR-04): every staff role, with Reset password and Deactivate or Reactivate.
// The owner can't be deactivated.
export default function People() {
  const { s, set } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("rider");
  const [temp, setTemp] = useState<{ name: string; pass: string } | null>(null);
  const [viewing, setViewing] = useState<Person | null>(null);
  const photo = viewing ? s.staffPhotos[viewing.id] : undefined;
  const list = s.people.filter((p) => p.role === tab);

  // With the API connected these change the real accounts (signing the person out straight away);
  // without it, the demo data.
  const toggle = async (p: Person) => {
    if (api) {
      try {
        await (p.active ? api.deactivate(p.id) : api.reactivate(p.id));
        await refreshPeople();
      } catch (e) {
        return toast(e instanceof Error ? e.message : "Couldn’t change that. Try again.");
      }
    } else
      set((st) => ({
        people: st.people.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
        ...log(st, "account", `${p.active ? "Deactivated" : "Reactivated"} ${p.id}`),
      }));
    toast(`${p.name} ${p.active ? "deactivated" : "reactivated"}`);
  };
  const reset = async (p: Person) => {
    if (api) {
      try {
        const { temporaryPassword } = await api.resetPassword(p.id);
        return setTemp({ name: p.name, pass: temporaryPassword });
      } catch (e) {
        return toast(e instanceof Error ? e.message : "Couldn’t reset the password. Try again.");
      }
    }
    const pass = tempPassword();
    set((st) => log(st, "account", `Reset the password for ${p.id}`));
    setTemp({ name: p.name, pass });
  };

  return (
    <Page>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Chips>
          {TABS.map(([v, l]) => (
            <Chip key={v} label={l} selected={tab === v} onPress={() => setTab(v)} />
          ))}
        </Chips>
        <Button label="Add" small onPress={() => router.push(`/person/new?role=${tab}`)} />
      </Row>
      {list.map((p) => (
        <Card key={p.id}>
          <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
              <Avatar code={p.id} name={p.name} size={48} />
              <View style={{ flexShrink: 1 }}>
                <T v="h3">
                  {p.name}, {p.id}
                </T>
                <T muted>{[p.job, signInOf(p).value].filter(Boolean).join(", ")}</T>
              </View>
            </View>
            <Badge label={p.active ? "Active" : "Deactivated"} />
          </Row>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button label="View profile" small onPress={() => setViewing(p)} />
            <Button
              label="Edit"
              variant="ghost"
              small
              onPress={() => router.push(`/person/${p.id}`)}
            />
            {p.username ? (
              <Button label="Reset password" variant="ghost" small onPress={() => void reset(p)} />
            ) : null}
            {p.owner ? (
              <T v="small" muted style={{ alignSelf: "center" }}>
                Owner, can’t be deactivated
              </T>
            ) : (
              <Button
                label={p.active ? "Deactivate" : "Reactivate"}
                variant={p.active ? "ghost" : "primary"}
                small
                onPress={() => void toggle(p)}
              />
            )}
          </View>
        </Card>
      ))}
      {/* View profile: everything from the editor, read only, with the photo or a placeholder. */}
      <Sheet visible={!!viewing} onClose={() => setViewing(null)} title="Profile">
        {viewing ? (
          <>
            <View style={{ alignItems: "center", marginBottom: 6 }}>
              <Avatar code={viewing.id} name={viewing.name} size={140} />
              <T v="h2" style={{ marginTop: 10 }}>
                {viewing.name}
              </T>
              <T muted>
                {viewing.role === "rider" ? "Rider" : ROLE_LABEL[viewing.role as Role]},{" "}
                {viewing.id}
              </T>
            </View>
            <KV
              k="Status"
              v={viewing.owner ? "Owner, active" : viewing.active ? "Active" : "Deactivated"}
            />
            <KV k="Job title" v={viewing.job || "–"} />
            <KV k={signInOf(viewing).label} v={signInOf(viewing).value || "–"} />
            <KV k="Phone" v={viewing.phone || "–"} />
            <KV
              k="Gender"
              v={
                viewing.gender === "female"
                  ? "Female"
                  : viewing.gender === "male"
                    ? "Male"
                    : viewing.gender === "prefer_not_to_say"
                      ? "Prefer not to say"
                      : "Not given"
              }
            />
            <KV k="Home address" v={viewing.homeAddress || "Not given"} />
            {/* Staff photos carry no credit (owner, 12 November 2026). */}
            {photo ? null : (
              <T v="small" muted style={{ marginTop: 10 }}>
                No photo yet. Add one with Edit.
              </T>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Button
                label="Edit"
                variant="ghost"
                onPress={() => {
                  const id = viewing.id;
                  setViewing(null);
                  router.push(`/person/${id}`);
                }}
              />
              <Button label="Close" onPress={() => setViewing(null)} />
            </View>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!temp} onClose={() => setTemp(null)} title="Temporary password">
        <T muted>
          Give this to {temp?.name}. It’s shown once. They choose their own at the next sign-in.
        </T>
        <T v="big" style={{ marginTop: 12 }}>
          {temp?.pass}
        </T>
        <Button label="Done" style={{ marginTop: 16 }} onPress={() => setTemp(null)} />
      </Sheet>
    </Page>
  );
}
