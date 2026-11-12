// Adds the demo staff (the same people as the Business app's demo data) to the database, so their
// photos and, next, their sign-in have somewhere to live. Safe to run again. Emails use the reserved
// example.com domain, so nothing can reach a real person (architecture.md 12).
// Run with `npm run db:seed-people --workspace @cke/api`.
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as t from "../src/db/schema";

type Gender = "female" | "male";
type R = "rider" | "kitchen" | "dispatch" | "accounts" | "manager";
export const PEOPLE: [string, string, R, string, string, Gender, string?][] = [
  ["M-001", "Efosa Igbinedion", "manager", "Owner", "0803 555 0100", "male"],
  ["M-002", "Ivie Osagie", "manager", "Operations manager", "0803 555 0101", "female"],
  ["K-001", "Blessing Okafor", "kitchen", "Head cook", "0806 555 0120", "female", "blessing.k"],
  ["K-002", "Samuel Eze", "kitchen", "Counter", "0806 555 0121", "male", "samuel.k"],
  ["D-001", "Osas Edo", "dispatch", "Dispatch officer", "0807 555 0130", "male", "osas.d"],
  ["A-001", "Ngozi Bello", "accounts", "Account officer", "0809 555 0140", "female", "ngozi.a"],
  ["R-001", "Musa Abdullahi", "rider", "Delivery rider", "0802 555 0177", "male", "musa.a"],
  ["R-002", "Chidi Nwosu", "rider", "Delivery rider", "0802 555 0178", "male", "chidi.r"],
  ["R-003", "Femi Ade", "rider", "Delivery rider", "0802 555 0179", "male", "femi.r"],
  ["R-004", "Uyi Ogbe", "rider", "Delivery rider", "0802 555 0180", "male", "uyi.r"],
];

const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

for (const [code, name, role, job, phone, gender, username] of PEOPLE) {
  const userId = `staff-${code}`;
  await db
    .insert(t.user)
    .values({
      id: userId,
      name,
      email: `${code.toLowerCase()}@staff.example.com`,
      username: username ?? null,
      role,
      isDemo: true,
    })
    .onConflictDoUpdate({ target: t.user.id, set: { name, username: username ?? null, role } });
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
      set: { fullName: name, role, jobTitle: job, phone, gender },
    });
}
console.log(`${PEOPLE.length} staff ready.`);
await client.end();
