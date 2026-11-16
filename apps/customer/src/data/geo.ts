import { AREA_CENTRES, DELIVERY_BOUNDARY, KITCHEN_PIN } from "@cke/validation";

// Places on the real map (build step 6d), in latitude and longitude: the owner's kitchen pin and
// delivery boundary, and each area's centre (packages/validation). The boundary the API checks is
// the one in Settings, which `/bootstrap` sends; this copy is for before it loads and the demo.
export type LatLng = { lat: number; lng: number };

export const KITCHEN: LatLng = KITCHEN_PIN;

/** Where the pin starts when an area is picked. */
export const AREA_CENTRE: Record<string, LatLng> = AREA_CENTRES;

/** The delivery range ([lng, lat] points, the map's order): Uselu to Oluku. */
export const DEFAULT_BOUNDARY: [number, number][] = DELIVERY_BOUNDARY;

/** A pin beyond Oluku Market, for the out-of-range example. */
export const OUTSIDE_EXAMPLE: LatLng = { lat: 6.492, lng: 5.528 };

/** Whether a pin is inside the boundary ([lng, lat] points). */
export function inRange(
  { lat, lng }: LatLng,
  poly: [number, number][] = DEFAULT_BOUNDARY,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The area whose centre is nearest a point: the first guess after "Use my current location". */
export function nearestArea(p: LatLng): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const [name, c] of Object.entries(AREA_CENTRE)) {
    const d = (c.lat - p.lat) ** 2 + ((c.lng - p.lng) * Math.cos((p.lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}
