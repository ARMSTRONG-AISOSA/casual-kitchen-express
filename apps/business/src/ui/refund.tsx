import { naira } from "@cke/brand-tokens";
import { maxPartialRefund } from "@cke/validation";
import { Text } from "react-native";
import { useTheme } from "../state/theme";
import { Field, Segmented } from "./kit";

// Choosing a refund (MGR-15, owner decision 15 November 2026): a full refund is one tap; a partial
// refund is an amount typed in, never more than 99% of what the customer paid, and never more than
// what's left after earlier refunds. Used everywhere a refund is made: a manager's refund on the
// order, approving a cancellation request, and cancelling a walk-in.

export type RefundPick = { kind: "full" | "partial"; text: string };
export const NEW_PICK: RefundPick = { kind: "full", text: "" };

/** The amount chosen, or why it can't be used yet. `left` is what can still be refunded. */
export function refundFor(pick: RefundPick, paid: number, left: number) {
  if (pick.kind === "full") return { amount: left, error: null };
  const cap = Math.min(maxPartialRefund(paid), left);
  const n = Number(pick.text);
  if (!pick.text || !Number.isFinite(n) || n < 1) return { amount: null, error: "Enter an amount" };
  if (n > maxPartialRefund(paid))
    return {
      amount: null,
      error: `That’s more than 99% of the ${naira(paid)} paid. The most is ${naira(maxPartialRefund(paid))}.`,
    };
  if (n > cap) return { amount: null, error: `Only ${naira(left)} is left to refund` };
  return { amount: n, error: null };
}

export function RefundPicker({
  paid,
  left,
  value,
  onChange,
}: {
  paid: number;
  left: number;
  value: RefundPick;
  onChange: (v: RefundPick) => void;
}) {
  const t = useTheme();
  const cap = Math.min(maxPartialRefund(paid), left);
  const { error } = refundFor(value, paid, left);
  return (
    <>
      <Segmented
        options={[
          ["full", `Full refund, ${naira(left)}`],
          ["partial", "Partial refund"],
        ]}
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind })}
      />
      {value.kind === "partial" ? (
        <>
          <Field
            label="Amount to refund (₦)"
            value={value.text}
            // Digits only: naira are whole numbers here.
            onChangeText={(x) => onChange({ ...value, text: x.replace(/\D/g, "").slice(0, 7) })}
            keyboardType="number-pad"
            placeholder={`Up to ${cap.toLocaleString("en-NG")}`}
            // The limit, unless the red message below is already saying it.
            hint={
              value.text && error
                ? undefined
                : `Up to ${naira(cap)} (99% of the ${naira(paid)} paid)`
            }
            autoFocus
          />
          {value.text && error ? (
            <Text
              style={{ color: t.danger, marginTop: 6, fontSize: 15 }}
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          ) : null}
        </>
      ) : null}
    </>
  );
}
