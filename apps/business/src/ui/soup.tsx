import { SOUPS } from "../data/seed";
import { log, useStore } from "../state/store";
import { Card, Chip, Chips, Section, T } from "./kit";
import { useToast } from "./toast";

// Soup of the day (KIT-17): kitchen staff set it on Sold out, managers on Sold out or Menu. The
// customer app shows it when people order, and only today's soup can be ordered.
export function SoupOfTheDay() {
  const { s, set } = useStore();
  const toast = useToast();
  return (
    <Section title="Soup of the day">
      <Card style={{ marginTop: 0 }}>
        <T muted>Choose today’s soup each morning. The customer app shows it when people order.</T>
        <Chips style={{ marginTop: 10 }}>
          {SOUPS.map((soup) => (
            <Chip
              key={soup}
              label={soup}
              selected={s.soupToday === soup}
              onPress={() => {
                set((st) => ({
                  soupToday: soup,
                  menu: st.menu.map((m) =>
                    m.id === "soup" ? { ...m, desc: `Today it’s ${soup.toLowerCase()}.` } : m,
                  ),
                  ...log(st, "setting", `Set the soup of the day to ${soup}`),
                }));
                toast(`Soup of the day: ${soup}`);
              }}
            />
          ))}
        </Chips>
      </Card>
    </Section>
  );
}
