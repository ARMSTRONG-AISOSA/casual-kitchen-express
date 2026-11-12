// Puts the sourced menu photos (seed-media/menu, with credits.json) into R2 and links them to the
// menu items and soups. Safe to run again. Locally it writes to wrangler's local R2, the one
// `npm run dev:lan` serves. Run with `npm run db:seed-media --workspace @cke/api`.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as t from "../src/db/schema";

type Credit = {
  file: string;
  shows: string;
  title: string;
  author: string;
  licence: string;
  licenceUrl: string;
  source: string;
  width: number;
  height: number;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "seed-media", "menu");
const credits = JSON.parse(readFileSync(join(dir, "credits.json"), "utf8")) as Credit[];
// The three starting soups share their photos with the soup dishes (KIT-17).
const SOUP_FILES: Record<string, string> = {
  Egusi: "egusi.webp",
  "Efo riro": "efo-riro.webp",
  Ogbono: "ogbono.webp",
};

const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

// Start clean: unlink and remove earlier seeded photos.
await db.update(t.menuItem).set({ imageId: null });
await db.update(t.soupVariety).set({ imageId: null });
await db.delete(t.mediaAsset).where(eq(t.mediaAsset.isDemo, true));

const byFile = new Map<string, string>();
for (const c of credits) {
  const path = `menu/${c.file}`;
  execFileSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `cke-media/${path}`,
      "--file",
      join(dir, c.file),
      "--content-type",
      "image/webp",
      "--local",
    ],
    { cwd: root, stdio: "ignore" },
  );
  const [row] = await db
    .insert(t.mediaAsset)
    .values({
      path,
      bytes: statSync(join(dir, c.file)).size,
      width: c.width,
      height: c.height,
      format: "webp",
      sourceKind: "internet",
      title: c.shows,
      author: c.author,
      licence: c.licence,
      licenceUrl: c.licenceUrl || null,
      sourceUrl: c.source,
      isDemo: true,
    })
    .returning({ id: t.mediaAsset.id });
  byFile.set(c.file, row!.id);
  await db.update(t.menuItem).set({ imageId: row!.id }).where(eq(t.menuItem.name, c.shows));
  process.stdout.write(".");
}
for (const [soup, file] of Object.entries(SOUP_FILES)) {
  const id = byFile.get(file);
  if (id) await db.update(t.soupVariety).set({ imageId: id }).where(eq(t.soupVariety.name, soup));
}
// The soup dishes show today's soup's photo in the apps, so they need none of their own.
await db
  .update(t.menuItem)
  .set({ imageId: null })
  .where(inArray(t.menuItem.name, ["Soup of the day", "Extra soup"]));
// Photos change what customers see, so the catalog version goes up (architecture.md 14.4).
await client.query("update setting set catalog_version = catalog_version + 1 where id = 1");

const { rows } = await client.query(
  "select count(*) filter (where image_id is null)::int as missing, string_agg(name, ', ') filter (where image_id is null) as names from menu_item",
);
console.log(
  `\n${credits.length} photos stored. Menu items without a photo: ${rows[0].missing} (${rows[0].names}).`,
);
await client.end();
