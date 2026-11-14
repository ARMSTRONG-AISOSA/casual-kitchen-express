import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { readActor, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/**
 * Image files live in R2 and only their links are in the database (architecture.md 8.2). A media ID
 * never changes what it points to (replacing a photo makes a new one, 8.3), so phones and Cloudflare
 * can cache each image for a year and fetch it once.
 */
export const media = new Hono<Ctx>()
  /**
   * GET /media/credits: the credit for every menu and soup photo in use, for the customer app's
   * Photo credits page. Built from what is linked now, so a replaced or removed photo drops out.
   */
  .get("/credits", async (c) => {
    const rows = await c
      .get("db")
      .select({
        id: t.mediaAsset.id,
        title: t.mediaAsset.title,
        sourceKind: t.mediaAsset.sourceKind,
        author: t.mediaAsset.author,
        licence: t.mediaAsset.licence,
        licenceUrl: t.mediaAsset.licenceUrl,
        sourceUrl: t.mediaAsset.sourceUrl,
      })
      .from(t.mediaAsset)
      .where(
        sql`exists (select 1 from menu_item m where m.image_id = ${t.mediaAsset.id})
          or exists (select 1 from soup_variety s where s.image_id = ${t.mediaAsset.id} and s.active)`,
      )
      .orderBy(asc(t.mediaAsset.title));
    // Credits change when photos do, so the app checks each time the page opens.
    c.header("Cache-Control", "no-cache");
    return c.json({ credits: rows });
  })
  /** GET /media/:id: the image itself. */
  .get("/:id", zValidator("param", z.object({ id: z.uuid() })), async (c) => {
    const [asset] = await c
      .get("db")
      .select({ path: t.mediaAsset.path, format: t.mediaAsset.format })
      .from(t.mediaAsset)
      .where(eq(t.mediaAsset.id, c.req.valid("param").id));
    if (!asset) return c.json({ error: "That image doesn’t exist" }, 404);
    // Staff photos are for signed-in staff only (3.1); menu and soup photos are public.
    const isStaffPhoto = asset.path.startsWith("staff/") || asset.path.startsWith("seed-staff/");
    if (isStaffPhoto) {
      const actor = await readActor(c);
      if (!actor || actor.role === "customer")
        return c.json({ error: "Sign in as staff to see this photo" }, 401);
    }
    const file = await c.env.MEDIA.get(asset.path);
    if (!file) return c.json({ error: "That image’s file is missing" }, 404);
    return new Response(file.body, {
      headers: {
        "Content-Type": `image/${asset.format}`,
        // A staff photo may be kept by the phone, but never by shared caches.
        "Cache-Control": `${isStaffPhoto ? "private" : "public"}, max-age=31536000, immutable`,
        ETag: file.httpEtag,
      },
    });
  });
