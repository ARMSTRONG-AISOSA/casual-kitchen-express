import { naira } from "@cke/brand-tokens";
import { DEFAULTS } from "@cke/validation";
import { useState } from "react";
import { AREAS } from "../../src/data/seed";
import { log, myRole, useStore } from "../../src/state/store";
import {
  Button,
  Card,
  Field,
  KV,
  Page,
  Section,
  Segmented,
  Stepper,
  SwitchRow,
  T,
} from "../../src/ui/kit";
import { AlertSettingsSection } from "../../src/ui/alert-settings";
import { useToast } from "../../src/ui/toast";

// Settings (design.md 7.2). Dispatch officers see every section, Alerts included, except Pricing and pay and
// Restaurant contact, which are for managers only (architecture.md 3.0).
export default function Settings() {
  const { s, set } = useStore();
  const toast = useToast();
  const manager = myRole(s) === "manager";
  const st = s.settings;
  const [fee, setFee] = useState(String(st.fee));
  const [pay, setPay] = useState(String(st.riderPay));
  const [wa, setWa] = useState(st.whatsapp);
  const feeN = Number(fee.replace(/[^0-9]/g, ""));
  const payN = Number(pay.replace(/[^0-9]/g, ""));
  const payTooHigh = payN > feeN;
  const waOk = /^234\d{10}$/.test(wa.replace(/\D/g, ""));
  const change = (patch: Partial<typeof st>, what: string) =>
    set((x) => ({ settings: { ...x.settings, ...patch }, ...log(x, "setting", what) }));

  return (
    <Page>
      <Section title="Opening hours">
        <Card style={{ marginTop: 0 }}>
          <KV k="Online orders and delivery" v="8:00 am to 6:00 pm" />
          <KV k="Walk-in service" v="8:00 am to 8:30 pm" />
          <SwitchRow
            label="Pause new orders"
            hint="For busy moments or closing early"
            value={st.paused}
            onChange={(paused) => (
              change({ paused }, paused ? "Paused new orders" : "Resumed new orders"),
              toast(paused ? "New orders paused" : "Taking new orders")
            )}
          />
        </Card>
      </Section>

      <AlertSettingsSection />

      <Section title="Delivery area">
        <Card style={{ marginTop: 0 }}>
          <T v="small" muted>
            From Uselu to Oluku Market. Nothing beyond Oluku Market.
          </T>
          {AREAS.map((a) => (
            <SwitchRow
              key={a}
              label={a}
              value={st.areas[a] ?? true}
              onChange={(on) =>
                change(
                  { areas: { ...st.areas, [a]: on } },
                  `${on ? "Added" : "Removed"} ${a} ${on ? "to" : "from"} the delivery area`,
                )
              }
            />
          ))}
        </Card>
      </Section>

      <Section title="Riders">
        <Card style={{ marginTop: 0 }}>
          <T v="label">Capacity budget</T>
          <T v="small" muted style={{ marginBottom: 8 }}>
            Light items count 1, medium 2, heavy 3. A rider carries up to three orders within this
            budget. Usually {DEFAULTS.capacityBudget}.
          </T>
          <Stepper
            value={st.budget}
            min={3}
            max={12}
            onChange={(budget) => change({ budget }, `Set the rider capacity budget to ${budget}`)}
          />
          <T v="label" style={{ marginTop: 16 }}>
            Batch drop-off distance
          </T>
          <Stepper
            value={st.batchKm}
            min={0.5}
            max={5}
            step={0.5}
            format={(v) => `${v} km`}
            onChange={(batchKm) => change({ batchKm }, `Set the batch distance to ${batchKm} km`)}
          />
          <T v="label" style={{ marginTop: 16, marginBottom: 8 }}>
            Rider tracking
          </T>
          <Segmented
            options={[
              ["light", "Light"],
              ["milestones", "Milestones only"],
            ]}
            value={st.tracking}
            onChange={(tracking) => change({ tracking }, `Set rider tracking to ${tracking}`)}
          />
        </Card>
      </Section>

      <Section title="Cancellations">
        <Card style={{ marginTop: 0 }}>
          <T v="small" muted style={{ marginBottom: 8 }}>
            After this many cancellations in 7 days, a customer can only request a cancellation.
          </T>
          <Stepper
            value={st.cancelLimit}
            min={3}
            max={7}
            onChange={(cancelLimit) =>
              change({ cancelLimit }, `Set the cancellation limit to ${cancelLimit}`)
            }
          />
        </Card>
      </Section>

      {manager ? (
        <>
          <Section title="Pricing and pay">
            <Card style={{ marginTop: 0 }}>
              <Field
                label="Delivery fee in naira"
                value={fee}
                onChangeText={setFee}
                keyboardType="number-pad"
              />
              <Field
                label="Rider pay per delivery in naira"
                value={pay}
                onChangeText={setPay}
                keyboardType="number-pad"
              />
              {payTooHigh ? (
                <T v="small" style={{ marginTop: 6 }}>
                  Rider pay can’t be more than the delivery fee.
                </T>
              ) : null}
              <Button
                label="Save prices"
                style={{ marginTop: 14, alignSelf: "flex-start" }}
                disabled={!feeN || !payN || payTooHigh || (feeN === st.fee && payN === st.riderPay)}
                onPress={() => {
                  change(
                    { fee: feeN, riderPay: payN },
                    `Changed the delivery fee to ${naira(feeN)} and rider pay to ${naira(payN)}`,
                  );
                  toast("Prices saved. New orders use them straight away.");
                }}
              />
              <T v="small" muted style={{ marginTop: 8 }}>
                Orders already placed keep their price.
              </T>
            </Card>
          </Section>
          <Section title="Restaurant contact">
            <Card style={{ marginTop: 0 }}>
              <Field
                label="WhatsApp number for “Contact the restaurant”"
                value={wa}
                onChangeText={setWa}
                keyboardType="phone-pad"
                hint="With the country code, for example 2349095466063."
              />
              <Button
                label="Save number"
                style={{ marginTop: 14, alignSelf: "flex-start" }}
                disabled={!waOk || wa === st.whatsapp}
                onPress={() => {
                  const n = wa.replace(/\D/g, "");
                  change({ whatsapp: n }, `Changed the restaurant WhatsApp number to +${n}`);
                  toast("The customer app uses the new number straight away");
                }}
              />
            </Card>
          </Section>
          <Section title="Tablet sign-out">
            <Card style={{ marginTop: 0 }}>
              <SwitchRow
                label="Sign out the tablet automatically at 8:30 pm"
                hint="It waits until every order placed before 8:30 pm is collected, delivered, or cancelled."
                value={st.autoSignOut}
                onChange={(autoSignOut) => (
                  change(
                    { autoSignOut },
                    autoSignOut
                      ? "Turned on the tablet’s automatic sign-out at 8:30 pm"
                      : "Turned off the tablet’s automatic sign-out at 8:30 pm",
                  ),
                  toast(autoSignOut ? "Automatic sign-out on" : "Automatic sign-out off")
                )}
              />
            </Card>
          </Section>
        </>
      ) : null}
    </Page>
  );
}
