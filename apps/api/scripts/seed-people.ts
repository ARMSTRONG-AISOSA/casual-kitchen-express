// Adds the demo staff (the same people as the Business app's demo data) to the database, with their
// sign-in. Safe to run again. Emails use the reserved example.com domain, so nothing can reach a real
// person (architecture.md 12).
// Run with `npm run db:seed-people --workspace @cke/api`.
//
// Staff with a username get the demo password below. Managers sign in with Google (12.1), so they
// get no password, except on the development laptop, where the API tests sign in as the owner: run
// with SEED_MANAGER_PASSWORDS=1 to give the managers usernames (owner.m, ivie.m) and the same demo
// password. Never use that flag for the deployed database.
//
// The owner (M-001) is the person in OWNER_GOOGLE_EMAIL and OWNER_NAME (scripts/owner.ts). Their
// Google sign-in links to M-001 at the first try. After that the owner keeps their own name and
// profile: re-running this seed only keeps the email and the role.
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "../src/auth/password";
import { STAFF_EMAIL_DOMAIN } from "../src/auth/staff-email";
import * as t from "../src/db/schema";
import { OWNER } from "./owner";

export const DEMO_PASSWORD = "cke-demo-2026";
const managerPasswords = process.env.SEED_MANAGER_PASSWORDS === "1";
const MANAGER_USERNAMES: Record<string, string> = { "M-001": "owner.m", "M-002": "ivie.m" };

import { PEOPLE } from "./people";
export { PEOPLE };

const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

for (const person of PEOPLE) {
  const [code, , role, , , , staffUsername] = person;
  const owner = OWNER?.code === code ? OWNER : null;
  // The configured owner replaces the demo owner's details (only used when the account is made).
  const [, name, , job, phone, gender] = owner
    ? [code, owner.name, role, "Owner", null, null]
    : person;
  const username = staffUsername ?? (managerPasswords ? MANAGER_USERNAMES[code] : undefined);
  const userId = `staff-${code}`;
  const email = owner?.email ?? `${code.toLowerCase()}${STAFF_EMAIL_DOMAIN}`;
  const login = { username: username ?? null, displayUsername: username ?? null, role };
  await db
    .insert(t.user)
    .values({ id: userId, name, email, emailVerified: !!owner, ...login, isDemo: !owner })
    .onConflictDoUpdate({
      target: t.user.id,
      // The owner keeps the name they set; their email is the configured one.
      set: owner ? { ...login, email, emailVerified: true, isDemo: false } : { name, ...login },
    });
  await db
    .insert(t.staffProfile)
    .values({
      userId,
      code,
      fullName: name,
      role,
      jobTitle: job,
      phone,
      gender,
      isOwner: code === "M-001",
      mustChangePassword: false,
      status: code === "R-004" ? "deactivated" : "active",
    })
    .onConflictDoUpdate({
      target: t.staffProfile.userId,
      // Seeded staff go back to how they started (Reset demo data, MGR-29); the owner keeps theirs.
      set: owner
        ? { role, isOwner: true, status: "active" }
        : {
            fullName: name,
            role,
            jobTitle: job,
            phone,
            gender,
            mustChangePassword: false,
            status: code === "R-004" ? "deactivated" : "active",
          },
    });
  // The demo password, as a Better Auth "credential" account (PBKDF2, src/auth/password.ts).
  await db
    .delete(t.account)
    .where(and(eq(t.account.userId, userId), eq(t.account.providerId, "credential")));
  if (username)
    await db.insert(t.account).values({
      id: `credential-${code}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(DEMO_PASSWORD),
    });
}
console.log(
  `${PEOPLE.length} staff ready. Demo password for usernames: ${DEMO_PASSWORD}` +
    (managerPasswords ? " (managers included: owner.m, ivie.m)." : " (managers use Google).") +
    (OWNER ? " The owner (M-001) signs in with the configured Google email." : ""),
);
await client.end();
