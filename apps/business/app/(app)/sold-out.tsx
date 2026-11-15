import { naira } from "@cke/brand-tokens";
import { CATEGORIES } from "../../src/data/seed";
import { useOps } from "../../src/state/ops";
import { dishName, useStore } from "../../src/state/store";
import { Card, Page, Section, SwitchRow } from "../../src/ui/kit";
import { SoupOfTheDay } from "../../src/ui/soup";
import { useToast } from "../../src/ui/toast";

// Sold-out list (KIT-08): one tap switches an item off, and another brings it back. Today's soup
// is set here too (KIT-17).
export default function SoldOut() {
  const { s } = useStore();
  const ops = useOps();
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
                  label={dishName(m, s.soupToday)}
                  hint={m.soldOut ? "Sold out today" : `Available, ${naira(m.price)}`}
                  value={!m.soldOut}
                  onChange={(on) => {
                    ops.soldOut(m.id, !on);
                    toast(
                      on
                        ? `${dishName(m, s.soupToday)} is back on`
                        : `${dishName(m, s.soupToday)} is sold out`,
                    );
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
