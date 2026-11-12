import { naira } from "@cke/brand-tokens";
import { useState } from "react";
import { View } from "react-native";
import { STATEMENTS, type MonthKey } from "../../src/data/seed";
import { cashExpectedToday, clock, log, nameOf, useStore } from "../../src/state/store";
import {
  Badge,
  Button,
  Card,
  Chip,
  Chips,
  DemoNote,
  Field,
  KV,
  Money,
  Page,
  Row,
  Section,
  Segmented,
  Sheet,
  T,
} from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

/** Today's entries show the time; older ones show how many days ago. */
const when = (at: number) => {
  const days = Math.round((Date.now() - at) / 86_400_000);
  return days >= 1 ? `${days} day${days === 1 ? "" : "s"} ago` : clock(at);
};

type Tab = "statement" | "cash" | "audit" | "close";

// Finance (ACC-03 to ACC-07): fixed monthly figures for record keeping and the accountant's
// monthly report. Account officers and managers.
export default function Finance() {
  const { s, set } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("statement");
  const [month, setMonth] = useState<MonthKey>("Nov 2026");
  const [signing, setSigning] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<"all" | "money" | "account" | "setting" | "contact">("all");
  const st = STATEMENTS[month];
  const closedRec = s.monthCloses.find((c) => c.month === month);
  const closed = !!closedRec;
  const sales = st.online + st.walkin;
  const net = sales - st.refunds - st.riderPay + st.variance;

  const today = {
    date: "Thu 12 Nov (today)",
    expected: cashExpectedToday(s),
    ...s.today,
  };
  const cashUps = [today, ...s.cashUps];
  // Every day's cash-up, today included, must be signed off before a month can close (ACC-07).
  const unsigned = cashUps.filter((c) => !c.signedOffBy);
  const exportIt = (what: string) => toast(`${what} export comes with the backend (CSV and PDF)`);

  return (
    <Page>
      <Segmented
        options={[
          ["statement", "Statement"],
          ["cash", "Cash-ups"],
          ["audit", "Audit trail"],
          ["close", "Close month"],
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "statement" ? (
        <>
          <Row style={{ marginTop: 14, flexWrap: "wrap" }}>
            <Chips>
              {(Object.keys(STATEMENTS) as MonthKey[]).map((m) => (
                <Chip key={m} label={m} selected={month === m} onPress={() => setMonth(m)} />
              ))}
            </Chips>
            <View style={{ alignSelf: "center" }}>
              <Badge label={closed ? "Closed, locked" : "Open month"} />
            </View>
          </Row>
          <Section title="Sales">
            <Card style={{ marginTop: 0 }}>
              <KV k="Online orders" v={<Money n={st.online} />} />
              <KV k="Walk-in orders" v={<Money n={st.walkin} />} />
              <KV k="Total sales" v={<Money n={sales} strong />} strong />
              <KV k="Of which delivery fees" v={<Money n={st.fees} />} />
            </Card>
          </Section>
          <Section title="By payment method">
            <Card style={{ marginTop: 0 }}>
              <KV k="Card" v={<Money n={st.card} />} />
              <KV k="Transfer" v={<Money n={st.transfer} />} />
              <KV k="Cash" v={<Money n={st.cash} />} />
            </Card>
          </Section>
          <Section title="Out and adjustments">
            <Card style={{ marginTop: 0 }}>
              <KV k="Refunds" v={<Money n={-st.refunds} />} />
              <KV k="Rider pay earned" v={<Money n={-st.riderPay} />} />
              <KV k="Rider pay paid out" v={<Money n={st.riderPaid} />} />
              <KV k="Cash variances" v={<Money n={st.variance} />} />
              <KV k="Net" v={<Money n={net} strong />} strong />
            </Card>
          </Section>
          <Button
            label="Export statement"
            variant="ghost"
            small
            style={{ marginTop: 14, alignSelf: "flex-start" }}
            onPress={() => exportIt("Statement")}
          />
          <DemoNote text="Demo figures. Each line opens the orders behind it once the backend is connected." />
        </>
      ) : null}

      {tab === "cash" ? (
        <>
          <T muted style={{ marginTop: 14 }}>
            Counted at close by the person on the counter. Sign off each day.
          </T>
          {cashUps.map((c) => {
            const diff = c.counted === null ? null : c.counted - c.expected;
            const signed = c.signedOffBy;
            return (
              <Card key={c.date}>
                <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <T v="h3">{c.date}</T>
                  <Badge
                    label={
                      c.counted === null
                        ? "Not counted yet"
                        : signed
                          ? "Signed off"
                          : "Waiting for sign-off"
                    }
                  />
                </Row>
                <KV k="Expected" v={naira(c.expected)} />
                <KV
                  k="Counted"
                  v={
                    c.counted === null
                      ? "–"
                      : `${naira(c.counted)}${c.countedBy ? `, by ${nameOf(s, c.countedBy)} (${c.countedBy})` : ""}`
                  }
                />
                <KV
                  k="Difference"
                  v={
                    diff === null
                      ? "–"
                      : diff === 0
                        ? "None"
                        : `${diff > 0 ? "Over" : "Short"} ${naira(Math.abs(diff))}`
                  }
                />
                {signed ? (
                  <KV
                    k="Signed off by"
                    v={`${nameOf(s, signed)} (${signed})${c.signedOffAt ? `, ${when(c.signedOffAt)}` : ""}`}
                  />
                ) : null}
                {c.note ? (
                  <T v="small" muted style={{ marginTop: 6 }}>
                    Note: {c.note}
                  </T>
                ) : null}
                {c.counted !== null && !signed ? (
                  <Button
                    label="Sign off"
                    small
                    style={{ marginTop: 10, alignSelf: "flex-start" }}
                    onPress={() => (setSigning(c.date), setNote(""))}
                  />
                ) : null}
              </Card>
            );
          })}
          <Button
            label="Export cash-ups"
            variant="ghost"
            small
            style={{ marginTop: 14, alignSelf: "flex-start" }}
            onPress={() => exportIt("Cash-ups")}
          />
        </>
      ) : null}

      {tab === "audit" ? (
        <>
          <Chips style={{ marginTop: 14 }}>
            {(["all", "money", "account", "setting", "contact"] as const).map((k) => (
              <Chip
                key={k}
                label={
                  k === "all"
                    ? "All"
                    : k === "money"
                      ? "Money"
                      : k === "account"
                        ? "Accounts and orders"
                        : k === "setting"
                          ? "Settings"
                          : "Customer contact"
                }
                selected={kind === k}
                onPress={() => setKind(k)}
              />
            ))}
          </Chips>
          <Card>
            {s.audit
              .filter((a) => kind === "all" || a.kind === kind)
              .map((a, i) => (
                <View key={i} style={{ paddingVertical: 8 }}>
                  <T v="label">{a.action}</T>
                  <T v="small" muted>
                    {nameOf(s, a.who)} ({a.who}), {when(a.at)}
                  </T>
                </View>
              ))}
          </Card>
          <Button
            label="Export audit trail"
            variant="ghost"
            small
            style={{ marginTop: 14, alignSelf: "flex-start" }}
            onPress={() => exportIt("Audit trail")}
          />
        </>
      ) : null}

      {tab === "close" ? (
        <>
          <Card>
            <T v="h3">Close {month}</T>
            {closed ? (
              <T muted style={{ marginTop: 6 }}>
                This month is closed and its figures are locked. A correction goes in as an
                adjustment in the next open month, with a reason.
              </T>
            ) : null}
            {closedRec ? (
              <KV
                k="Closed by"
                v={`${nameOf(s, closedRec.by)} (${closedRec.by}), ${when(closedRec.at)}`}
              />
            ) : null}
            {closed ? null : (
              <>
                <T muted style={{ marginTop: 6 }}>
                  Closing locks the month’s figures. Every day’s cash-up must be signed off first.
                </T>
                {unsigned.length ? (
                  <T style={{ marginTop: 10 }}>
                    Waiting for sign-off: {unsigned.map((c) => c.date).join(", ")}.
                  </T>
                ) : null}
                <Button
                  label={`Close ${month}`}
                  style={{ marginTop: 14, alignSelf: "flex-start" }}
                  disabled={unsigned.length > 0}
                  onPress={() => {
                    set((x) => ({
                      monthCloses: [
                        ...x.monthCloses,
                        { month, by: x.userId ?? "System", at: Date.now() },
                      ],
                      ...log(x, "money", `Closed ${month}`),
                    }));
                    toast(`${month} closed`);
                  }}
                />
              </>
            )}
          </Card>
          <T v="small" muted style={{ marginTop: 10 }}>
            November is still running, so it can be closed after its last day. October is already
            closed.
          </T>
        </>
      ) : null}

      <Sheet visible={!!signing} onClose={() => setSigning(null)} title={`Sign off ${signing}`}>
        <T muted>
          Recorded as {nameOf(s, s.userId ?? undefined)} ({s.userId}), with the time.
        </T>
        <Field label="Note (needed if there’s a difference)" value={note} onChangeText={setNote} />
        <Button
          label="Sign off"
          style={{ marginTop: 16 }}
          onPress={() => {
            set((x) => ({
              // Whoever is signed in, an account officer or a manager, is recorded (ACC-04).
              today: signing?.includes("today")
                ? {
                    ...x.today,
                    signedOffBy: x.userId ?? undefined,
                    signedOffAt: Date.now(),
                    note: note || x.today.note,
                  }
                : x.today,
              cashUps: x.cashUps.map((c) =>
                c.date === signing
                  ? {
                      ...c,
                      signedOffBy: x.userId ?? undefined,
                      signedOffAt: Date.now(),
                      note: note || c.note,
                    }
                  : c,
              ),
              ...log(x, "money", `Signed off the cash-up for ${signing}`),
            }));
            toast("Signed off");
            setSigning(null);
          }}
        />
      </Sheet>
    </Page>
  );
}
