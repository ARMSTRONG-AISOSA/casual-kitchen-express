import { naira } from "@cke/brand-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { orderTotal, type Alert } from "../../src/data/seed";
import {
  actorLabel,
  cancelOrder,
  clearAlert,
  findOrder,
  log,
  minsAgo,
  myRole,
  useStore,
} from "../../src/state/store";
import { Button, Card, ConfirmTick, Page, Row, Sheet, StatusPill, T } from "../../src/ui/kit";
import { NEW_PICK, RefundPicker, refundFor, type RefundPick } from "../../src/ui/refund";
import { useToast } from "../../src/ui/toast";

// Alerts (MGR-14): orders no rider has accepted, rider help requests, and cancellation requests.
// Dispatch officers and managers act on them; kitchen staff see them.
export default function Alerts() {
  const { s, set } = useStore();
  const toast = useToast();
  const role = myRole(s);
  const acts = role === "dispatch" || role === "manager";
  // Approving a cancellation refunds the customer, so it asks first (MGR-15).
  const [approving, setApproving] = useState<Alert | null>(null);
  const [sure, setSure] = useState(false);
  const ao = approving ? findOrder(s, approving.orderNo) : undefined;
  // The refund for an approved request: full by default, or a typed partial amount (MGR-15).
  const [pick, setPick] = useState<RefundPick>(NEW_PICK);
  const paid = ao ? orderTotal(ao) : 0;
  const left = ao ? paid - (ao.refunded ?? 0) : 0;
  const { amount } = refundFor(pick, paid, left);

  return (
    <Page>
      {!s.alerts.length ? <T muted>No alerts right now.</T> : null}
      {s.alerts.map((a) => {
        const o = findOrder(s, a.orderNo);
        return (
          <Card key={a.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <StatusPill
                status="problem"
                label={
                  a.kind === "unaccepted"
                    ? "Waiting for a rider"
                    : a.kind === "help"
                      ? "Rider needs help"
                      : a.kind === "cancel"
                        ? "Cancellation request"
                        : "Item unavailable"
                }
              />
              <T v="small" muted>
                {minsAgo(a.at)}
              </T>
            </Row>
            <T v="h3" style={{ marginTop: 8 }}>
              {a.text}
            </T>
            {acts ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <Button
                  label="Open order"
                  variant="ghost"
                  small
                  onPress={() => router.push(`/order/${a.orderNo}`)}
                />
                {a.kind === "unaccepted" ? (
                  <Button
                    label="Assign to a rider"
                    small
                    onPress={() => router.push(`/assign/${a.orderNo}`)}
                  />
                ) : null}
                {a.kind === "help" ? (
                  <>
                    <Button
                      label="Approve completion"
                      small
                      onPress={() => {
                        set((st) => ({
                          ...clearAlert(st, a.id),
                          orders: st.orders.map((x) =>
                            x.no === a.orderNo
                              ? {
                                  ...x,
                                  status: "done",
                                  events: [
                                    ...x.events,
                                    {
                                      label: "Completed by approval",
                                      at: Date.now(),
                                      by: st.userId ?? "",
                                    },
                                  ],
                                }
                              : x,
                          ),
                          ...log(st, "account", `Approved a manual completion for ${a.orderNo}`),
                        }));
                        toast(`${a.orderNo} completed`);
                      }}
                    />
                    <Button
                      label="Keep open"
                      variant="ghost"
                      small
                      onPress={() => (set((st) => clearAlert(st, a.id)), toast("Kept open"))}
                    />
                  </>
                ) : null}
                {a.kind === "cancel" && o ? (
                  <>
                    <Button
                      label="Approve"
                      small
                      onPress={() => (setApproving(a), setSure(false), setPick(NEW_PICK))}
                    />
                    <Button
                      label="Decline"
                      variant="ghost"
                      small
                      onPress={() => {
                        set((st) => ({
                          ...clearAlert(st, a.id),
                          ...log(
                            st,
                            "account",
                            `Declined the cancellation request for ${a.orderNo}`,
                          ),
                        }));
                        toast("Request declined. The customer is told.");
                      }}
                    />
                  </>
                ) : null}
              </View>
            ) : (
              <T v="small" muted style={{ marginTop: 8 }}>
                The dispatch officer or a manager will handle this.
              </T>
            )}
          </Card>
        );
      })}

      <Sheet
        visible={!!approving && !!ao}
        onClose={() => setApproving(null)}
        title={`Approve cancelling ${approving?.orderNo ?? ""}?`}
      >
        <T muted>
          The order is cancelled and the customer is refunded (simulated). Choose a full refund, or
          type a partial amount.
        </T>
        {ao ? (
          <>
            <View style={{ marginTop: 12 }}>
              <RefundPicker
                paid={paid}
                left={left}
                value={pick}
                onChange={(v) => (setPick(v), setSure(false))}
              />
            </View>
            <ConfirmTick
              checked={sure}
              onChange={setSure}
              label={
                amount
                  ? `I’m sure I want to refund ${naira(amount)} for ${ao.no}`
                  : "Enter the amount to refund first"
              }
            />
          </>
        ) : null}
        <T v="small" muted style={{ marginTop: 6 }}>
          Recorded as {actorLabel(s)}, with the time.
        </T>
        <Button
          label="Approve and refund"
          disabled={!sure || !amount}
          style={{ marginTop: 16 }}
          onPress={() => {
            const a = approving!;
            set((st) => ({
              ...cancelOrder(st, a.orderNo, "Customer request approved", amount ?? undefined),
              ...clearAlert(st, a.id),
            }));
            setApproving(null);
            toast(`${a.orderNo} cancelled and ${naira(amount ?? 0)} refunded`);
          }}
        />
        <Button
          label="Not now"
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => setApproving(null)}
        />
      </Sheet>
    </Page>
  );
}
