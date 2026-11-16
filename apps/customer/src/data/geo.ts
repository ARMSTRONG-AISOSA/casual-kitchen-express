// Places on the real map (build step 6d), in latitude and longitude. The kitchen and the area
// centres match the API's (orders/riders.ts and the demo history). The delivery boundary is the
// one in Settings once the owner draws it (architecture.md 4.7); until then the app uses the rough
// outline below, from Uselu to Oluku Market, and the API checks the area is in range.
export type LatLng = { lat: number; lng: number };

export const KITCHEN: LatLng = { lat: 6.4013, lng: 5.6145 };

/** Approximate centres of the delivery areas: where the pin starts when an area is picked. */
export const AREA_CENTRE: Record<string, LatLng> = {
  Ugbowo: { lat: 6.4015, lng: 5.61 },
  Ekosodin: { lat: 6.4065, lng: 5.6185 },
  "BDPA estate": { lat: 6.411, lng: 5.604 },
  Osasogie: { lat: 6.3925, lng: 5.625 },
  Uselu: { lat: 6.38, lng: 5.6165 },
  Uwelu: { lat: 6.377, lng: 5.595 },
  Isihor: { lat: 6.423, lng: 5.588 },
  Idunmwowina: { lat: 6.438, lng: 5.572 },
  Iguosa: { lat: 6.452, lng: 5.559 },
  "Oluku (up to Oluku Market)": { lat: 6.466, lng: 5.547 },
};

/**
 * A rough outline of the delivery range ([lng, lat] points, the map's order): Uselu at the city
 * end, along the Benin–Lagos road, up to Oluku Market. Only until the real boundary is drawn.
 */
export const APPROX_BOUNDARY: [number, number][] = [
  [5.585, 6.366],
  [5.635, 6.37],
  [5.638, 6.4],
  [5.63, 6.415],
  [5.565, 6.47],
  [5.548, 6.478],
  [5.536, 6.468],
  [5.575, 6.425],
  [5.58, 6.395],
];

/** A pin beyond Oluku Market, for the out-of-range example. */
export const OUTSIDE_EXAMPLE: LatLng = { lat: 6.492, lng: 5.528 };

/** Whether a pin is inside the boundary ([lng, lat] points). */
export function inRange({ lat, lng }: LatLng, poly: [number, number][] = APPROX_BOUNDARY): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
