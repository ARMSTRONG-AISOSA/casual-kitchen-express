import { exports } from "cloudflare:workers";

// Signs a seeded demo account in (scripts/seed-people.ts) and returns its session cookie. The tests
// need the local database seeded with `SEED_MANAGER_PASSWORDS=1 npm run db:seed-people`, so the
// managers have usernames there (on a deployed database they sign in with Google only).
export const DEMO_PASSWORD = "cke-demo-2026";

export async function signIn(username: string, password = DEMO_PASSWORD): Promise<string> {
  const res = await exports.default.fetch("http://example.com/api/auth/sign-in/username", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "cke-business://",
      // Sign-in is limited to 5 tries a minute per address (src/auth/auth.ts), so each test
      // sign-in comes from its own address in the range reserved for documentation (RFC 5737).
      "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 254) + 1}`,
    },
    body: JSON.stringify({ username, password }),
  });
  if (res.status !== 200) throw new Error(`Sign-in failed for ${username}: ${await res.text()}`);
  await res.body?.cancel();
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
