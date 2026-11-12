import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import type { Person } from "../../src/data/seed";
import { log, useStore } from "../../src/state/store";
import { Badge, Button, Card, Chip, Chips, Page, Row, Sheet, T } from "../../src/ui/kit";
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
  const list = s.people.filter((p) => p.role === tab);

  const toggle = (p: Person) => {
    set((st) => ({
      people: st.people.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)),
      ...log(st, "account", `${p.active ? "Deactivated" : "Reactivated"} ${p.id}`),
    }));
    toast(`${p.name} ${p.active ? "deactivated" : "reactivated"}`);
  };
  const reset = (p: Person) => {
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
            <View style={{ flexShrink: 1 }}>
              <T v="h3">
                {p.name}, {p.id}
              </T>
              <T muted>
                {p.job}, {p.username ?? p.email}
              </T>
            </View>
            <Badge label={p.active ? "Active" : "Deactivated"} />
          </Row>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button
              label="Edit"
              variant="ghost"
              small
              onPress={() => router.push(`/person/${p.id}`)}
            />
            {p.username ? (
              <Button label="Reset password" variant="ghost" small onPress={() => reset(p)} />
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
                onPress={() => toggle(p)}
              />
            )}
          </View>
        </Card>
      ))}
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
