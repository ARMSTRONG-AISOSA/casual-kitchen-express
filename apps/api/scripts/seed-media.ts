// Puts the starting photos into Workers KV and links them: menu photos (seed-media/menu, with credits.json)
// to the menu items and soups, and staff photos (seed-media/staff/<code>.webp) to the staff. They
// ship with the app's starting data, so they aren't flagged as demo. Safe to run again. Locally it writes to wrangler's local Workers KV, the one
// `npm run dev:lan` serves. Run with `npm run db:seed-media --workspace @cke/api`.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as t from "../src/db/schema";
import { webpSize } from "../src/media/webp";
import { OWNER } from "./owner";

type Credit = {
  file: string;
  shows: string;
  /** "business" for CKE's own photos (including ones made with Gemini); internet otherwise. */
  sourceKind?: "business" | "internet";
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
const staffDir = join(root, "seed-media", "staff");
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

// Where files go. During Reset demo data (MGR-29) they go through the API (MEDIA_UPLOAD_URL, signed
// with DEMO_RESET_SECRET): one quick request per photo, locally and online, with no Cloudflare key.
// Otherwise wrangler puts them into its local Workers KV (or the real one with MEDIA_REMOTE=1).
const uploadUrl = process.env.MEDIA_UPLOAD_URL;
const resetSecret = process.env.DEMO_RESET_SECRET ?? "";
const where = process.env.MEDIA_REMOTE === "1" ? "--remote" : "--local";

async function put(path: string, file: string) {
  if (uploadUrl) {
    const res = await fetch(`${uploadUrl}/${path}`, {
      method: "PUT",
      headers: { "x-demo-reset-secret": resetSecret, "content-type": "image/webp" },
      body: readFileSync(file),
    });
    if (!res.ok) throw new Error(`Uploading ${path} failed (${res.status})`);
    return;
  }
  execFileSync(
    "npx",
    ["wrangler", "kv", "key", "put", path, "--path", file, "--binding", "MEDIA", where],
    { cwd: root, stdio: "ignore" },
  );
}

async function remove(path: string) {
  if (uploadUrl) {
    await fetch(`${uploadUrl}/${path}`, {
      method: "DELETE",
      headers: { "x-demo-reset-secret": resetSecret },
    });
    return;
  }
  execFileSync("npx", ["wrangler", "kv", "key", "delete", path, "--binding", "MEDIA", where], {
    cwd: root,
    stdio: "ignore",
  });
}

// Start clean: unlink what this script links (and anything still pointing to an earlier seeded
// photo), then remove the earlier seeded photos, whose files live under menu/ and seed-staff/.
// Photos added in the app for anything else (a new soup, a staff member without a seed photo) stay.
// A configured owner (scripts/owner.ts) keeps their own photo, so the demo owner's isn't used.
const staffFiles = readdirSync(staffDir).filter(
  (f) => f.endsWith(".webp") && !(OWNER && f === `${OWNER.code}.webp`),
);
const seeded = sql`(select id from media_asset where path like 'menu/%' or path like 'seed-staff/%')`;
await db
  .update(t.menuItem)
  .set({ imageId: null })
  .where(
    or(
      inArray(
        t.menuItem.name,
        credits.map((c) => c.shows),
      ),
      inArray(t.menuItem.imageId, seeded),
    ),
  );
await db
  .update(t.soupVariety)
  .set({ imageId: null })
  .where(
    or(
      inArray(t.soupVariety.name, Object.keys(SOUP_FILES)),
      inArray(t.soupVariety.imageId, seeded),
    ),
  );
await db
  .update(t.staffProfile)
  .set({ photoId: null })
  .where(
    or(
      inArray(
        t.staffProfile.code,
        staffFiles.map((f) => f.replace(/\.webp$/, "")),
      ),
      inArray(t.staffProfile.photoId, seeded),
    ),
  );
await db
  .delete(t.mediaAsset)
  .where(or(like(t.mediaAsset.path, "menu/%"), like(t.mediaAsset.path, "seed-staff/%")));

const byFile = new Map<string, string>();
for (const c of credits) {
  const path = `menu/${c.file}`;
  await put(path, join(dir, c.file));
  const business = c.sourceKind === "business";
  const [row] = await db
    .insert(t.mediaAsset)
    .values({
      path,
      bytes: statSync(join(dir, c.file)).size,
      width: c.width,
      height: c.height,
      format: "webp",
      sourceKind: business ? "business" : "internet",
      title: c.shows,
      author: c.author || null,
      licence: business ? null : c.licence,
      licenceUrl: c.licenceUrl || null,
      sourceUrl: c.source || null,
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
// Staff photos: CKE's own, with no credit shown anywhere.
for (const file of staffFiles) {
  const code = file.replace(/\.webp$/, "");
  const path = `seed-staff/${file}`;
  await put(path, join(staffDir, file));
  const size = webpSize(new Uint8Array(readFileSync(join(staffDir, file))));
  if (!size) throw new Error(`${file} isn't a WebP image`);
  const [row] = await db
    .insert(t.mediaAsset)
    .values({
      path,
      bytes: statSync(join(staffDir, file)).size,
      width: size.width,
      height: size.height,
      format: "webp",
      sourceKind: "business",
      title: code,
    })
    .returning({ id: t.mediaAsset.id });
  await db.update(t.staffProfile).set({ photoId: row!.id }).where(eq(t.staffProfile.code, code));
  process.stdout.write(".");
}
// The reset above can leave photos uploaded in the app with nothing pointing to them. Remove those
// too (record and file), as the API does when a photo is replaced.
const { rows: orphans } = await client.query<{ path: string }>(`
  delete from media_asset m
  where not exists (select 1 from menu_item where image_id = m.id)
    and not exists (select 1 from soup_variety where image_id = m.id)
    and not exists (select 1 from staff_profile where photo_id = m.id)
    and not exists (select 1 from customer_profile where photo_id = m.id)
  returning path`);
for (const { path } of orphans) await remove(path);
// Photos change what customers see, so the catalog version goes up (architecture.md 14.4).
await client.query("update setting set catalog_version = catalog_version + 1 where id = 1");

const { rows } = await client.query(
  "select count(*) filter (where image_id is null)::int as missing, string_agg(name, ', ') filter (where image_id is null) as names from menu_item",
);
console.log(
  `\n${credits.length} menu and ${staffFiles.length} staff photos stored, ${orphans.length} unused removed. Menu items without a photo: ${rows[0].missing} (${rows[0].names}).`,
);
await client.end();
