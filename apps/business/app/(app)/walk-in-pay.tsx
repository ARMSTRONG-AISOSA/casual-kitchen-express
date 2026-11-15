import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { useOps } from "../../src/state/ops";
import { draftTotal, useStore } from "../../src/state/store";
import {
  Button,
  Card,
  Chip,
  Chips,
  DemoNote,
  Field,
  KV,
  Page,
  Segmented,
  T,
} from "../../src/ui/kit";

// Take payment (KIT-14): cash with change due, or online, all simulated.
export default function WalkInPay() {
  const { s } = useStore();
  const ops = useOps();
  const [sending, setSending] = useState(false);
  const total = draftTotal(s);
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [online, setOnline] = useState<"card" | "transfer">("card");
  // Cash received: Exact, or any other amount typed in (design.md 6.5).
  const [exact, setExact] = useState(false);
  const [other, setOther] = useState("");
  const typed = other ? Number(other.replace(/[^0-9]/g, "")) : null;
  const received = exact ? total : typed;
  const tooLow = !exact && typed !== null && typed < total;
  if (!total)
    return (
      <Page>
        <T>Nothing to charge. Add items first.</T>
      </Page>
    );

  const confirm = async () => {
    setSending(true);
    const ok = await ops.placeWalkIn(
      method === "cash" ? "cash" : online,
      method === "cash" ? (received ?? total) : undefined,
    );
    setSending(false);
    if (ok) router.replace("/walk-in-sent");
  };

  return (
    <Page>
      <T v="big">{naira(total)}</T>
      <T muted>To pay</T>
      <Card>
        <Segmented
          options={[
            ["cash", "Cash"],
            ["online", "Online"],
          ]}
          value={method}
          onChange={setMethod}
        />
        {method === "cash" ? (
          <>
            <T v="label" style={{ marginTop: 16 }}>
              Amount received
            </T>
            <Chips style={{ marginTop: 8 }}>
              <Chip
                label={`Exact ${naira(total)}`}
                selected={exact}
                onPress={() => (setExact(true), setOther(""))}
              />
            </Chips>
            <Field
              label="Other amount"
              value={other}
              onChangeText={(v) => (setOther(v), setExact(false))}
              keyboardType="number-pad"
              placeholder="For example 10000"
              hint={tooLow ? `Less than the total of ${naira(total)}` : undefined}
            />
            {received !== null && !tooLow ? (
              <KV k="Change due" v={naira(received - total)} strong />
            ) : null}
          </>
        ) : (
          <>
            <T v="label" style={{ marginTop: 16 }}>
              Paid by
            </T>
            <Chips style={{ marginTop: 8 }}>
              <Chip label="Card" selected={online === "card"} onPress={() => setOnline("card")} />
              <Chip
                label="Transfer"
                selected={online === "transfer"}
                onPress={() => setOnline("transfer")}
              />
            </Chips>
          </>
        )}
        <DemoNote text="Demo payment. No money is taken." />
      </Card>
      <Button
        label={sending ? "Sending…" : "Confirm"}
        style={{ marginTop: 18 }}
        disabled={sending || (method === "cash" && (received === null || tooLow))}
        onPress={() => void confirm()}
      />
    </Page>
  );
}
