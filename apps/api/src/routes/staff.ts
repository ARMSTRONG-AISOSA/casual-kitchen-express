import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client";
import * as t from "../db/schema";

type Ctx = { Bindings: Env; Variables: { db: Db } };

/**
 * GET /staff/photos: each staff member's photo and its credit, by staff code. Staff photos are for
 * staff only (architecture.md 3.1). Until sign-in exists this is open, like the rest of the
 * development API; sign-in limits it to signed-in staff.
 */
export const staff = new Hono<Ctx>().get("/photos", async (c) => {
  const rows = await c
    .get("db")
    .select({
      code: t.staffProfile.code,
      photoId: t.staffProfile.photoId,
      sourceKind: t.mediaAsset.sourceKind,
      author: t.mediaAsset.author,
      licence: t.mediaAsset.licence,
      sourceUrl: t.mediaAsset.sourceUrl,
    })
    .from(t.staffProfile)
    .leftJoin(t.mediaAsset, eq(t.mediaAsset.id, t.staffProfile.photoId))
    .orderBy(asc(t.staffProfile.code));
  c.header("Cache-Control", "no-cache");
  return c.json({ staff: rows });
});
