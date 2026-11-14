import { env, exports } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { signIn } from "./session";

// Sign-in and roles (architecture.md 3.0, 3.1, 12). Uses the demo staff (test/session.ts) and adds
// one test rider, removed again at the end.
const TEST_NAME = "Test Rider (automated)";
const call = (path: string, cookie = "", init: RequestInit = {}) =>
  exports.default.fetch(`http://example.com${path}`, {
    ...init,
    headers: {
      Origin: "cke-business://",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
const post = (path: string, cookie: string, body?: unknown) =>
  call(path, cookie, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const json = async <T>(res: Response) => (await res.json()) as T;

async function removeTestRiders() {
  const { db, close } = await connect(env);
  const users = await db.select({ id: t.user.id }).from(t.user).where(eq(t.user.name, TEST_NAME));
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await db.delete(t.staffProfile).where(inArray(t.staffProfile.userId, ids));
    await db.delete(t.user).where(inArray(t.user.id, ids)); // sessions and accounts cascade
  }
  await close();
}

let manager = "";
let kitchen = "";
beforeAll(async () => {
  await removeTestRiders();
  manager = await signIn("efosa.m");
  kitchen = await signIn("blessing.k");
});
afterAll(removeTestRiders);

describe("sign-in and roles", () => {
  it("refuses requests without a session", async () => {
    expect((await call("/me")).status).toBe(401);
    expect((await post("/soups", "", { name: "Nope" })).status).toBe(401);
    expect((await call("/staff/photos")).status).toBe(401);
    expect((await call("/people")).status).toBe(401);
  });

  it("knows who is signed in and checks the role on each route", async () => {
    const me = await json<Record<string, unknown>>(await call("/me", kitchen));
    expect(me).toMatchObject({
      role: "kitchen",
      staffCode: "K-001",
      name: "Blessing Okafor",
      // Their own profile, for Profile and the rider's Me tab; internal staff emails stay hidden.
      jobTitle: "Head cook",
      gender: "female",
      email: null,
    });
    // Kitchen staff can see staff photos but can't change the soup rotation or open People.
    expect((await call("/staff/photos", kitchen)).status).toBe(200);
    const refused = await post("/soups", kitchen, { name: "Nope" });
    expect(refused.status).toBe(403);
    expect((await json<{ error: string }>(refused)).error).toContain("Ask a manager");
    expect((await call("/people", kitchen)).status).toBe(403);
    expect((await call("/people", manager)).status).toBe(200);
  });

  it("keeps staff photo files for signed-in staff only", async () => {
    const { staff } = await json<{ staff: { code: string; photoId: string | null }[] }>(
      await call("/staff/photos", kitchen),
    );
    const photoId = staff.find((s) => s.photoId)?.photoId;
    expect(photoId).toBeTruthy();
    const open = await call(`/media/${photoId}`);
    expect(open.status).toBe(401);
    await open.body?.cancel();
    // The test runtime has its own empty file storage, so a signed-in request gets past the check
    // to "file missing" (404) here, and to the photo (200) against the real local storage.
    const asStaff = await call(`/media/${photoId}`, kitchen);
    expect(asStaff.status).not.toBe(401);
    await asStaff.body?.cancel();
  });

  it("refuses a wrong password", async () => {
    await expect(signIn("blessing.k", "not-the-password")).rejects.toThrow();
  });

  it("adds a person, makes them change the temporary password, resets it, and deactivates", async () => {
    // A manager adds a rider and gets a temporary password, shown once (3.1, MGR-03).
    const created = await post("/people", manager, {
      role: "rider",
      fullName: TEST_NAME,
      username: `test.rider${Date.now() % 100000}`,
      phone: "0800 000 0000",
    });
    expect(created.status).toBe(201);
    const { code, temporaryPassword } = await json<{ code: string; temporaryPassword: string }>(
      created,
    );
    expect(code).toMatch(/^R-\d{3,}$/);
    const list = await json<{ people: { code: string; username: string }[] }>(
      await call("/people", manager),
    );
    const username = list.people.find((p) => p.code === code)!.username;

    // First sign-in: only the password change is allowed (12.1).
    let rider = await signIn(username, temporaryPassword);
    expect(
      (await json<{ mustChangePassword: boolean }>(await call("/me", rider))).mustChangePassword,
    ).toBe(true);
    expect((await call("/staff/photos", rider)).status).toBe(403);
    const wrong = await post("/me/password", rider, {
      currentPassword: "wrong-one",
      newPassword: "rider-pass-1",
    });
    expect(wrong.status).toBe(400);
    await wrong.body?.cancel();
    const changed = await post("/me/password", rider, {
      currentPassword: temporaryPassword,
      newPassword: "rider-pass-1",
    });
    expect(changed.status).toBe(200);
    await changed.body?.cancel();
    expect((await call("/staff/photos", rider)).status).toBe(200);

    // A reset signs them out everywhere and asks for a new password again (MGR-25).
    const reset = await post(`/people/${code}/reset-password`, manager);
    const { temporaryPassword: second } = await json<{ temporaryPassword: string }>(reset);
    expect((await call("/me", rider)).status).toBe(401);
    rider = await signIn(username, second);
    expect(
      (await json<{ mustChangePassword: boolean }>(await call("/me", rider))).mustChangePassword,
    ).toBe(true);

    // Deactivating signs them out straight away and blocks sign-in until reactivated (3.1).
    expect((await post(`/people/${code}/deactivate`, manager)).status).toBe(200);
    expect((await call("/me", rider)).status).toBe(401);
    const blocked = await signIn(username, second).catch((e: Error) => e.message);
    expect(blocked).toContain("deactivated");
    expect((await post(`/people/${code}/reactivate`, manager)).status).toBe(200);
    await signIn(username, second);
  });

  it("protects the owner and managers’ Google sign-in", async () => {
    const owner = await post("/people/M-001/deactivate", manager);
    expect(owner.status).toBe(409);
    expect((await json<{ error: string }>(owner)).error).toContain("Owner");
    const resetManager = await post("/people/M-002/reset-password", manager);
    expect(resetManager.status).toBe(409);
    await resetManager.body?.cancel();
  });

  it("adds a manager by Google email, ready to link at their first Google sign-in", async () => {
    const res = await post("/people", manager, {
      role: "manager",
      fullName: TEST_NAME,
      email: "Test.Manager@Example.com",
      jobTitle: "Shift manager",
    });
    expect(res.status).toBe(201);
    const { temporaryPassword } = await json<{ temporaryPassword: string | null }>(res);
    expect(temporaryPassword).toBeNull(); // managers have no password
    const { db, close } = await connect(env);
    const [u] = await db
      .select({ email: t.user.email, verified: t.user.emailVerified })
      .from(t.user)
      .where(eq(t.user.email, "test.manager@example.com"));
    await close();
    expect(u).toEqual({ email: "test.manager@example.com", verified: true });
    // The People list shows a real Google email, and hides the placeholder for username staff.
    const { people } = await json<{ people: { code: string; email: string | null }[] }>(
      await call("/people", manager),
    );
    expect(people.find((p) => p.code === "R-001")!.email).toBeNull();
    expect(people.some((p) => p.email === "test.manager@example.com")).toBe(true);
  });
});
