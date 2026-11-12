import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// Tests that touch the catalog live in this one file, because a file's tests run in order: a soup
// change in a parallel file would move the version under the 304 check. Needs the local database
// with the base seed, and ALLOW_UNSIGNED_WRITES="true" in .dev.vars. Leaves the rotation as found.
const api = (path: string, method = "GET", body?: unknown) =>
  exports.default.fetch(`http://example.com${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

type Soup = { id: string; name: string };
const boot = async () =>
  (await (await api("/bootstrap")).json()) as {
    version: number;
    soups: Soup[];
    soupOfTheDay: Soup;
  };

describe("soup of the day rotation (KIT-17)", () => {
  it("adds, protects, removes, and brings back a soup, raising the version each time", async () => {
    // Clear a Banga left behind by an interrupted run, so the test starts clean.
    const before = await boot();
    const leftover = before.soups.find((x) => x.name === "Banga");
    if (leftover) {
      // If an interrupted run left it as today's soup, move today's soup off it first.
      if (before.soupOfTheDay.id === leftover.id) {
        const other = before.soups.find((x) => x.id !== leftover.id)!;
        await (await api("/settings/soup-of-the-day", "PUT", { soupId: other.id })).body?.cancel();
      }
      await (await api(`/soups/${leftover.id}`, "DELETE")).body?.cancel();
    }

    const start = await boot();
    const today = start.soupOfTheDay;

    const added = await api("/soups", "POST", { name: "Banga" });
    expect(added.status).toBe(201);
    const { soup } = (await added.json()) as { soup: Soup };
    const afterAdd = await boot();
    expect(afterAdd.soups.map((s) => s.name)).toContain("Banga");
    expect(afterAdd.version).toBe(start.version + 1);

    const dup = await api("/soups", "POST", { name: "banga" });
    expect(dup.status).toBe(409);
    await dup.body?.cancel();

    const tooShort = await api("/soups", "POST", { name: " " });
    expect(tooShort.status).toBe(400);
    await tooShort.body?.cancel();

    // Today's soup can't be removed.
    expect((await api("/settings/soup-of-the-day", "PUT", { soupId: soup.id })).status).toBe(200);
    const blocked = await api(`/soups/${soup.id}`, "DELETE");
    expect(blocked.status).toBe(409);
    expect(((await blocked.json()) as { error: string }).error).toMatch(/today’s soup/);

    expect((await api("/settings/soup-of-the-day", "PUT", { soupId: today.id })).status).toBe(200);
    const removed = await api(`/soups/${soup.id}`, "DELETE");
    expect(removed.status).toBe(200);
    await removed.body?.cancel();
    expect((await boot()).soups.map((s) => s.name)).not.toContain("Banga");

    // Adding the name again brings the same soup back, so past orders still point to it.
    const back = await api("/soups", "POST", { name: "Banga" });
    expect(((await back.json()) as { soup: Soup }).soup.id).toBe(soup.id);
    const tidy = await api(`/soups/${soup.id}`, "DELETE");
    await tidy.body?.cancel();

    const end = await boot();
    expect(end.soupOfTheDay.id).toBe(today.id);
    expect(end.soups).toEqual(start.soups);
  });
});

describe("GET /bootstrap", () => {
  it("returns the menu, soups, areas, and settings with a version", async () => {
    const res = await exports.default.fetch("http://example.com/bootstrap");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      version: number;
      settings: { deliveryFee: number; riderPay: number };
      soupOfTheDay: { name: string } | null;
      soups: { name: string }[];
      menu: { name: string; items: { name: string; options: { isDefault: boolean }[] }[] }[];
      areas: unknown[];
    };
    expect(body.version).toBeGreaterThan(0);
    expect(body.settings.deliveryFee).toBe(1500);
    expect(body.settings.riderPay).toBe(1000);
    expect(body.soups.map((x) => x.name)).toContain(body.soupOfTheDay?.name);
    expect(body.menu[0]?.name).toBe("Rice meals");
    expect(body.menu[0]?.items[0]?.options.filter((o) => o.isDefault)).toHaveLength(1);
    expect(body.areas).toHaveLength(10);
  });

  it("answers 304 when the app already has this version", async () => {
    const first = await exports.default.fetch("http://example.com/bootstrap");
    const etag = first.headers.get("ETag");
    await first.body?.cancel();
    expect(etag).toMatch(/^W\/"catalog-\d+"$/);
    const again = await exports.default.fetch("http://example.com/bootstrap", {
      headers: { "If-None-Match": etag! },
    });
    expect(again.status).toBe(304);
  });
});
