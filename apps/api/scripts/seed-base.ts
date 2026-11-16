// Fills the menu, soups, areas, and settings. Safe to run again: it replaces the catalog each time.
// Run with `npm run db:seed-base --workspace @cke/api`. The two months of demo history are a
// separate script (architecture.md 18.3, build step 5).
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { CATEGORIES, NEIGHBOURHOODS, OPTIONS, SOUPS } from "../src/db/catalog";
import * as t from "../src/db/schema";
import { DELIVERY_BOUNDARY } from "@cke/validation";

const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

await db.transaction(async (tx) => {
  await tx.delete(t.itemOption);
  await tx.delete(t.menuItem);
  await tx.delete(t.menuCategory);
  await tx.delete(t.setting);
  await tx.delete(t.soupVariety);

  for (const [ci, c] of CATEGORIES.entries()) {
    const [cat] = await tx
      .insert(t.menuCategory)
      .values({ name: c.name, sortOrder: ci })
      .returning({ id: t.menuCategory.id });
    for (const [ii, it] of c.items.entries()) {
      const [row] = await tx
        .insert(t.menuItem)
        .values({
          categoryId: cat!.id,
          name: it.name,
          description: it.description,
          price: it.price,
          station: it.station,
          load: it.load,
          isSoup: it.isSoup ?? false,
          available: it.name !== "Fish", // one sold-out item, as in the demo screens
          sortOrder: ii,
        })
        .returning({ id: t.menuItem.id });
      if (it.options) {
        await tx.insert(t.itemOption).values(
          OPTIONS[it.options].map((o, oi) => ({
            itemId: row!.id,
            name: o.name,
            priceChange: o.priceChange,
            isDefault: oi === 0,
            sortOrder: oi,
          })),
        );
      }
    }
  }

  const soups = await tx
    .insert(t.soupVariety)
    .values(SOUPS.map((name, i) => ({ name, sortOrder: i })))
    .returning({ id: t.soupVariety.id });

  await tx
    .insert(t.neighbourhood)
    .values(NEIGHBOURHOODS.map((name, i) => ({ name, sortOrder: i })))
    .onConflictDoNothing();

  await tx
    .insert(t.setting)
    .values({ id: 1, soupVarietyId: soups[0]!.id, boundary: DELIVERY_BOUNDARY });
});

const [{ n }] = (await client.query("select count(*)::int as n from menu_item")).rows;
console.log(
  `Catalog ready: ${n} menu items, ${SOUPS.length} soups, ${NEIGHBOURHOODS.length} areas.`,
);
await client.end();
