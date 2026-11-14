import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import type { Actor } from "./actor";

/**
 * A customer's profile row (architecture.md 9: CustomerProfile), made the first time a customer is
 * seen after Continue with Google, with the next customer ID (C-00001, CUS-27). The name starts as
 * the one on the Google account, and the customer can change it on Profile.
 */
export async function ensureCustomer(db: Db, actor: Actor) {
  const [found] = await db
    .select()
    .from(t.customerProfile)
    .where(eq(t.customerProfile.userId, actor.id));
  if (found) return found;
  // Two first requests at once could pick the same number: the unique code makes one fail, and the
  // retry takes the next number.
  for (let attempt = 0; ; attempt++) {
    try {
      const [{ n }] = (
        await db.execute<{ n: number }>(
          sql`select coalesce(max(substring(code from 3)::int), 0) + 1 as n from customer_profile`,
        )
      ).rows as [{ n: number }];
      const [made] = await db
        .insert(t.customerProfile)
        .values({ userId: actor.id, code: `C-${String(n).padStart(5, "0")}`, name: actor.name })
        .onConflictDoNothing({ target: t.customerProfile.userId })
        .returning();
      if (made) return made;
      const [again] = await db
        .select()
        .from(t.customerProfile)
        .where(eq(t.customerProfile.userId, actor.id));
      if (again) return again;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
  }
}
