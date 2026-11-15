import { useEffect, useState } from "react";
import { CUSTOMERS, MENU, type Order } from "../../src/data/seed";
import { initial, useStore } from "../../src/state/store";
import { Button, Card, Chip, Chips, Page, Section, Sheet, SwitchRow, T } from "../../src/ui/kit";
import { TOUR, useTour } from "../../src/ui/tour";
import { useToast } from "../../src/ui/toast";

const NEXT: Partial<Record<Order["status"], Order["status"]>> = {
  new: "preparing",
  preparing: "ready",
  ready: "out",
  out: "done",
};

// Demo controls (MGR-28, MGR-29): the managers' tour guide (MGR-39), place simulated orders,
// auto-play the kitchen and riders, and reset.
export default function Demo() {
  const { s, set, reset } = useStore();
  const toast = useToast();
  const tour = useTour();
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      set((st) => {
        const o = [...st.orders].reverse().find((x) => NEXT[x.status]);
        if (!o) return {};
        const next = NEXT[o.status]!;
        const status = next === "out" && o.type !== "delivery" ? "done" : next;
        return {
          orders: st.orders.map((x) =>
            x.no === o.no
              ? {
                  ...x,
                  status,
                  riderId: status === "out" && !x.riderId ? "R-003" : x.riderId,
                  events: [...x.events, { label: status, at: Date.now(), by: "System" }],
                }
              : x,
          ),
        };
      });
    }, 6000 / speed);
    return () => clearInterval(id);
  }, [auto, speed, set]);

  const newOnline = () => {
    const c = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)]!;
    const m = MENU[Math.floor(Math.random() * 5)]!;
    set((st) => ({
      onlineSeq: st.onlineSeq + 1,
      orders: [
        {
          no: `O-${st.onlineSeq}`,
          channel: "online",
          type: "delivery",
          status: "new",
          lines: [{ name: m.name, qty: 1, station: m.station, ticked: false }],
          food: m.price,
          fee: st.settings.fee,
          pay: "card",
          placedAt: Date.now(),
          customerId: c.id,
          events: [{ label: "Placed", at: Date.now(), by: c.id }],
        },
        ...st.orders,
      ],
    }));
    toast(`O-${s.onlineSeq} placed`);
  };

  return (
    <Page>
      <Section title="Tour guide">
        <Card style={{ marginTop: 0 }}>
          <T muted>
            A walk through every menu item. Each step opens the screen and explains what it gets
            done. {TOUR.length} steps, about 2 minutes.
          </T>
          <Button label="Start tour" style={{ marginTop: 14 }} onPress={tour.start} />
        </Card>
      </Section>
      {s.live ? (
        <Section title="Practice orders">
          <Card style={{ marginTop: 0 }}>
            <T muted>
              This tablet is on the live kitchen, so every order here is real. Practice orders,
              auto-play, and Reset come back with the live simulator. To try an order now, place one
              in the customer app.
            </T>
          </Card>
        </Section>
      ) : (
        <>
          <Section title="Practice orders">
            <Card style={{ marginTop: 0 }}>
              <Button label="New online order" onPress={newOnline} />
              <T v="small" muted style={{ marginTop: 8 }}>
                Adds one pretend customer order to the Board, so you can try handling it.
              </T>
              <SwitchRow
                label="Auto-play"
                hint="A simulated kitchen and riders move orders along"
                value={auto}
                onChange={setAuto}
              />
              <T v="label" style={{ marginTop: 12 }}>
                Speed
              </T>
              <Chips style={{ marginTop: 8 }}>
                {[1, 5, 20].map((n) => (
                  <Chip
                    key={n}
                    label={`${n}x`}
                    selected={speed === n}
                    onPress={() => setSpeed(n)}
                  />
                ))}
              </Chips>
            </Card>
          </Section>
          <Section title="Reset">
            <Button label="Reset the demo data" variant="ghost" onPress={() => setConfirm(true)} />
            <T v="small" muted style={{ marginTop: 8 }}>
              Puts today’s orders, alerts, and settings back to the start, after you’ve tried things
              out.
            </T>
          </Section>
        </>
      )}
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Reset the demo data?">
        <T muted>Today’s orders, alerts, cash-ups, payouts, and settings go back to the start.</T>
        <Button
          label="Reset"
          variant="danger"
          style={{ marginTop: 16 }}
          onPress={() => {
            reset();
            setAuto(false);
            setConfirm(false);
            toast("Demo data reset");
          }}
        />
      </Sheet>
      <T v="small" muted style={{ marginTop: 14 }}>
        {initial().orders.length} orders in the starting data.
      </T>
    </Page>
  );
}
