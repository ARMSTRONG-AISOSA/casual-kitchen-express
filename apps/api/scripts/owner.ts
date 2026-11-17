// The owner's account (architecture.md 3): the first manager, staff ID M-001, set up from
// configuration with the owner's Google email, so the email never sits in the repository.
// Read from the environment, or else from apps/api/.dev.vars on the laptop:
//   OWNER_GOOGLE_EMAIL  the owner's Google email (empty: M-001 stays the demo owner, Efosa)
//   OWNER_NAME          the name shown for the owner (only used when the account is first made)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function devVar(name: string): string | undefined {
  const file = join(import.meta.dirname, "..", ".dev.vars");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  return (
    line
      ?.slice(name.length + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1") || undefined
  );
}

const email = (process.env.OWNER_GOOGLE_EMAIL ?? devVar("OWNER_GOOGLE_EMAIL"))?.toLowerCase();

/** The configured owner, or null when M-001 is the demo owner. */
export const OWNER = email
  ? { code: "M-001", email, name: process.env.OWNER_NAME ?? devVar("OWNER_NAME") ?? "Owner" }
  : null;
