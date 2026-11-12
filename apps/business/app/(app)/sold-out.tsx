import { naira } from "@cke/brand-tokens";
import { CATEGORIES } from "../../src/data/seed";
import { useStore } from "../../src/state/store";
import { Card, Page, Section, SwitchRow } from "../../src/ui/kit";
import { SoupOfTheDay } from "../../src/ui/soup";
import { useToast } from "../../src/ui/toast";

// Sold-out list (KIT-08): one tap switches an item off, and another brings it back. Today's soup
// is set here too (KIT-17).
export default function SoldOut() {
  const { s, set } = useStore();
  const toast = useToast();
  return (
    <Page>
      <SoupOfTheDay />
      {CATEGORIES.map((c) => {
        const items = s.menu.filter((m) => m.cat === c.id);
        if (!items.length) return null;
        return (
          <Section key={c.id} title={c.label}>
            <Card style={{ marginTop: 0, paddingVertical: 4 }}>
              {items.map((m) => (
                <SwitchRow
                  key={m.id}
                  label={m.name}
                  hint={m.soldOut ? "Sold out today" : `Available, ${naira(m.price)}`}
                  value={!m.soldOut}
                  onChange={(on) => {
                    set((st) => ({
                      menu: st.menu.map((x) => (x.id === m.id ? { ...x, soldOut: !on } : x)),
                    }));
                    toast(on ? `${m.name} is back on` : `${m.name} is sold out`);
                  }}
                />
              ))}
            </Card>
          </Section>
        );
      })}
    </Page>
  );
}
