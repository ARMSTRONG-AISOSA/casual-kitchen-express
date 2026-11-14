import type { StaffRole } from "@cke/types";
import { staffCode, staffUsername } from "@cke/validation";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import { hashPassword } from "../auth/password";
import type { Db } from "../db/client";
import * as t from "../db/schema";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const PREFIX: Record<StaffRole, string> = {
  rider: "R",
  kitchen: "K",
  dispatch: "D",
  accounts: "A",
  manager: "M",
};
const ROLE_NAME: Record<StaffRole, string> = {
  rider: "Rider",
  kitchen: "Kitchen staff",
  dispatch: "Dispatch officer",
  accounts: "Account officer",
  manager: "Manager",
};

/** A temporary password shown once (MGR-25): no look-alike characters, easy to read out. */
function temporaryPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(bytes, (b) => letters[b % letters.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** The next staff code for a role, never reusing one (3.1): R-001, then R-002, and so on. */
async function nextCode(tx: Tx, role: StaffRole) {
  const prefix = PREFIX[role];
  const [row] = await tx
    .select({ n: sql<number>`coalesce(max(substring(${t.staffProfile.code} from 3)::int), 0)` })
    .from(t.staffProfile)
    .where(like(t.staffProfile.code, `${prefix}-%`));
  return `${prefix}-${String(Number(row?.n ?? 0) + 1).padStart(3, "0")}`;
}

const profile = z.object({
  fullName: z.string().trim().min(2, "Enter the person’s full name").max(80),
  jobTitle: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(20).optional(),
  gender: z.enum(["female", "male", "prefer_not_to_say"]).nullable().optional(),
  homeAddress: z.string().trim().max(200).optional(),
});

const newPerson = profile
  .extend({
    role: z.enum(["rider", "kitchen", "dispatch", "accounts", "manager"]),
    // Every role except managers signs in with a username; managers are added by Google email.
    username: staffUsername.optional(),
    email: z.email("Enter the manager’s Google email").optional(),
  })
  .refine((p) => (p.role === "manager" ? !!p.email : !!p.username), {
    message: "Enter a username (or a Google email for a manager)",
    path: ["username"],
  })
  .refine((p) => p.role !== "rider" || !!p.phone, {
    message: "Riders need a phone number",
    path: ["phone"],
  });

/** Checked on each route itself, not as wildcard middleware (see actor.ts). */
const manager = requireRole("manager");
const byCode = zValidator("param", z.object({ code: staffCode }));

async function findStaff(db: Db | Tx, code: string) {
  const [row] = await db
    .select({ staff: t.staffProfile, user: t.user })
    .from(t.staffProfile)
    .innerJoin(t.user, eq(t.user.id, t.staffProfile.userId))
    .where(eq(t.staffProfile.code, code));
  return row;
}

/** People (MGR-03, MGR-04, MGR-25): managers only. */
export const people = new Hono<Ctx>()
  /** GET /people: everyone on the staff, for the People screen. */
  .get("/", manager, async (c) => {
    const rows = await c
      .get("db")
      .select({
        code: t.staffProfile.code,
        fullName: t.staffProfile.fullName,
        role: t.staffProfile.role,
        jobTitle: t.staffProfile.jobTitle,
        phone: t.staffProfile.phone,
        gender: t.staffProfile.gender,
        homeAddress: t.staffProfile.homeAddress,
        photoId: t.staffProfile.photoId,
        status: t.staffProfile.status,
        isOwner: t.staffProfile.isOwner,
        mustChangePassword: t.staffProfile.mustChangePassword,
        username: t.user.username,
        email: t.user.email,
      })
      .from(t.staffProfile)
      .innerJoin(t.user, eq(t.user.id, t.staffProfile.userId))
      .orderBy(asc(t.staffProfile.code));
    c.header("Cache-Control", "no-store");
    return c.json({ people: rows });
  })
  /**
   * POST /people: add a person. Returns the new staff ID and, for username accounts, a temporary
   * password shown once; the person must change it at the first sign-in (3.1).
   */
  .post("/", manager, zValidator("json", newPerson), async (c) => {
    const actor = c.get("actor");
    const p = c.req.valid("json");
    const temp = p.role === "manager" ? null : temporaryPassword();
    const hash = temp ? await hashPassword(temp) : null;
    const result = await c.get("db").transaction(async (tx) => {
      if (p.username) {
        const [taken] = await tx
          .select({ id: t.user.id })
          .from(t.user)
          .where(eq(t.user.username, p.username));
        if (taken) return { error: `The username ${p.username} is taken. Try another.` };
      }
      const code = await nextCode(tx, p.role);
      const userId = crypto.randomUUID();
      const email = p.email?.toLowerCase() ?? `${code.toLowerCase()}@staff.example.com`;
      const [clash] = await tx
        .select({ id: t.user.id })
        .from(t.user)
        .where(eq(t.user.email, email));
      if (clash) return { error: "That email already has an account" };
      await tx.insert(t.user).values({
        id: userId,
        name: p.fullName,
        email,
        username: p.username ?? null,
        displayUsername: p.username ?? null,
        role: p.role,
      });
      if (hash)
        await tx.insert(t.account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hash,
        });
      await tx.insert(t.staffProfile).values({
        userId,
        code,
        fullName: p.fullName,
        role: p.role,
        jobTitle: p.jobTitle || null,
        phone: p.phone || null,
        gender: p.gender ?? null,
        homeAddress: p.homeAddress || null,
        mustChangePassword: !!hash,
        createdBy: actor.id,
      });
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "account",
        action: `Added ${p.fullName} (${code}) as ${ROLE_NAME[p.role]}`,
        target: `staff:${code}`,
        after: { role: p.role, username: p.username ?? null, email: p.email ?? null },
      });
      return { code };
    });
    if ("error" in result) return c.json({ error: result.error }, 409);
    return c.json({ code: result.code, temporaryPassword: temp }, 201);
  })
  /** PATCH /people/:code: edit the profile (3.1). The owner's role can't change. */
  .patch(
    "/:code",
    manager,
    byCode,
    zValidator(
      "json",
      profile.partial().extend({
        role: z.enum(["rider", "kitchen", "dispatch", "accounts", "manager"]).optional(),
      }),
    ),
    async (c) => {
      const actor = c.get("actor");
      const { code } = c.req.valid("param");
      const p = c.req.valid("json");
      const found = await findStaff(c.get("db"), code);
      if (!found) return c.json({ error: "That person isn’t on the staff list" }, 404);
      if (p.role && p.role !== found.staff.role && found.staff.isOwner)
        return c.json({ error: "The owner’s role can’t change" }, 409);
      // A staff code carries the role's letter, so moving role keeps the old code (never reused).
      await c.get("db").transaction(async (tx) => {
        await tx
          .update(t.staffProfile)
          .set({
            ...(p.fullName !== undefined && { fullName: p.fullName }),
            ...(p.jobTitle !== undefined && { jobTitle: p.jobTitle || null }),
            ...(p.phone !== undefined && { phone: p.phone || null }),
            ...(p.gender !== undefined && { gender: p.gender }),
            ...(p.homeAddress !== undefined && { homeAddress: p.homeAddress || null }),
            ...(p.role !== undefined && { role: p.role }),
          })
          .where(eq(t.staffProfile.code, code));
        if (p.fullName || p.role)
          await tx
            .update(t.user)
            .set({
              ...(p.fullName && { name: p.fullName }),
              ...(p.role && { role: p.role }),
              updatedAt: new Date(),
            })
            .where(eq(t.user.id, found.user.id));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "account",
          action: `Edited ${found.staff.fullName}’s profile (${code})`,
          target: `staff:${code}`,
          before: {
            fullName: found.staff.fullName,
            role: found.staff.role,
            jobTitle: found.staff.jobTitle,
            phone: found.staff.phone,
            gender: found.staff.gender,
            homeAddress: found.staff.homeAddress,
          },
          after: p,
        });
      });
      return c.json({ ok: true });
    },
  )
  /**
   * POST /people/:code/reset-password: a new temporary password, shown once (MGR-25). The person is
   * signed out everywhere and must set a new password at the next sign-in. Managers use Google,
   * so they have no password to reset.
   */
  .post("/:code/reset-password", manager, byCode, async (c) => {
    const actor = c.get("actor");
    const { code } = c.req.valid("param");
    const found = await findStaff(c.get("db"), code);
    if (!found) return c.json({ error: "That person isn’t on the staff list" }, 404);
    if (found.staff.role === "manager")
      return c.json(
        { error: "Managers sign in with Google, so there’s no password to reset" },
        409,
      );
    const temp = temporaryPassword();
    const hash = await hashPassword(temp);
    await c.get("db").transaction(async (tx) => {
      const updated = await tx
        .update(t.account)
        .set({ password: hash, updatedAt: new Date() })
        .where(
          sql`${t.account.userId} = ${found.user.id} and ${t.account.providerId} = 'credential'`,
        )
        .returning({ id: t.account.id });
      if (updated.length === 0)
        await tx.insert(t.account).values({
          id: crypto.randomUUID(),
          accountId: found.user.id,
          providerId: "credential",
          userId: found.user.id,
          password: hash,
        });
      await tx
        .update(t.staffProfile)
        .set({ mustChangePassword: true })
        .where(eq(t.staffProfile.code, code));
      await tx.delete(t.session).where(eq(t.session.userId, found.user.id));
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "account",
        action: `Reset ${found.staff.fullName}’s password (${code})`,
        target: `staff:${code}`,
      });
    });
    return c.json({ temporaryPassword: temp });
  })
  /** POST /people/:code/deactivate: signed out straight away; history stays (3.1). */
  .post("/:code/deactivate", manager, byCode, async (c) => {
    const actor = c.get("actor");
    const { code } = c.req.valid("param");
    const found = await findStaff(c.get("db"), code);
    if (!found) return c.json({ error: "That person isn’t on the staff list" }, 404);
    if (found.staff.isOwner) return c.json({ error: "Owner, can’t be deactivated" }, 409);
    if (found.user.id === actor.id)
      return c.json({ error: "You can’t deactivate your own account" }, 409);
    await c.get("db").transaction(async (tx) => {
      await tx
        .update(t.staffProfile)
        .set({ status: "deactivated" })
        .where(eq(t.staffProfile.code, code));
      await tx.delete(t.session).where(eq(t.session.userId, found.user.id));
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "account",
        action: `Deactivated ${found.staff.fullName} (${code})`,
        target: `staff:${code}`,
      });
    });
    return c.json({ ok: true });
  })
  /** POST /people/:code/reactivate: they can sign in again. */
  .post("/:code/reactivate", manager, byCode, async (c) => {
    const actor = c.get("actor");
    const { code } = c.req.valid("param");
    const found = await findStaff(c.get("db"), code);
    if (!found) return c.json({ error: "That person isn’t on the staff list" }, 404);
    await c.get("db").transaction(async (tx) => {
      await tx
        .update(t.staffProfile)
        .set({ status: "active" })
        .where(eq(t.staffProfile.code, code));
      await tx.insert(t.auditLog).values({
        actorId: actor.id,
        kind: "account",
        action: `Reactivated ${found.staff.fullName} (${code})`,
        target: `staff:${code}`,
      });
    });
    return c.json({ ok: true });
  });
