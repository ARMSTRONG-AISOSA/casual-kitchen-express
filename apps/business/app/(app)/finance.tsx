import { ApiError, type CashUpView, type StatementView } from "@cke/api-client";
import { naira } from "@cke/brand-tokens";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Share, View } from "react-native";
import { api } from "../../src/api";
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

type Tab = "statement" | "cash" | "audit" | "close";
type Kind = "all" | "money" | "account" | "setting" | "contact";

/** The business day in West Africa Time (UTC+1 all year), shifted by some days. */
const watDay = (shift = 0) =>
  new Date(Date.now() + 60 * 60_000 + shift * 86_400_000).toISOString().slice(0, 10);
const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
const dayLabel = (s: string) =>
  new Date(`${s}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
const csv = (lines: (string | number | null)[][]) =>
  lines
    .map((l) =>
      l
        .map((v) => {
          const s = v === null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");

// Finance (ACC-03 to ACC-07): the monthly statement, the daily cash-ups and their sign-off, the
// audit trail, and closing a month, all from the real records. Account officers and managers.
// A closed month shows the figures saved when it closed; they never change.
export default function Finance() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("statement");
  const [month, setMonth] = useState(watDay(0).slice(0, 7));
  const [kind, setKind] = useState<Kind>("all");
  const [signing, setSigning] = useState<CashUpView | null>(null);
  const [note, setNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adj, setAdj] = useState({ amount: "", reason: "", minus: false });
  const [busy, setBusy] = useState(false);

  const st = useQuery({
    queryKey: ["statement", month],
    queryFn: () => api!.statement(month),
    enabled: !!api,
  });
  const cash = useQuery({
    queryKey: ["cash-ups", month],
    queryFn: () => api!.cashUps(month),
    enabled: !!api && tab === "cash",
  });
  const [auditFrom] = useState(() => watDay(-29));
  const audit = useQuery({
    queryKey: ["audit", kind, auditFrom],
    queryFn: () => api!.audit({ from: auditFrom, to: watDay(0), kind }),
    enabled: !!api && tab === "audit",
  });

  const act = async (call: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await call();
      toast(done);
      await Promise.all([st.refetch(), tab === "cash" ? cash.refetch() : null]);
      return true;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Can’t reach CKE right now. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const share = (title: string, text: string) =>
    void Share.share({ title, message: text }).catch(() => toast("Can’t share the file right now"));

  const v: StatementView | undefined = st.data;
  const s = v?.statement;

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

      {tab !== "audit" && v ? (
        <Row style={{ marginTop: 14, flexWrap: "wrap" }}>
          <Chips>
            {v.months.slice(0, 6).map((m) => (
              <Chip
                key={m}
                label={monthLabel(m)}
                selected={month === m}
                onPress={() => setMonth(m)}
              />
            ))}
          </Chips>
          <View style={{ alignSelf: "center" }}>
            <Badge label={v.closed ? "Closed, locked" : "Open month"} />
          </View>
        </Row>
      ) : null}

      {!v && tab !== "audit" ? (
        <T muted style={{ marginTop: 16 }}>
          {st.isError ? "Can’t load Finance right now. Try again." : "Loading…"}
        </T>
      ) : null}

      {tab === "statement" && s && v ? (
        <>
          <Section title="Sales">
            <Card style={{ marginTop: 0 }}>
              <KV k="Online orders" v={<Money n={s.online} />} />
              <KV k="Walk-in orders" v={<Money n={s.walkin} />} />
              <KV k="Total sales" v={<Money n={s.sales} strong />} strong />
              <KV k="Of which delivery fees" v={<Money n={s.deliveryFees} />} />
              <KV k="Orders" v={String(s.orders)} />
            </Card>
          </Section>
          <Section title="By payment method">
            <Card style={{ marginTop: 0 }}>
              <KV k="Card" v={<Money n={s.byMethod.card} />} />
              <KV k="Transfer" v={<Money n={s.byMethod.transfer} />} />
              <KV k="Cash" v={<Money n={s.byMethod.cash} />} />
            </Card>
          </Section>
          <Section title="Out and adjustments">
            <Card style={{ marginTop: 0 }}>
              <KV k="Refunds" v={<Money n={-s.refunds} />} />
              <KV k="Rider pay earned" v={<Money n={-s.riderPayEarned} />} />
              <KV k="Rider pay paid out" v={<Money n={s.riderPayPaid} />} />
              <KV k="Cash variances" v={<Money n={s.cashVariance} />} />
              <KV k="Adjustments" v={<Money n={s.adjustments} />} />
              <KV k="Net" v={<Money n={s.net} strong />} strong />
            </Card>
          </Section>
          {v.adjustmentsList.length ? (
            <Section title="Adjustments this month">
              <Card style={{ marginTop: 0 }}>
                {v.adjustmentsList.map((a, i) => (
                  <KV
                    key={i}
                    k={`${a.reason}${a.by ? `, by ${a.by}` : ""}, ${when(a.at)}`}
                    v={naira(a.amount)}
                  />
                ))}
              </Card>
            </Section>
          ) : null}
          <Row style={{ marginTop: 14, flexWrap: "wrap" }}>
            <Button
              label="Export statement"
              variant="ghost"
              small
              onPress={() =>
                share(
                  `CKE statement ${month}`,
                  csv([
                    ["CKE monthly statement", month, v.closed ? "closed" : "open"],
                    ["Online orders", s.online],
                    ["Walk-in orders", s.walkin],
                    ["Total sales", s.sales],
                    ["Delivery fees", s.deliveryFees],
                    ["Card", s.byMethod.card],
                    ["Transfer", s.byMethod.transfer],
                    ["Cash", s.byMethod.cash],
                    ["Refunds", -s.refunds],
                    ["Rider pay earned", -s.riderPayEarned],
                    ["Rider pay paid out", s.riderPayPaid],
                    ["Cash variances", s.cashVariance],
                    ["Adjustments", s.adjustments],
                    ["Net", s.net],
                  ]),
                )
              }
            />
            {!v.closed && month === watDay(0).slice(0, 7) ? (
              <Button
                label="Add an adjustment"
                variant="ghost"
                small
                onPress={() => {
                  setAdj({ amount: "", reason: "", minus: false });
                  setAdjusting(true);
                }}
              />
            ) : null}
          </Row>
          <DemoNote text="Simulated money: worked out from the orders, refunds, rider pay, and cash-ups." />
        </>
      ) : null}

      {tab === "cash" ? (
        <>
          <T muted style={{ marginTop: 14 }}>
            Counted at close by the person on the counter. Sign off each day.
          </T>
          {!cash.data ? (
            <T muted style={{ marginTop: 10 }}>
              {cash.isError ? "Can’t load the cash-ups right now." : "Loading…"}
            </T>
          ) : null}
          {cash.data?.cashUps.map((c) => {
            const diff = c.counted === null ? null : c.counted - c.expected;
            return (
              <Card key={c.date}>
                <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <T v="h3">
                    {dayLabel(c.date)}
                    {c.date === watDay(0) ? " (today)" : ""}
                  </T>
                  <Badge
                    label={
                      c.counted === null
                        ? "Not counted yet"
                        : c.signedOffBy
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
                      : `${naira(c.counted)}${c.countedBy ? `, by ${c.countedBy}` : ""}`
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
                {c.signedOffBy ? (
                  <KV
                    k="Signed off by"
                    v={`${c.signedOffBy}${c.signedOffAt ? `, ${when(c.signedOffAt)}` : ""}`}
                  />
                ) : null}
                {c.note ? (
                  <T v="small" muted style={{ marginTop: 6 }}>
                    Note: {c.note}
                  </T>
                ) : null}
                {c.counted !== null && !c.signedOffBy && !c.closed ? (
                  <Button
                    label="Sign off"
                    small
                    style={{ marginTop: 10, alignSelf: "flex-start" }}
                    onPress={() => {
                      setNote("");
                      setSigning(c);
                    }}
                  />
                ) : null}
              </Card>
            );
          })}
          {cash.data ? (
            <Button
              label="Export cash-ups"
              variant="ghost"
              small
              style={{ marginTop: 14, alignSelf: "flex-start" }}
              onPress={() =>
                share(
                  `CKE cash-ups ${month}`,
                  csv([
                    ["Date", "Expected", "Counted", "Counted by", "Signed off by", "Note"],
                    ...cash.data!.cashUps.map((c) => [
                      c.date,
                      c.expected,
                      c.counted,
                      c.countedBy,
                      c.signedOffBy,
                      c.note,
                    ]),
                  ]),
                )
              }
            />
          ) : null}
        </>
      ) : null}

      {tab === "audit" ? (
        <>
          <Chips style={{ marginTop: 14 }}>
            {(
              [
                ["all", "All"],
                ["money", "Money"],
                ["account", "Accounts and orders"],
                ["setting", "Settings"],
                ["contact", "Customer contact"],
              ] as const
            ).map(([k, l]) => (
              <Chip key={k} label={l} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </Chips>
          <T v="small" muted style={{ marginTop: 8 }}>
            The last 30 days, newest first.
          </T>
          <Card>
            {!audit.data ? (
              <T muted>{audit.isError ? "Can’t load the audit trail right now." : "Loading…"}</T>
            ) : audit.data.entries.length ? (
              audit.data.entries.map((a, i) => (
                <View key={i} style={{ paddingVertical: 8 }}>
                  <T v="label">{a.action}</T>
                  <T v="small" muted>
                    {a.name ? `${a.name}${a.who ? ` (${a.who})` : ""}` : "CKE (automatic)"},{" "}
                    {when(a.at)}
                  </T>
                </View>
              ))
            ) : (
              <T muted>Nothing in the last 30 days.</T>
            )}
          </Card>
          {audit.data ? (
            <Button
              label="Export audit trail"
              variant="ghost"
              small
              style={{ marginTop: 14, alignSelf: "flex-start" }}
              onPress={() =>
                share(
                  "CKE audit trail",
                  csv([
                    ["When", "Kind", "Who", "What"],
                    ...audit.data!.entries.map((a) => [a.at, a.kind, a.who ?? "CKE", a.action]),
                  ]),
                )
              }
            />
          ) : null}
        </>
      ) : null}

      {tab === "close" && v ? (
        <>
          <Card>
            <T v="h3">Close {monthLabel(month)}</T>
            {v.closed ? (
              <>
                <T muted style={{ marginTop: 6 }}>
                  This month is closed and its figures are locked. A correction goes in as an
                  adjustment in the current month, with a reason.
                </T>
                <KV k="Closed by" v={`${v.closed.by ?? "–"}, ${when(v.closed.at)}`} />
                <KV k="Net when closed" v={naira(v.statement.net)} strong />
              </>
            ) : (
              <>
                <T muted style={{ marginTop: 6 }}>
                  Closing locks the month’s figures. It can close after its last day, once every day
                  with walk-in orders has a signed-off cash-up.
                </T>
                {v.waiting.length ? (
                  <T style={{ marginTop: 10 }}>
                    Waiting for sign-off: {v.waiting.map(dayLabel).join(", ")}.
                  </T>
                ) : null}
                {month === watDay(0).slice(0, 7) ? (
                  <T v="small" muted style={{ marginTop: 10 }}>
                    This month is still running.
                  </T>
                ) : null}
                <Button
                  label={`Close ${monthLabel(month)}`}
                  style={{ marginTop: 14, alignSelf: "flex-start" }}
                  disabled={!v.canClose || busy}
                  onPress={() =>
                    void act(() => api!.closeMonth(month), `${monthLabel(month)} closed`)
                  }
                />
              </>
            )}
          </Card>
        </>
      ) : null}

      <Sheet
        visible={!!signing}
        onClose={() => setSigning(null)}
        title={`Sign off ${signing ? dayLabel(signing.date) : ""}`}
      >
        <T muted>Recorded with your name and the time.</T>
        <Field
          label={
            signing && signing.counted !== signing.expected
              ? "Note about the difference (needed)"
              : "Note (optional)"
          }
          value={note}
          onChangeText={setNote}
        />
        <Button
          label="Sign off"
          disabled={busy}
          style={{ marginTop: 16 }}
          onPress={async () => {
            if (!signing) return;
            if (await act(() => api!.signOffCashUp(signing.date, note || null), "Signed off"))
              setSigning(null);
          }}
        />
      </Sheet>

      <Sheet visible={adjusting} onClose={() => setAdjusting(false)} title="Add an adjustment">
        <T muted>
          A correction for a closed month, entered in the current month with a reason (for example,
          cash found in the drawer later).
        </T>
        <Chips style={{ marginTop: 12 }}>
          <Chip
            label="Money in (+)"
            selected={!adj.minus}
            onPress={() => setAdj((a) => ({ ...a, minus: false }))}
          />
          <Chip
            label="Money out (−)"
            selected={adj.minus}
            onPress={() => setAdj((a) => ({ ...a, minus: true }))}
          />
        </Chips>
        <Field
          label="Amount in naira"
          value={adj.amount}
          onChangeText={(amount) => setAdj((a) => ({ ...a, amount }))}
          keyboardType="number-pad"
        />
        <Field
          label="Reason"
          value={adj.reason}
          onChangeText={(reason) => setAdj((a) => ({ ...a, reason }))}
        />
        <Button
          label="Save the adjustment"
          disabled={
            busy || !Number(adj.amount.replace(/[^0-9]/g, "")) || adj.reason.trim().length < 3
          }
          style={{ marginTop: 16 }}
          onPress={async () => {
            const amount = Number(adj.amount.replace(/[^0-9]/g, "")) * (adj.minus ? -1 : 1);
            if (await act(() => api!.addAdjustment(amount, adj.reason.trim()), "Adjustment saved"))
              setAdjusting(false);
          }}
        />
      </Sheet>
    </Page>
  );
}
