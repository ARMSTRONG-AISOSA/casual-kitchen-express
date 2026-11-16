import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { KITCHEN } from "../orders/riders";

/**
 * GET /bootstrap: everything the apps need when they open, with a version number (architecture.md
 * 14.4, decision 1). The reply carries an ETag; an app that already has this version sends
 * If-None-Match and gets a tiny 304 instead. Apps ask again only when the live channel or a push
 * says the version changed.
 */
export const bootstrap = new Hono<{ Bindings: Env; Variables: { db: Db } }>().get(
  "/",
  async (c) => {
    const db = c.get("db");
    const [s] = await db.select().from(t.setting).where(eq(t.setting.id, 1));
    if (!s) return c.json({ error: "Settings are missing. Run the base seed." }, 500);

    const etag = `W/"catalog-${s.catalogVersion}"`;
    c.header("ETag", etag);
    c.header("Cache-Control", "no-cache"); // the app may keep it, but checks the version first
    if (c.req.header("If-None-Match") === etag) return c.body(null, 304);

    const [categories, items, options, soups, areas] = await Promise.all([
      db.select().from(t.menuCategory).orderBy(asc(t.menuCategory.sortOrder)),
      db
        .select()
        .from(t.menuItem)
        .where(eq(t.menuItem.archived, false))
        .orderBy(asc(t.menuItem.sortOrder)),
      db.select().from(t.itemOption).orderBy(asc(t.itemOption.sortOrder)),
      db
        .select({ id: t.soupVariety.id, name: t.soupVariety.name, imageId: t.soupVariety.imageId })
        .from(t.soupVariety)
        .where(eq(t.soupVariety.active, true))
        .orderBy(asc(t.soupVariety.sortOrder)),
      db
        .select({
          id: t.neighbourhood.id,
          name: t.neighbourhood.name,
          inRange: t.neighbourhood.inRange,
        })
        .from(t.neighbourhood)
        .orderBy(asc(t.neighbourhood.sortOrder)),
    ]);

    return c.json({
      version: s.catalogVersion,
      settings: {
        onlineHours: [s.onlineOpens.slice(0, 5), s.onlineCloses.slice(0, 5)],
        walkinHours: [s.walkinOpens.slice(0, 5), s.walkinCloses.slice(0, 5)],
        paused: s.paused,
        deliveryFee: s.deliveryFee,
        riderPay: s.riderPay,
        cancellationLimit: s.cancellationLimit,
        trackingMode: s.trackingMode,
        whatsappNumber: s.whatsappNumber,
      },
      // For the customer's map (7.4): the kitchen's pin, and the delivery boundary once drawn (4.7).
      kitchen: { lat: KITCHEN.lat, lng: KITCHEN.lng },
      boundary: s.boundary ?? null,
      soupOfTheDay: soups.find((x) => x.id === s.soupVarietyId) ?? null,
      soups,
      areas,
      menu: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        items: items
          .filter((i) => i.categoryId === cat.id)
          .map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price,
            available: i.available,
            load: i.load,
            isSoup: i.isSoup,
            imageId: i.imageId,
            options: options
              .filter((o) => o.itemId === i.id)
              .map((o) => ({
                id: o.id,
                name: o.name,
                priceChange: o.priceChange,
                isDefault: o.isDefault,
              })),
          })),
      })),
    });
  },
);
