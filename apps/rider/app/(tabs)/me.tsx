import { router } from "expo-router";
import { Button, Card, KV, Screen, T, TopBar } from "../../src/ui/kit";
import { PreviewTools } from "../../src/ui/preview-tools";
import { useRider } from "../../src/state/session";

// My profile (RID-21): read-only details from the manager. No photo, to keep the app image-free.
export default function Me() {
  const rider = useRider();
  return (
    <Screen tabs header={<TopBar title="Me" />}>
      <Card strong>
        <KV k="Name" v={rider.name} />
        <KV k="Staff ID" v={rider.staffId} />
        <KV k="Job title" v={rider.job} />
        <KV k="Phone" v={rider.phone} />
        <KV k="Home address" v={rider.home || "Not given"} />
        <KV k="Gender" v={rider.gender || "Not given"} />
      </Card>
      <T muted style={{ marginTop: 10 }}>
        To change any of this, ask your manager.
      </T>
      <Button
        label="Settings"
        variant="alt"
        onPress={() => router.push("/settings")}
        style={{ marginTop: 16 }}
      />
      {__DEV__ ? <PreviewTools /> : null}
    </Screen>
  );
}
