import { router } from "expo-router";
import { View } from "react-native";
import {
  cancelOrder,
  clearAlert,
  findOrder,
  log,
  minsAgo,
  myRole,
  useStore,
} from "../../src/state/store";
import { Button, Card, Page, Row, StatusPill, T } from "../../src/ui/kit";
import { useToast } from "../../src/ui/toast";

// Alerts (MGR-14): orders no rider has accepted, rider help requests, and cancellation requests.
// Dispatch officers and managers act on them; kitchen staff see them.
export default function Alerts() {
  const { s, set } = useStore();
  const toast = useToast();
  const role = myRole(s);
  const acts = role === "dispatch" || role === "manager";

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
                      onPress={() => {
                        set((st) => ({
                          ...cancelOrder(st, a.orderNo, "Customer request approved"),
                          ...clearAlert(st, a.id),
                        }));
                        toast(`${a.orderNo} cancelled and refunded`);
                      }}
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
    </Page>
  );
}
