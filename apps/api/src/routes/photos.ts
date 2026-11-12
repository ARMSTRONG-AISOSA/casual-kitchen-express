import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { webpSize } from "../media/webp";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * What each kind of photo is for, and its limits (architecture.md 8.1). Apps compress before
 * uploading; the API checks again and refuses anything bigger.
 */
const KINDS = {
  "menu-item": { maxEdge: 1200, maxBytes: 250_000, catalog: true },
  soup: { maxEdge: 1200, maxBytes: 250_000, catalog: true },
  staff: { maxEdge: 512, maxBytes: 80_000, catalog: false },
} as const;
type Kind = keyof typeof KINDS;

const credit = z.discriminatedUnion(
  "sourceKind",
  [
    // CKE's own photo: the business is credited, a photographer and a link are optional.
    z.object({
      sourceKind: z.literal("business"),
      author: z.string().trim().max(80).optional(),
      sourceUrl: z.url().optional(),
    }),
    // A photo from the internet: who made it, the licence, and where it came from are needed.
    z.object({
      sourceKind: z.literal("internet"),
      author: z
        .string({ error: "Enter who took the photo" })
        .trim()
        .min(1, "Enter who took the photo")
        .max(120),
      licence: z
        .string({ error: "Choose the licence" })
        .trim()
        .min(1, "Choose the licence")
        .max(40),
      licenceUrl: z.url().optional(),
      sourceUrl: z.url({ error: "Enter the link to where the photo came from" }),
    }),
  ],
  { error: "Say whether it’s your own photo or from the internet" },
);

/** Finds what the photo is for, with its current photo and a name for the audit log. */
async function findTarget(tx: Tx, kind: Kind, id: string) {
  if (kind === "menu-item") {
    if (!z.uuid().safeParse(id).success) return null;
    const [r] = await tx
      .select({ name: t.menuItem.name, photoId: t.menuItem.imageId })
      .from(t.menuItem)
      .where(eq(t.menuItem.id, id));
    return r ?? null;
  }
  if (kind === "soup") {
    if (!z.uuid().safeParse(id).success) return null;
    const [r] = await tx
      .select({ name: t.soupVariety.name, photoId: t.soupVariety.imageId })
      .from(t.soupVariety)
      .where(eq(t.soupVariety.id, id));
    return r ?? null;
  }
  const [r] = await tx
    .select({ name: t.staffProfile.fullName, photoId: t.staffProfile.photoId })
    .from(t.staffProfile)
    .where(eq(t.staffProfile.code, id));
  return r ?? null;
}

async function link(tx: Tx, kind: Kind, id: string, photoId: string | null) {
  if (kind === "menu-item")
    await tx.update(t.menuItem).set({ imageId: photoId }).where(eq(t.menuItem.id, id));
  else if (kind === "soup")
    await tx.update(t.soupVariety).set({ imageId: photoId }).where(eq(t.soupVariety.id, id));
  else await tx.update(t.staffProfile).set({ photoId }).where(eq(t.staffProfile.code, id));
}

/**
 * Removes a photo nothing points to any more: its database row now, and its file once the change is
 * saved. Returns the file path to delete, or null if something else still uses it.
 */
async function dropIfUnused(tx: Tx, photoId: string | null): Promise<string | null> {
  if (!photoId) return null;
  const { rows } = await tx.execute<{ n: number }>(sql`
    select (select count(*) from menu_item where image_id = ${photoId})
         + (select count(*) from soup_variety where image_id = ${photoId})
         + (select count(*) from staff_profile where photo_id = ${photoId})
         + (select count(*) from customer_profile where photo_id = ${photoId}) as n`);
  if (Number(rows[0]?.n ?? 0) > 0) return null;
  const [gone] = await tx
    .delete(t.mediaAsset)
    .where(eq(t.mediaAsset.id, photoId))
    .returning({ path: t.mediaAsset.path });
  return gone?.path ?? null;
}

const bumpCatalog = (tx: Tx) =>
  tx
    .update(t.setting)
    .set({ catalogVersion: sql`${t.setting.catalogVersion} + 1` })
    .where(eq(t.setting.id, 1));

