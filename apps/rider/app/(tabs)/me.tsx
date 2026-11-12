import { router } from "expo-router";
import { RIDER } from "../../src/data/orders";
import { Button, Card, KV, Screen, T, TopBar } from "../../src/ui/kit";
import { PreviewTools } from "../../src/ui/preview-tools";

// My profile (RID-21): read-only details from the manager. No photo, to keep the app image-free.
export default function Me() {
  return (
    <Screen tabs header={<TopBar title="Me" />}>
      <Card strong>
        <KV k="Name" v={RIDER.name} />
        <KV k="Staff ID" v={RIDER.staffId} />
        <KV k="Job title" v={RIDER.job} />
        <KV k="Phone" v={RIDER.phone} />
        <KV k="Home address" v={RIDER.home} />
        <KV k="Gender" v={RIDER.gender} />
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
