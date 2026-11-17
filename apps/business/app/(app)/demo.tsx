import type { DemoResetState, DemoState } from "@cke/api-client";
import { ApiError } from "@cke/api-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { api } from "../../src/api";
import { CUSTOMERS, MENU, type Order } from "../../src/data/seed";
import { onDemoReset } from "../../src/state/live";
import { initial, useStore } from "../../src/state/store";
import { useTheme } from "../../src/state/theme";
import {
  Button,
  Card,
  Chip,
  Chips,
  ConfirmTick,
  Page,
  Section,
  Sheet,
  SwitchRow,
  T,
} from "../../src/ui/kit";
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
        <LivePractice />
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
      {s.live ? null : (
        <T v="small" muted style={{ marginTop: 14 }}>
          {initial().orders.length} orders in the starting data.
        </T>
      )}
    </Page>
  );
}

/**
 * Practice orders on the live kitchen (build step 7, architecture.md 18.4): pretend online orders
 * from the demo customers and pretend walk-ins go into the real board, marked "Practice", and the
 * simulator on the server moves only those along. Real orders are never touched.
 */
function LivePractice() {
  const toast = useToast();
  const [st, setSt] = useState<DemoState | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [reset, setReset] = useState<DemoResetState | null>(null);
  const wasRunning = useRef(false);
  // Progress arrives on the live connection while Reset demo data runs (MGR-29).
  useEffect(() => onDemoReset(setReset), []);
  const resetting = reset?.status === "running";
  const refresh = useCallback(() => {
    void api
      ?.demoState()
      .then((d) => {
        setSt(d);
        setReset(d.reset);
      })
      .catch(() => {});
  }, []);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    if (!reset) return;
    if (reset.status === "running") wasRunning.current = true;
    else if (wasRunning.current) {
      wasRunning.current = false;
      toast(reset.status === "idle" ? "Demo data reset" : "The reset stopped");
      // Auto-play is back to off and the practice count to none.
      refresh();
    }
  }, [reset, toast, refresh]);

  const run = async (call: () => Promise<unknown>, done?: (r: never) => string) => {
    setBusy(true);
    try {
      const r = await call();
      if (done) toast(done(r as never));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
    } finally {
      setBusy(false);
      refresh();
    }
  };
  const place = (kind: "online" | "walkin") =>
    run(
      () => api!.practiceOrder(kind),
      (r: { order: { number: string } }) => `Practice order ${r.order.number} placed`,
    );
  const autoplay = (auto: boolean, speed: 1 | 5 | 20) => run(() => api!.setAutoplay(auto, speed));

  return (
    <>
      <Section title="Practice orders">
        <Card style={{ marginTop: 0 }}>
          <Button
            label="New online order"
            disabled={busy || resetting}
            onPress={() => void place("online")}
          />
          <T v="small" muted style={{ marginTop: 8 }}>
            A pretend customer order on the Board, marked Practice. Riders see it in their queue.
          </T>
          <Button
            label="New walk-in order"
            variant="ghost"
            disabled={busy || resetting}
            style={{ marginTop: 12 }}
            onPress={() => void place("walkin")}
          />
          <SwitchRow
            label="Auto-play"
            hint="A simulated kitchen and rider move practice orders along. Real orders are never touched."
            value={!!st?.auto}
            onChange={(on) => void autoplay(on, st?.speed ?? 1)}
          />
          <T v="label" style={{ marginTop: 12 }}>
            Speed
          </T>
          <Chips style={{ marginTop: 8 }}>
            {([1, 5, 20] as const).map((n) => (
              <Chip
                key={n}
                label={`${n}x`}
                selected={(st?.speed ?? 1) === n}
                onPress={() => void autoplay(!!st?.auto, n)}
              />
            ))}
          </Chips>
          <T v="small" muted style={{ marginTop: 10 }}>
            {st
              ? st.open
                ? `${st.open} practice order${st.open === 1 ? "" : "s"} in progress.`
                : "No practice orders in progress."
              : " "}
          </T>
        </Card>
      </Section>
      <Section title="Reset">
        <Button
          label="Remove practice orders"
          variant="ghost"
          disabled={resetting}
          onPress={() => setConfirm(true)}
        />
        <T v="small" muted style={{ marginTop: 8 }}>
          Takes every practice order off the Board and the reports. Real orders and the history
          stay.
        </T>
        {reset && (resetting || reset.status === "failed") ? <ResetProgress reset={reset} /> : null}
        <Button
          label="Reset demo data"
          variant="ghost"
          disabled={resetting || busy}
          style={{ marginTop: 16 }}
          onPress={() => {
            setUnderstood(false);
            setResetOpen(true);
          }}
        />
        <T v="small" muted style={{ marginTop: 8 }}>
          Back to the start: every order goes, including testers’, and the menu, prices, settings,
          staff, photos, and three months of history are rebuilt. About 3 minutes.
          {reset?.finishedAt && reset.status === "idle"
            ? ` Last reset ${new Date(reset.finishedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.`
            : ""}
        </T>
      </Section>
      <Sheet visible={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data?">
        <T muted>
          Every order goes, including ones testers placed, with payouts, cash-ups, and closed
          months. The menu, prices, soups, settings, staff, and photos go back to how they started,
          and staff added since are removed. Three months of history are then rebuilt. Testers keep
          their accounts. New orders wait until it’s done, in about 3 minutes.
        </T>
        <ConfirmTick
          checked={understood}
          onChange={setUnderstood}
          label="I understand everything goes back to the start"
        />
        <Button
          label="Reset everything"
          variant="danger"
          disabled={!understood}
          style={{ marginTop: 16 }}
          onPress={() => {
            setResetOpen(false);
            void run(async () => {
              try {
                setReset((await api!.resetDemo()).reset);
              } catch (e) {
                // The server says why (for example, the helper isn't running on the laptop).
                refresh();
                throw e;
              }
            });
          }}
        />
      </Sheet>
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Remove practice orders?">
        <T muted>Every practice order goes, with its alerts and refunds. Real orders stay.</T>
        <Button
          label="Remove"
          variant="danger"
          style={{ marginTop: 16 }}
          onPress={() => {
            setConfirm(false);
            void run(
              () => api!.resetPractice(),
              (r: { removed: number }) =>
                `${r.removed} practice order${r.removed === 1 ? "" : "s"} removed`,
            );
          }}
        />
      </Sheet>
    </>
  );
}

/** Reset demo data's progress: a bar with the step's name, or why it stopped. */
function ResetProgress({ reset }: { reset: DemoResetState }) {
  const t = useTheme();
  const failed = reset.status === "failed";
  const share = reset.steps ? Math.min(1, (reset.step + 0.5) / reset.steps) : 0;
  return (
    <Card style={{ marginTop: 14 }}>
      <T v="label">{failed ? "The reset stopped" : "Resetting demo data"}</T>
      {failed ? (
        <T muted style={{ marginTop: 6 }}>
          {reset.error ?? "Try again."}
        </T>
      ) : (
        <>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: reset.steps, now: reset.step }}
            style={{ height: 8, borderRadius: 4, backgroundColor: t.line, marginTop: 10 }}
          >
            <View
              style={{
                height: 8,
                borderRadius: 4,
                width: `${Math.round(share * 100)}%`,
                backgroundColor: t.primary,
              }}
            />
          </View>
          <T v="small" muted style={{ marginTop: 8 }}>
            Step {Math.min(reset.step + 1, reset.steps)} of {reset.steps}:{" "}
            {reset.label ?? "Starting"}
          </T>
        </>
      )}
    </Card>
  );
}
