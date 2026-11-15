// The 4-digit delivery code (architecture.md 4.4). The code is never stored as it is: it is worked
// out from the order's ID with a keyed hash (HMAC-SHA-256 with the API's secret), so the customer's
// tracking screen can show it at any time, and only a hash of it is kept on the order to check
// what the rider enters. Wrong attempts are counted on the order and limited.

const enc = new TextEncoder();

async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

/** The order's delivery code, from 0000 to 9999. */
export async function deliveryCode(secret: string, orderId: string) {
  const mac = await hmac(secret, `cke-delivery-code:${orderId}`);
  const n = ((mac[0]! << 24) | (mac[1]! << 16) | (mac[2]! << 8) | mac[3]!) >>> 0;
  return String(n % 10_000).padStart(4, "0");
}

/** The hash kept on the order, so a database copy alone doesn't reveal codes. */
export async function codeHash(orderId: string, code: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${orderId}:${code}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The most wrong codes a rider can enter before they must ask for help (4.4). */
export const MAX_CODE_ATTEMPTS = 5;
