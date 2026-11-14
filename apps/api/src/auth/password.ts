// Staff password hashing (architecture.md 12.1 and 12.2). PBKDF2-SHA-256 through the Workers'
// native Web Crypto, at 30,000 iterations: measured at about 5 ms of CPU on Cloudflare's free plan
// (14 November 2026), which leaves room under the 10 ms limit for the rest of a sign-in. Better
// Auth's default (scrypt) is too slow for Workers. Stored as
// "pbkdf2-sha256$<iterations>$<salt base64>$<hash base64>", so the count can change later without
// breaking existing passwords.

export const PBKDF2_ITERATIONS = 30_000;
const PREFIX = "pbkdf2-sha256";

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `${PREFIX}$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const [prefix, iter, salt, expected] = hash.split("$");
  const iterations = Number(iter);
  // The Workers runtime refuses more than 100,000 iterations (12.2).
  if (prefix !== PREFIX || !salt || !expected || !(iterations > 0 && iterations <= 100_000))
    return false;
  const actual = await derive(password, unb64(salt), iterations);
  const want = unb64(expected);
  if (actual.length !== want.length) return false;
  // Compare every byte, so the time taken doesn't reveal how much matched.
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= actual[i]! ^ want[i]!;
  return diff === 0;
}
