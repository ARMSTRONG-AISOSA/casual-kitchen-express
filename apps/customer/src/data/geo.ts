// Stand-in delivery boundary on the drawn map (a 320 × 240 box), Uselu at the bottom and
// Oluku Market at the top. The real check runs on the API against the polygon in Settings (4.7).
export type Point = [number, number];

export const BOUNDARY: Point[] = [
  [12, 218],
  [150, 218],
  [300, 98],
  [304, 42],
  [236, 30],
  [12, 150],
];

export const KITCHEN: Point = [110, 170];

export function inRange([x, y]: Point, poly: Point[] = BOUNDARY): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
