import { signOut as endSession } from "../src/state/session";
import { useStore } from "../src/state/store";
import { Button, Screen, Segmented, SwitchRow, T, TopBar } from "../src/ui/kit";

// Settings (RID-22): theme, and sound and vibration for alerts.
export default function Settings() {
  const { s, set } = useStore();
  const signOut = () => void endSession(set);
  return (
    <Screen
      header={<TopBar title="Settings" back />}
      footer={<Button label="Sign out" variant="alt" onPress={signOut} />}
    >
      <T v="h2" style={{ marginTop: 6, marginBottom: 10 }}>
        Theme
      </T>
      <Segmented
        label="Theme"
        options={[
          ["light", "Light"],
          ["dark", "Dark"],
          ["system", "Follow phone"],
        ]}
        value={s.themePref}
        onChange={(themePref) => set({ themePref })}
      />
      <T v="small" muted style={{ marginTop: 8 }}>
        Light is easiest to read in the sun. Dark saves battery on some phones.
      </T>
      <T v="h2" style={{ marginTop: 24 }}>
        Alerts
      </T>
      <SwitchRow label="Sound" value={s.sound} onChange={(sound) => set({ sound })} />
      <SwitchRow label="Vibration" value={s.vibrate} onChange={(vibrate) => set({ vibrate })} />
      <T v="small" muted style={{ marginTop: 8 }}>
        For new orders and orders dispatch gives you. The sound plays with notifications while the
        app is in the background; vibration works with the app open too.
      </T>
    </Screen>
  );
}
