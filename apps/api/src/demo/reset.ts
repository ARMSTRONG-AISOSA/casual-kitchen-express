import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";

// Reset demo data (MGR-29, owner decisions 17 November 2026): every order and money record goes,
// including testers' orders, and the menu, prices, soups, settings, staff, photos, and the three
// months of history go back to the start. Testers keep their accounts and addresses.
//
// Rebuilding the history takes about 1.2 seconds of processing (measured 17 November 2026), and the
// Workers free plan allows about 10 ms per request, so the API doesn't do the work itself. It asks a
// runner to run `scripts/reset-demo.ts`, which reports each step back here:
// - online: GitHub Actions (`.github/workflows/reset-demo.yml`), started through GitHub's API;
// - on the laptop: `npm run demo:runner` (scripts/reset-runner.ts), a small local helper.

/** The steps, in order, as Demo controls shows them. */
export const RESET_STEPS = [
  "Clearing orders and money",
  "Menu, prices, soups, and settings",
  "Staff",
  "Photos",
  "Three months of history",
] as const;

/** A reset that hasn't finished within this long is treated as failed, so the app isn't stuck. */
const STUCK_MS = 30 * 60_000;

export type ResetState = {
  status: "idle" | "running" | "failed";
  step: number;
  steps: number;
  label: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  startedBy: string | null;
  error: string | null;
};

export async function resetState(db: Db): Promise<ResetState> {
  const [r] = await db.select().from(t.demoReset).where(eq(t.demoReset.id, 1));
  const stuck =
    r?.status === "running" && r.startedAt && Date.now() - r.startedAt.getTime() > STUCK_MS;
  return {
    status: stuck ? "failed" : (r?.status ?? "idle"),
    step: r?.step ?? 0,
    steps: r?.steps ?? RESET_STEPS.length,
    label: r?.label ?? null,
    startedAt: r?.startedAt?.toISOString() ?? null,
    finishedAt: r?.finishedAt?.toISOString() ?? null,
    startedBy: r?.startedBy ?? null,
    error: stuck ? "The reset didn’t finish. Try again." : (r?.error ?? null),
  };
}

/** True while a reset is running: new orders are refused, since the reset would wipe them. */
export async function resetting(db: Db) {
  return (await resetState(db)).status === "running";
}

/** Marks a reset as started. Returns false if one is already running. */
export async function claimReset(db: Db, staffCode: string | null) {
  if (await resetting(db)) return false;
  const values = {
    id: 1,
    status: "running" as const,
    step: 0,
    steps: RESET_STEPS.length,
    label: "Starting",
    startedAt: new Date(),
    finishedAt: null,
    startedBy: staffCode,
    error: null,
  };
  await db
    .insert(t.demoReset)
    .values(values)
    .onConflictDoUpdate({ target: t.demoReset.id, set: values });
  return true;
}

export async function failReset(db: Db, error: string) {
  await db
    .update(t.demoReset)
    .set({ status: "failed", error, finishedAt: new Date() })
    .where(eq(t.demoReset.id, 1));
}

/**
 * Starts the runner. Returns an error message when it can't be reached or isn't set up.
 * DEMO_RESET_RUNNER is "github" online, or the local helper's address on the laptop.
 */
export async function startRunner(env: Env): Promise<string | null> {
  const runner = env.DEMO_RESET_RUNNER;
  if (!runner || !env.DEMO_RESET_SECRET) return "Reset demo data isn’t set up on this server yet.";
  try {
    if (runner === "github") {
      if (!env.GITHUB_RESET_TOKEN) return "Reset demo data isn’t set up on this server yet.";
      const res = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/reset-demo.yml/dispatches`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.GITHUB_RESET_TOKEN}`,
            accept: "application/vnd.github+json",
            "user-agent": "cke-api",
            "x-github-api-version": "2022-11-28",
          },
          body: JSON.stringify({ ref: "main" }),
        },
      );
      return res.ok ? null : `GitHub didn’t start the reset (${res.status}).`;
    }
    const res = await fetch(runner, {
      method: "POST",
      headers: { "x-demo-reset-secret": env.DEMO_RESET_SECRET },
    });
    return res.ok ? null : `The reset helper refused (${res.status}).`;
  } catch {
    return "The reset helper can’t be reached. On the laptop, start it with npm run demo:runner.";
  }
}
