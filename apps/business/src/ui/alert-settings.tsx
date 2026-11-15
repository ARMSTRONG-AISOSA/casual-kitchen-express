import {
  ALERT_SETTINGS_USUAL,
  ALERT_TIMERS,
  ALERT_TIMER_KEYS,
  alertChanges,
  type AlertSettings,
} from "@cke/validation";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { alertSoundAllowed, prepareAlertSound } from "../alert-sound";
import { actorLabel, clock, log, useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { Button, Card, KV, Section, Sheet, SwitchRow, T } from "./kit";
import { Slider } from "./slider";

// Settings, Alerts (MGR-14, owner decision 15 November 2026; design.md 7.2). Dispatch officers and
// managers choose whether the Business app beeps when an alert opens, and how many minutes an
// order can sit in each stage before it does, each within its range. Nothing changes until Save;
// then a dialog confirms what was saved, the audit log records it, and the section shows who
// changed it last and when.

const same = (a: AlertSettings, b: AlertSettings) => !alertChanges(a, b).length;
const when = (ms: number) =>
  `${new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${clock(ms)}`;

export function AlertSettingsSection() {
  const { s, set } = useStore();
  const t = useTheme();
  const st = s.settings;
  const [draft, setDraft] = useState<AlertSettings>(st.alerts);
  const [saved, setSaved] = useState<AlertSettings | null>(null);
  // Whether Android lets the app make sound (false when CKE Kitchen's notifications are off).
  const [allowed, setAllowed] = useState(true);
  // Back to what's saved when the saved settings change elsewhere (another save, a demo reset).
  const [base, setBase] = useState(st.alerts);
  if (base !== st.alerts) {
    setBase(st.alerts);
    setDraft(st.alerts);
  }
  const dirty = !same(draft, st.alerts);

  // Checked on opening and whenever the app comes back, for example from Android's settings.
  useEffect(() => {
    const look = () => void alertSoundAllowed().then(setAllowed);
    look();
    const sub = AppState.addEventListener("change", (x) => x === "active" && look());
    return () => sub.remove();
  }, []);

  const save = () => {
    const was = st.alerts;
    const now = draft;
    set((x) => ({
      settings: {
        ...x.settings,
        alerts: now,
        alertsSavedAt: Date.now(),
        alertsSavedBy: x.userId ?? undefined,
      },
      ...log(x, "setting", `Changed the alert settings: ${alertChanges(was, now).join(", ")}`),
    }));
    setSaved(now);
    if (now.sound) void prepareAlertSound().then(setAllowed);
  };

  return (
    <Section title="Alerts">
      <Card style={{ marginTop: 0 }}>
        <SwitchRow
          label="Beep when an alert opens"
          hint="Once per alert, on every screen that shows Alerts: kitchen, dispatch, and managers. It sounds even when the screen is off."
          value={draft.sound}
          onChange={(sound) => setDraft((d) => ({ ...d, sound }))}
        />
        {draft.sound && !allowed ? (
          <T v="small" color={t.danger} style={{ marginTop: 8 }}>
            Notifications are off for CKE Kitchen on this tablet, so it can’t beep. Turn them on in
            the tablet’s Settings, Apps, CKE Kitchen, Notifications.
          </T>
        ) : null}
        <T v="small" muted style={{ marginTop: 12 }}>
          An alert opens when an order waits longer than these times. Slide, or use − and + for one
          minute at a time.
        </T>
        {ALERT_TIMER_KEYS.map((k) => (
          <Slider
            key={k}
            label={ALERT_TIMERS[k].label}
            hint={`${capital(ALERT_TIMERS[k].from)}. Usual ${ALERT_TIMERS[k].usual} min.`}
            value={draft[k]}
            min={ALERT_TIMERS[k].min}
            max={ALERT_TIMERS[k].max}
            unit="min"
            onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
          />
        ))}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            marginTop: 16,
          }}
        >
          <Button label="Save alert settings" disabled={!dirty} onPress={save} />
          {dirty ? (
            <Button label="Undo changes" variant="ghost" onPress={() => setDraft(st.alerts)} />
          ) : null}
          {!same(draft, ALERT_SETTINGS_USUAL) ? (
            <Button
              label="Use the usual times"
              variant="ghost"
              onPress={() => setDraft({ ...ALERT_SETTINGS_USUAL, sound: draft.sound })}
            />
          ) : null}
        </View>
        <T v="small" muted style={{ marginTop: 10 }}>
          {dirty
            ? "Not saved yet."
            : st.alertsSavedAt
              ? `Last changed ${when(st.alertsSavedAt)} by ${actorLabel(s, st.alertsSavedBy)}.`
              : "Not changed yet. These are the usual times."}
        </T>
      </Card>

      <Sheet visible={!!saved} onClose={() => setSaved(null)} title="Alert settings saved">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.success,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check color="#FFFFFF" size={26} strokeWidth={3} />
          </View>
          <T muted style={{ flex: 1 }}>
            Every tablet and phone uses the new settings straight away.
          </T>
        </View>
        {saved ? (
          <>
            <KV k="Beep" v={saved.sound ? "On" : "Off"} strong />
            {ALERT_TIMER_KEYS.map((k) => (
              <KV key={k} k={ALERT_TIMERS[k].label} v={`${saved[k]} min`} />
            ))}
          </>
        ) : null}
        <T v="small" muted style={{ marginTop: 10 }}>
          Recorded as {actorLabel(s)}, with the time.
        </T>
        <Button label="Done" style={{ marginTop: 16 }} onPress={() => setSaved(null)} />
      </Sheet>
    </Section>
  );
}

const capital = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
