import { router } from "expo-router";
import { Navigation, Phone } from "lucide-react-native";
import { Linking } from "react-native";
import { useStore } from "../src/state/store";
import { Button, Card, KV, Screen, T, TopBar } from "../src/ui/kit";
import { useToast } from "../src/ui/toast";
import { toDeliveries } from "../src/nav";

// Drop-off (RID-08, RID-09). No map in the app: Navigate hands the address to the rider's own
// navigation app, which saves battery and keeps the phone cool (architecture.md 7.2).
export default function DropOff() {
  const { s } = useStore();
  const toast = useToast();
  const o = s.carrying[0];
  if (!o) {
    return (
      <Screen
        header={<TopBar title="Drop-off" onBack={toDeliveries} />}
        footer={<Button label="My deliveries" onPress={toDeliveries} />}
      >
        <T>Nothing to drop off.</T>
      </Screen>
    );
  }
  const navigate = () => {
    // geo: lets the phone offer Google Maps, Waze, or any navigation app installed. Live, the
    // customer's own pin is more exact than the street name.
    const to = o.pin
      ? `geo:${o.pin.lat},${o.pin.lng}?q=${o.pin.lat},${o.pin.lng}(${encodeURIComponent(o.no)})`
      : `geo:0,0?q=${encodeURIComponent(o.address)}`;
    Linking.openURL(to).catch(() => toast("No navigation app found on this phone"));
  };
  // Demo: the customers are made up, so the call isn't placed. The real app opens the phone's dialer.
  const call = () => toast(`In the real app this calls ${o.customer}`);
  return (
    <Screen
      header={<TopBar title={o.area} onBack={toDeliveries} />}
      footer={
        <>
          <Button label="Enter code" onPress={() => router.push("/code")} />
          <Button label="Need help" variant="alt" onPress={() => router.push("/help")} />
        </>
      }
    >
      <Card strong>
        <KV k="Order" v={o.no} />
        <KV k="Landmark" v={o.landmark} />
        <KV k="Customer" v={o.customer} />
      </Card>
      {o.arriving ? (
        <T muted style={{ marginTop: 10 }}>
          You’re nearly there. {o.customer || "The customer"} has been told you’re arriving.
        </T>
      ) : null}
      {s.live && s.locationDenied ? (
        <T muted style={{ marginTop: 10 }}>
          Location is off for CKE, so your customer can’t see you on the map. You can still deliver
          with their code. To turn it on: Settings, Apps, CKE Rider, Location.
        </T>
      ) : null}
      <Button
        label="Navigate"
        variant="alt"
        icon={(c) => <Navigation size={26} color={c} strokeWidth={2.5} />}
        onPress={navigate}
        style={{ marginTop: 14 }}
      />
      <Button
        label={`Call ${o.customer}`}
        variant="alt"
        icon={(c) => <Phone size={26} color={c} strokeWidth={2.5} />}
        onPress={call}
        style={{ marginTop: 10 }}
      />
    </Screen>
  );
}