/**
 * PUT /photos/:kind/:id adds or replaces a photo in one call: the compressed file and its credit.
 * The old photo is deleted (row and file), so every app shows the new one and the credits follow.
 * DELETE /photos/:kind/:id removes it. Kinds: menu-item (id), soup (id), staff (staff code).
 */
export const photos = new Hono<Ctx>()
  .put("/:kind/:id", async (c) => {
    const kind = c.req.param("kind") as Kind;
    const rules = KINDS[kind];
    if (!rules) return c.json({ error: "Unknown photo kind" }, 404);
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File)) return c.json({ error: "Choose a photo first" }, 400);

    const meta = credit.safeParse({
      sourceKind: form.sourceKind,
      author: form.author || undefined,
      licence: form.licence || undefined,
      licenceUrl: form.licenceUrl || undefined,
      sourceUrl: form.sourceUrl || undefined,
    });
    if (!meta.success)
      return c.json({ error: meta.error.issues[0]?.message ?? "Check the photo details" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const size = webpSize(bytes);
    if (!size) return c.json({ error: "Photos must be compressed to WebP by the app first" }, 400);
    if (bytes.length > rules.maxBytes || Math.max(size.width, size.height) > rules.maxEdge)
      return c.json(
        {
          error: `The photo is too big. Up to ${rules.maxEdge} px and ${rules.maxBytes / 1000} KB.`,
        },
        413,
      );

    const id = c.req.param("id");
    const path = `${kind}/${crypto.randomUUID()}.webp`;
    await c.env.MEDIA.put(path, bytes, { httpMetadata: { contentType: "image/webp" } });
    const actor = c.get("actor");
    const m = meta.data;
    let result: { status: 404 } | { status: 200; id: string; oldPath: string | null };
    try {
      result = await c.get("db").transaction(async (tx) => {
        const target = await findTarget(tx, kind, id);
        if (!target) return { status: 404 as const };
        const [asset] = await tx
          .insert(t.mediaAsset)
          .values({
            ownerId: actor.id,
            path,
            bytes: bytes.length,
            width: size.width,
            height: size.height,
            format: "webp",
            sourceKind: m.sourceKind,
            title: target.name,
            author: m.author ?? null,
            licence: m.sourceKind === "internet" ? m.licence : null,
            licenceUrl: m.sourceKind === "internet" ? (m.licenceUrl ?? null) : null,
            sourceUrl: m.sourceUrl ?? null,
          })
          .returning({ id: t.mediaAsset.id });
        await link(tx, kind, id, asset!.id);
        const oldPath = await dropIfUnused(tx, target.photoId);
        if (rules.catalog) await bumpCatalog(tx);
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `${target.photoId ? "Changed" : "Added"} the photo of ${target.name}`,
          target: `${kind}:${id}`,
          before: target.photoId ? { photoId: target.photoId } : null,
          after: { photoId: asset!.id, sourceKind: m.sourceKind },
        });
        return { status: 200 as const, id: asset!.id, oldPath };
      });
    } catch (e) {
      await c.env.MEDIA.delete(path); // nothing points to it
      throw e;
    }
    if (result.status === 404) {
      await c.env.MEDIA.delete(path);
      return c.json({ error: "That item doesn’t exist" }, 404);
    }
    if (result.oldPath) await c.env.MEDIA.delete(result.oldPath); // a few milliseconds
    return c.json({ photoId: result.id });
  })
  .delete("/:kind/:id", async (c) => {
    const kind = c.req.param("kind") as Kind;
    const rules = KINDS[kind];
    if (!rules) return c.json({ error: "Unknown photo kind" }, 404);
    const id = c.req.param("id");
    const actor = c.get("actor");
    const result = await c.get("db").transaction(async (tx) => {
      const target = await findTarget(tx, kind, id);
      if (!target) return null;
      await link(tx, kind, id, null);
      const oldPath = await dropIfUnused(tx, target.photoId);
      if (rules.catalog) await bumpCatalog(tx);
      if (target.photoId)
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Removed the photo of ${target.name}`,
          target: `${kind}:${id}`,
          before: { photoId: target.photoId },
        });
      return { oldPath };
    });
    if (!result) return c.json({ error: "That item doesn’t exist" }, 404);
    if (result.oldPath) await c.env.MEDIA.delete(result.oldPath); // a few milliseconds
    return c.json({ photoId: null });
  });
