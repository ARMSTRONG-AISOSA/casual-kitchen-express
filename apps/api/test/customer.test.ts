import { env, exports } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth/password";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { DEMO_PASSWORD, signIn } from "./session";

// The customer's profile (architecture.md 9: CustomerProfile; CUS-15, CUS-16, CUS-27). Customers
// sign in with Google, which a test can't do, so this test makes a throwaway customer with a
// password, signs in as them, and removes them at the end.
const USER_ID = "test-customer-automated";
const USERNAME = "test.customer";
const SMALL_WEBP =
  "UklGRkgAAABXRUJQVlA4IDwAAABwAwCdASooAB4APtFmrFEoJaQipWgBABoJZwDQRoAAK/fMIAAA/t+AP13i0o1//BBXMy9nNV3KN2wAAAA=";
const bytes = () => Uint8Array.from(atob(SMALL_WEBP), (ch) => ch.charCodeAt(0));

const call = (path: string, cookie: string, init: RequestInit = {}) =>
  exports.default.fetch(`http://example.com${path}`, {
    ...init,
    headers: {
      Origin: "cke-customer://",
      Cookie: cookie,
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
    },
  });
const json = async <T>(res: Response) => (await res.json()) as T;

async function removeTestCustomer() {
  const { db, close } = await connect(env);
  await db.delete(t.customerProfile).where(eq(t.customerProfile.userId, USER_ID));
  const assets = await db
    .delete(t.mediaAsset)
    .where(eq(t.mediaAsset.ownerId, USER_ID))
    .returning({ path: t.mediaAsset.path });
  for (const a of assets) await env.MEDIA.delete(a.path);
  await db.delete(t.user).where(eq(t.user.id, USER_ID)); // sessions and accounts cascade
  await close();
}

let customer = "";
let kitchen = "";
let manager = "";
beforeAll(async () => {
  await removeTestCustomer();
  const { db, close } = await connect(env);
  await db.insert(t.user).values({
    id: USER_ID,
    name: "Test Customer (automated)",
    email: "test.customer@example.com",
    emailVerified: true,
    username: USERNAME,
    displayUsername: USERNAME,
    role: "customer",
  });
  await db.insert(t.account).values({
    id: `credential-${USER_ID}`,
    accountId: USER_ID,
    providerId: "credential",
    userId: USER_ID,
    password: await hashPassword(DEMO_PASSWORD),
  });
  await close();
  customer = await signIn(USERNAME);
  kitchen = await signIn("blessing.k");
  manager = await signIn("owner.m");
});
afterAll(removeTestCustomer);

describe("customer profile", () => {
  it("gets a customer ID at the first visit, and saves the name and gender", async () => {
    const me = await json<{ role: string; customerCode: string; name: string; email: string }>(
      await call("/me", customer),
    );
    expect(me.role).toBe("customer");
    expect(me.customerCode).toMatch(/^C-\d{5}$/);
    expect(me.email).toBe("test.customer@example.com");
    // The same ID on the next visit.
    expect((await json<{ customerCode: string }>(await call("/me", customer))).customerCode).toBe(
      me.customerCode,
    );
    const saved = await call("/me", customer, {
      method: "PATCH",
      body: JSON.stringify({ name: "Ada Test", gender: "female" }),
    });
    expect(saved.status).toBe(200);
    expect(await json(await call("/me", customer))).toMatchObject({
      name: "Ada Test",
      gender: "female",
    });
  });

  it("stores a private profile photo, replaces it, and removes it", async () => {
    const upload = () => {
      const form = new FormData();
      form.set("file", new File([bytes()], "photo.webp", { type: "image/webp" }));
      return call("/me/photo", customer, { method: "PUT", body: form });
    };
    const first = await json<{ photoId: string }>(await upload());
    expect((await json<{ photoId: string }>(await call("/me", customer))).photoId).toBe(
      first.photoId,
    );
    // The customer and managers can see it; other staff and strangers can't.
    expect((await call(`/media/${first.photoId}`, customer)).status).toBe(200);
    expect((await call(`/media/${first.photoId}`, manager)).status).toBe(200);
    expect((await call(`/media/${first.photoId}`, kitchen)).status).toBe(401);
    expect((await call(`/media/${first.photoId}`, "")).status).toBe(401);
    // Replacing deletes the old photo (8.3).
    const second = await json<{ photoId: string }>(await upload());
    expect((await call(`/media/${first.photoId}`, customer)).status).toBe(404);
    // A file that isn't WebP is refused; staff can't use the customer route.
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "x.jpg"));
    expect((await call("/me/photo", customer, { method: "PUT", body: form })).status).toBe(400);
    expect((await call("/me/photo", kitchen, { method: "DELETE" })).status).toBe(401);
    // Removing it.
    expect((await call("/me/photo", customer, { method: "DELETE" })).status).toBe(200);
    expect((await call(`/media/${second.photoId}`, customer)).status).toBe(404);
    expect((await json<{ photoId: null }>(await call("/me", customer))).photoId).toBeNull();
  });
});
