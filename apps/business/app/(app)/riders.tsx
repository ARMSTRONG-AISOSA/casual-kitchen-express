import { Phone } from "lucide-react-native";
import { log, nameOf, person, riderLoad, riderOrders, useStore } from "../../src/state/store";
import { Button, Card, Page, Row, Section, StatusPill, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Live riders panel (DSP-03, MGR-02): who is online, what each carries, and their load.
export default function Riders() {
  const { s, set } = useStore();
  const toast = useToast();
  const online = s.riders.filter((r) => r.online);
  const offline = s.riders.filter((r) => !r.online);
  const call = (id: string) => {
    set((st) => log(st, "contact", `Called rider ${id}`));
    toast(`In the real app this calls ${nameOf(s, id)} on ${person(s, id)?.phone}`);
  };
  return (
    <Page>
      <Section title={`Online now (${online.length})`}>
        {online.map((r) => {
          const carrying = riderOrders(s, r.id);
          return (
            <Card key={r.id}>
              <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <T v="h3">
                  {nameOf(s, r.id)}, {r.id}
                </T>
                <StatusPill
                  status={carrying.length ? "out" : "ready"}
                  label={carrying.length ? "Delivering" : "Free"}
                />
              </Row>
              <T muted style={{ marginTop: 4 }}>
                Load {riderLoad(s, r.id)} of {s.settings.budget}. Carrying {carrying.length} of 3
                {carrying.length ? `: ${carrying.map((o) => o.no).join(", ")}` : ""}
              </T>
              <Button
                label="Call rider"
                variant="ghost"
                small
                icon={(c) => <Phone size={18} color={c} />}
                style={{ marginTop: 10, alignSelf: "flex-start" }}
                onPress={() => call(r.id)}
              />
            </Card>
          );
        })}
      </Section>
      <Section title={`Offline (${offline.length})`}>
        {offline.map((r) => (
          <T key={r.id} muted style={{ marginTop: 4 }}>
            {nameOf(s, r.id)}, {r.id}
          </T>
        ))}
      </Section>
    </Page>
  );
}
