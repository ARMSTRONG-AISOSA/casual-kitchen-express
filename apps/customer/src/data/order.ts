// Order statuses as the customer sees them (architecture.md 4.1 and 4.2), each with a mock number of
// minutes after the order was placed. The screen shows them as clock times, such as “12:47 pm”.
export const DELIVERY_STEPS: [string, number][] = [
  ["Order placed", 0],
  ["Payment confirmed", 0],
  ["The kitchen has your order", 2],
  ["Preparing your food", 3],
  ["Packed and waiting for a rider", 16],
  ["Rider assigned: Musa", 18],
  ["On the way", 21],
  ["Arriving soon. Have your code ready.", 34],
  ["Delivered", 37],
];

export const PICKUP_STEPS: [string, number][] = [
  ["Order placed", 0],
  ["Payment confirmed", 0],
  ["The kitchen has your order", 2],
  ["Preparing your food", 3],
  ["Ready for collection", 16],
  ["Collected", 24],
];

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Changed my mind",
  "Wrong address or details",
  "Taking too long",
  "Something else",
];

/** Mock delivery code. The real one is made by the API and stored hashed (4.4). */
export const DEMO_DELIVERY_CODE = "4827";

export const WHATSAPP_URL = "https://wa.me/2349095466063";

/** A clock time in the app’s style, such as “7:05 am”. */
export function clockTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
