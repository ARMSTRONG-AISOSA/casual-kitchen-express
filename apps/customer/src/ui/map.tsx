import { fontFamily } from "@cke/brand-tokens";
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type LngLat,
} from "@maplibre/maplibre-react-native";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { KITCHEN, type LatLng } from "../data/geo";
import { useTheme } from "../state/theme";

// The customer's map (architecture.md 7.4 and 14.3, design.md 4.4): MapLibre with OpenFreeMap
// tiles, which need no account or key. A light, muted style (dark in the dark theme), a Tomato Red
// pin for the kitchen, a charcoal rider marker, and a yellow pin with a charcoal outline for the
// customer. The rider's marker jumps to each new position (about every 45 seconds), without
// animation, to keep the phone cool. The credit is always visible under the map.

const STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const CREDIT_URL = "https://www.openstreetmap.org/copyright";

const lngLat = (p: LatLng): LngLat => [p.lng, p.lat];

/** A box around the points, a little wider so the markers aren't on the edge. */
function boundsOf(points: LatLng[]): [number, number, number, number] {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const pad = 0.002;
  return [
    Math.min(...lngs) - pad,
    Math.min(...lats) - pad,
    Math.max(...lngs) + pad,
    Math.max(...lats) + pad,
  ];
}

export function CkeMap({
  pin,
  rider,
  boundary,
  onPick,
  focus,
  label,
  height = 240,
}: {
  /** The customer's address. */
  pin?: LatLng;
  /** The rider's last position, while the order is on the way. */
  rider?: LatLng | null;
  /** The delivery boundary to draw ([lng, lat] points), when picking a pin. */
  boundary?: [number, number][];
  /** Tapping the map moves the pin here. */
  onPick?: (p: LatLng) => void;
  /** When this changes, the map moves to the pin (a new area was picked). */
  focus?: string;
  label: string;
  height?: number;
}) {
  const t = useTheme();
  const camera = useRef<CameraRef>(null);
  const picking = !!onPick;

  // Picking: follow the pin when a new area is chosen, not on every tap.
  useEffect(() => {
    if (picking && pin) camera.current?.easeTo({ center: lngLat(pin), zoom: 14.5, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the area changes
  }, [focus]);

  // Tracking: keep the kitchen, the rider, and the address in view as the rider moves.
  const riderKey = rider ? `${rider.lat},${rider.lng}` : "";
  useEffect(() => {
    if (picking) return;
    const points = [KITCHEN, ...(pin ? [pin] : []), ...(rider ? [rider] : [])];
    camera.current?.fitBounds(boundsOf(points), {
      padding: { top: 36, right: 36, bottom: 36, left: 36 },
      duration: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the rider's position as a string
  }, [picking, riderKey, pin?.lat, pin?.lng]);

  const outline = boundary?.length
    ? {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Polygon" as const, coordinates: [[...boundary, boundary[0]!]] },
      }
    : null;

  return (
    <View style={[styles.wrap, { borderColor: t.line }]}>
      <View style={{ height }} accessible accessibilityLabel={label}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={t.mode === "dark" ? STYLE.dark : STYLE.light}
          attribution={false}
          logo={false}
          compass={false}
          touchRotate={false}
          touchPitch={false}
          onPress={
            onPick
              ? (e) => {
                  const [lng, lat] = e.nativeEvent.lngLat;
                  onPick({ lat, lng });
                }
              : undefined
          }
        >
          <Camera
            ref={camera}
            initialViewState={
              picking && pin
                ? { center: lngLat(pin), zoom: 14.5 }
                : { bounds: boundsOf([KITCHEN, ...(pin ? [pin] : [])]) }
            }
            minZoom={10}
            maxZoom={18}
          />
          {outline ? (
            <GeoJSONSource id="boundary" data={outline}>
              <Layer
                type="fill"
                id="boundary-fill"
                paint={{ "fill-color": t.accent, "fill-opacity": 0.07 }}
              />
              <Layer
                type="line"
                id="boundary-line"
                paint={{ "line-color": t.accent, "line-width": 2, "line-dasharray": [3, 2] }}
              />
            </GeoJSONSource>
          ) : null}
          <Marker id="kitchen" lngLat={lngLat(KITCHEN)} anchor="center">
            <View style={styles.kitchen} accessibilityLabel="The kitchen" />
          </Marker>
          {pin ? (
            <Marker id="pin" lngLat={lngLat(pin)} anchor="bottom">
              <Svg width={26} height={34} viewBox="0 0 26 34">
                <Path
                  d="M13 32 L4 18 A11 11 0 1 1 22 18 Z"
                  fill="#F2B544"
                  stroke="#292522"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </Svg>
            </Marker>
          ) : null}
          {rider ? (
            <Marker id="rider" lngLat={lngLat(rider)} anchor="center">
              <View style={styles.rider} accessibilityLabel="Your rider" />
            </Marker>
          ) : null}
        </Map>
      </View>
      <Text
        style={[styles.credit, { color: t.muted }]}
        onPress={() => void Linking.openURL(CREDIT_URL)}
        accessibilityRole="link"
      >
        OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  credit: { fontFamily: fontFamily.body, fontSize: 11, paddingHorizontal: 10, paddingVertical: 6 },
  kitchen: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#C83F2D",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  rider: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#292522",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
});
