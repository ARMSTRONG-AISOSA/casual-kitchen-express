import { exports } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { signIn } from "./session";

// Uses its own test soup, so the real menu photos are never touched. Needs the local database and
// the demo staff (test/session.ts); changes are made as the owner (a manager).
const SMALL_WEBP =
  "UklGRkgAAABXRUJQVlA4IDwAAABwAwCdASooAB4APtFmrFEoJaQipWgBABoJZwDQRoAAK/fMIAAA/t+AP13i0o1//BBXMy9nNV3KN2wAAAA=";
const bytes = () => Uint8Array.from(atob(SMALL_WEBP), (ch) => ch.charCodeAt(0));
let cookie = "";
beforeAll(async () => {
  cookie = await signIn("owner.m");
});
const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(`http://example.com${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string>),
      Cookie: cookie,
      Origin: "cke-business://",
    },
  });
const json = async <T>(res: Response) => (await res.json()) as T;

const upload = (path: string, file: Uint8Array, fields: Record<string, string>) => {
  const form = new FormData();
  form.set("file", new File([file], "photo.webp", { type: "image/webp" }));
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return call(path, { method: "PUT", body: form });
};

type Boot = { soups: { id: string; name: string; imageId: string | null }[] };
const soupNamed = async (name: string) =>
  (await json<Boot>(await call("/bootstrap"))).soups.find((s) => s.name === name);

describe("photos: add, replace, remove (architecture.md 8)", () => {
  it("stores a photo with its credit, deletes the old one on replace, and checks uploads", async () => {
    const left = await soupNamed("Test soup");
    if (left) await (await call(`/soups/${left.id}`, { method: "DELETE" })).body?.cancel();
    const created = await call("/soups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test soup" }),
    });
    const soup = (await json<{ soup: { id: string } }>(created)).soup;

    // A business photo needs no licence; the photographer is optional.
    const first = await upload(`/photos/soup/${soup.id}`, bytes(), {
      sourceKind: "business",
      author: "Ada",
    });
    expect(first.status).toBe(200);
    const { photoId: firstId } = await json<{ photoId: string }>(first);
    expect((await soupNamed("Test soup"))?.imageId).toBe(firstId);
    const credits = await json<{ credits: { id: string; sourceKind: string; author: string }[] }>(
      await call("/media/credits"),
    );
    expect(credits.credits.find((c) => c.id === firstId)).toMatchObject({
      sourceKind: "business",
      author: "Ada",
    });

    // An internet photo needs who took it, the licence, and the link.
    const missing = await upload(`/photos/soup/${soup.id}`, bytes(), { sourceKind: "internet" });
    expect(missing.status).toBe(400);
    await missing.body?.cancel();

    const second = await upload(`/photos/soup/${soup.id}`, bytes(), {
      sourceKind: "internet",
      author: "A. Photographer",
      licence: "CC BY 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    });
    const { photoId: secondId } = await json<{ photoId: string }>(second);
    // The old photo is gone everywhere: its address no longer works, and its credit is gone.
    const old = await call(`/media/${firstId}`);
    expect(old.status).toBe(404);
    await old.body?.cancel();
    const img = await call(`/media/${secondId}`);
    expect(img.headers.get("Content-Type")).toBe("image/webp");
    await img.body?.cancel();
    const after = await json<{ credits: { id: string }[] }>(await call("/media/credits"));
    expect(after.credits.map((c) => c.id)).toContain(secondId);
    expect(after.credits.map((c) => c.id)).not.toContain(firstId);

    // Not WebP, and too large, are refused.
    const png = await upload(`/photos/soup/${soup.id}`, new Uint8Array(100), {
      sourceKind: "business",
    });
    expect(png.status).toBe(400);
    await png.body?.cancel();
    const huge = bytes();
    huge[26] = 0x14; // header says 1300 px wide
    huge[27] = 0x05;
    const big = await upload(`/photos/soup/${soup.id}`, huge, { sourceKind: "business" });
    expect(big.status).toBe(413);
    await big.body?.cancel();

    // Removing the photo deletes it too.
    const removed = await call(`/photos/soup/${soup.id}`, { method: "DELETE" });
    expect(removed.status).toBe(200);
    await removed.body?.cancel();
    expect((await soupNamed("Test soup"))?.imageId).toBeNull();
    const gone = await call(`/media/${secondId}`);
    expect(gone.status).toBe(404);
    await gone.body?.cancel();

    await (await call(`/soups/${soup.id}`, { method: "DELETE" })).body?.cancel();
  });
});
