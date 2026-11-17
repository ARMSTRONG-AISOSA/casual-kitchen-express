// Reset demo data (MGR-29, owner decisions 17 November 2026). Every order and money record goes,
// including testers' orders; staff a manager added are removed; and the menu, prices, soups,
// settings, staff, photos, and the three months of history go back to the start. Testers keep
// their accounts and addresses. Each step is written to the demo_reset row and announced through
// the API, so Demo controls shows progress.
//
// Started by the API through a runner (src/demo/reset.ts): GitHub Actions online, or
// `npm run demo:runner` on the laptop. It can also be run by hand:
//   npm run demo:reset --workspace @cke/api
// Settings come from the environment, or else apps/api/.dev.vars on the laptop:
//   DATABASE_URL            the database (the laptop's by default)
//   DEMO_RESET_NOTIFY_URL   the API's /demo/reset-all/notify (the laptop's API by default)
//   DEMO_RESET_SECRET       the same secret the API has
//   MEDIA_UPLOAD_URL        where photos go (next to the notify address, through the API)
//   SEED_MANAGER_PASSWORDS=1  the laptop only: managers keep their usernames for the API tests
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as t from "../src/db/schema";
import { RESET_STEPS } from "../src/demo/reset";
import { devVar } from "./owner";
import { PEOPLE } from "./people";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const notifyUrl =
  process.env.DEMO_RESET_NOTIFY_URL ?? "http://127.0.0.1:8787/demo/reset-all/notify";
const secret = process.env.DEMO_RESET_SECRET ?? devVar("DEMO_RESET_SECRET") ?? "";
// The photo step uploads through the API (scripts/seed-media.ts), next to the notify address.
process.env.DEMO_RESET_SECRET = secret;
process.env.MEDIA_UPLOAD_URL ??= notifyUrl.replace(/\/notify$/, "/media");

const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

/** Tells the API to pass the state on to Demo controls. A missed one only delays the screen. */
async function notify() {
  if (!secret) return;
  try {
    await fetch(notifyUrl, { method: "POST", headers: { "x-demo-reset-secret": secret } });
  } catch {
    // The API may be asleep or unreachable; Demo controls reads the state when it opens.
  }
}

async function setState(values: Partial<typeof t.demoReset.$inferInsert>) {
  await db
    .insert(t.demoReset)
    .values({ id: 1, steps: RESET_STEPS.length, ...values })
    .onConflictDoUpdate({ target: t.demoReset.id, set: values });
  await notify();
}

async function step(n: number) {
  console.log(`${n}/${RESET_STEPS.length} ${RESET_STEPS[n - 1]}`);
  // Run by hand (not through the API), the reset marks its own start.
  const [r] = await db.select().from(t.demoReset).where(eq(t.demoReset.id, 1));
  const start =
    n === 1 && r?.status !== "running" ? { startedAt: new Date(), startedBy: null } : {};
  await setState({
    status: "running",
    step: n - 1,
    label: RESET_STEPS[n - 1],
    ...start,
    ...(n === 1 ? { error: null, finishedAt: null } : {}),
  });
}

/** Runs one of the seed scripts, with this process's settings. */
function seed(script: string) {
  const r = spawnSync(process.execPath, ["--import", "tsx", join(here, script)], {
    cwd: join(here, ".."),
    env: process.env,
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`${script} didn’t finish`);
}

/** Step 1: every order and money record, and the staff a manager added. */
async function clearOrdersAndMoney() {
  const seeded = PEOPLE.map(([code]) => code);
  await db.transaction(async (tx) => {
    // Children of orders first (lines, payments, and status events go with the order).
    for (const table of [
      t.alert,
      t.helpRequest,
      t.cancellationRequest,
      t.refund,
      t.rating,
      t.delivery,
      t.adjustment, // points at orders and cash-ups
    ])
      await tx.delete(table);
    await tx.delete(t.order);
    for (const table of [
      t.payout,
      t.cashUp,
      t.monthClose,
      t.auditLog,
      t.notification,
      t.hoursOverride,
    ])
      await tx.delete(table);
    await tx
      .update(t.riderState)
      .set({ online: false, capacityBudget: null, lat: null, lng: null, locatedAt: null });

    // Staff a manager added: not in the starting list. Their sign-ins go with them.
    const added = await tx
      .select({ userId: t.staffProfile.userId })
      .from(t.staffProfile)
      .where(notInArray(t.staffProfile.code, seeded));
    const ids = added.map((a) => a.userId);
    if (ids.length) {
      await tx
        .update(t.mediaAsset)
        .set({ ownerId: null })
        .where(inArray(t.mediaAsset.ownerId, ids));
      await tx.delete(t.riderState).where(inArray(t.riderState.userId, ids));
      await tx.delete(t.staffProfile).where(inArray(t.staffProfile.userId, ids));
      await tx.delete(t.user).where(inArray(t.user.id, ids)); // sessions, accounts, tokens cascade
    }
  });
}

try {
  await step(1);
  await clearOrdersAndMoney();
  await step(2);
  seed("seed-base.ts");
  await step(3);
  seed("seed-people.ts");
  await step(4);
  seed("seed-media.ts");
  await step(5);
  seed("seed-history.ts");
  await setState({
    status: "idle",
    step: RESET_STEPS.length,
    label: "Done",
    finishedAt: new Date(),
    error: null,
  });
  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from "order"`))
    .rows as [{ n: number }];
  console.log(`Reset finished: ${n} orders of history.`);
} catch (e) {
  // The database's own reason is on `cause` for a failed query.
  const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : null;
  const message = cause ?? (e instanceof Error ? e.message.split("\n")[0] : String(e));
  console.error(`Reset failed: ${message}`);
  await setState({
    status: "failed",
    error: `The reset stopped (${message}). Try again.`,
    finishedAt: new Date(),
  }).catch(() => undefined);
  await client.end();
  process.exit(1);
}
await client.end();
