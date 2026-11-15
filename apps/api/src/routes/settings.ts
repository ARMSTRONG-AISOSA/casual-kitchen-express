import { alertChanges, alertSettings, cancellationLimit } from "@cke/validation";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertSettingsMessage, catalogMessage, send } from "../live/publish";
import { watNow } from "../orders/clock";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 08:00");
const hours = z.tuple([hm, hm]).refine(([a, b]) => a < b, "Closing must be after opening");

const changes = z.object({
  onlineHours: hours.optional(),
  walkinHours: hours.optional(),
  paused: z.boolean().optional(),
  pausedUntil: z.iso.datetime().nullable().optional(),
  capacityBudget: z.number().int().min(1).max(12).optional(),
  batchDistanceM: z.number().int().min(200).max(5000).optional(),
  trackingMode: z.enum(t.trackingMode.enumValues).optional(),
  cancellationLimit: cancellationLimit.optional(),
  // Pricing and pay, and the restaurant contact: managers only (3.0, MGR-31, MGR-36).
  deliveryFee: z.number().int().min(1).max(100_000).optional(),
  riderPay: z.number().int().min(1).max(100_000).optional(),
  whatsappNumber: z
    .string()
    .regex(/^\d{10,15}$/, "Digits only, with the country code, for example 2349095466063")
    .optional(),
});
const MANAGER_ONLY = ["deliveryFee", "riderPay", "whatsappNumber"] as const;

const view = (s: typeof t.setting.$inferSelect) => ({
  onlineHours: [s.onlineOpens.slice(0, 5), s.onlineCloses.slice(0, 5)],
  walkinHours: [s.walkinOpens.slice(0, 5), s.walkinCloses.slice(0, 5)],
  paused: s.paused,
  pausedUntil: s.pausedUntil,
  capacityBudget: s.capacityBudget,
  batchDistanceM: s.batchDistanceM,
  trackingMode: s.trackingMode,
  cancellationLimit: s.cancellationLimit,
  deliveryFee: s.deliveryFee,
  riderPay: s.riderPay,
  whatsappNumber: s.whatsappNumber,
  catalogVersion: s.catalogVersion,
});

/** The Alerts section (MGR-14): the beep, the four times, and who saved them last and when. */
async function alertsView(db: Db) {
  const [r] = await db
    .select({ s: t.setting, name: t.staffProfile.fullName, code: t.staffProfile.code })
    .from(t.setting)
    .leftJoin(t.staffProfile, eq(t.staffProfile.userId, t.setting.alertsUpdatedBy))
    .where(eq(t.setting.id, 1));
  const s = r!.s;
  return {
    sound: s.alertSound,
    chime: s.alertChime,
    rider: s.alertRiderMin,
    acknowledge: s.alertAcknowledgeMin,
    kitchen: s.alertKitchenMin,
    road: s.alertRoadMin,
    updatedAt: s.alertsUpdatedAt,
    updatedBy: r!.code ? { name: r!.name, code: r!.code } : null,
  };
}

const LABELS: Record<string, string> = {
  onlineHours: "online order hours",
  walkinHours: "walk-in hours",
  paused: "new orders",
  pausedUntil: "the pause end time",
  capacityBudget: "rider capacity",
  batchDistanceM: "batch drop-off distance",
  trackingMode: "rider tracking mode",
  cancellationLimit: "cancellation limit",
  deliveryFee: "delivery fee",
  riderPay: "rider pay",
  whatsappNumber: "restaurant WhatsApp number",
};

/**
 * Settings (MGR-09 to MGR-12, MGR-31, MGR-32, MGR-35, MGR-36). Dispatch officers and managers
 * change them; pricing and pay and the restaurant contact are managers only. Each change is
 * written to the audit log and raises the catalog version, so the apps pick it up straight away
 * (14.4, decision 1).
 */
export const settings = new Hono<Ctx>()
  .get("/", requireRole("dispatch", "manager"), async (c) => {
    const db = c.get("db");
    const [[s], areas, overrides] = await Promise.all([
      db.select().from(t.setting).where(eq(t.setting.id, 1)),
      db.select().from(t.neighbourhood).orderBy(asc(t.neighbourhood.sortOrder)),
      db
        .select()
        .from(t.hoursOverride)
        .where(gte(t.hoursOverride.day, watNow().date))
        .orderBy(asc(t.hoursOverride.day)),
    ]);
    return c.json({ settings: view(s!), alerts: await alertsView(db), areas, overrides });
  })

  /**
   * PUT /settings/alerts: the whole Alerts section, saved with one tap (MGR-14, owner decision
   * 15 November 2026). Dispatch officers and managers. Each save that changes something is written
   * to the audit log with the before and after, and the section shows who saved it last and when.
   */
  .put(
    "/alerts",
    requireRole("dispatch", "manager"),
    zValidator("json", alertSettings),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const b = c.req.valid("json");
      const changed = await db.transaction(async (tx) => {
        const [s] = await tx.select().from(t.setting).where(eq(t.setting.id, 1)).for("update");
        const was = {
          sound: s!.alertSound,
          chime: s!.alertChime,
          rider: s!.alertRiderMin,
          acknowledge: s!.alertAcknowledgeMin,
          kitchen: s!.alertKitchenMin,
          road: s!.alertRoadMin,
        };
        const said = alertChanges(was, b);
        if (!said.length) return false;
        await tx
          .update(t.setting)
          .set({
            alertSound: b.sound,
            alertChime: b.chime,
            alertRiderMin: b.rider,
            alertAcknowledgeMin: b.acknowledge,
            alertKitchenMin: b.kitchen,
            alertRoadMin: b.road,
            alertsUpdatedAt: new Date(),
            alertsUpdatedBy: actor.id,
          })
          .where(eq(t.setting.id, 1));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Changed the alert settings: ${said.join(", ")}`,
          target: "setting:alerts",
          before: was,
          after: b,
        });
        return true;
      });
      const alerts = await alertsView(db);
      if (changed) send(c, alertSettingsMessage(alerts));
      return c.json({ alerts, changed });
    },
  )

  .patch("/", requireRole("dispatch", "manager"), zValidator("json", changes), async (c) => {
    const db = c.get("db");
    const actor = c.get("actor");
    const body = c.req.valid("json");
    if (actor.role !== "manager" && MANAGER_ONLY.some((k) => body[k] !== undefined))
      return c.json(
        { error: "Only managers can change pricing, pay, and the restaurant contact" },
        403,
      );
    const result = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(t.setting).where(eq(t.setting.id, 1)).for("update");
      const fee = body.deliveryFee ?? before!.deliveryFee;
      const pay = body.riderPay ?? before!.riderPay;
      if (pay > fee) return { error: "Rider pay can’t be more than the delivery fee" }; // MGR-31
      const set: Partial<typeof t.setting.$inferInsert> = {};
      if (body.onlineHours) [set.onlineOpens, set.onlineCloses] = body.onlineHours;
      if (body.walkinHours) [set.walkinOpens, set.walkinCloses] = body.walkinHours;
      if (body.paused !== undefined) set.paused = body.paused;
      if (body.pausedUntil !== undefined)
        set.pausedUntil = body.pausedUntil ? new Date(body.pausedUntil) : null;
      if (body.paused === false) set.pausedUntil = null;
      for (const k of [
        "capacityBudget",
        "batchDistanceM",
        "trackingMode",
        "cancellationLimit",
        "deliveryFee",
        "riderPay",
        "whatsappNumber",
      ] as const)
        if (body[k] !== undefined) (set as Record<string, unknown>)[k] = body[k];
      const [after] = await tx
        .update(t.setting)
        .set({
          ...set,
          catalogVersion: sql`${t.setting.catalogVersion} + 1`,
          updatedAt: new Date(),
          updatedBy: actor.id,
        })
        .where(eq(t.setting.id, 1))
        .returning();
      const was = view(before!) as Record<string, unknown>;
      const now = view(after!) as Record<string, unknown>;
      for (const k of Object.keys(body)) {
        if (JSON.stringify(was[k]) === JSON.stringify(now[k])) continue;
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          // Price and pay changes belong in the money audit trail (ACC-05).
          kind:
            k === "deliveryFee" || k === "riderPay"
              ? "money"
              : k === "whatsappNumber"
                ? "contact"
                : "setting",
          action:
            k === "paused"
              ? now.paused
                ? "Paused new orders"
                : "Resumed new orders"
              : `Changed the ${LABELS[k]} from ${JSON.stringify(was[k])} to ${JSON.stringify(now[k])}`,
          target: `setting:${k}`,
          before: { [k]: was[k] },
          after: { [k]: now[k] },
        });
      }
      return { settings: view(after!) };
    });
    if ("error" in result) return c.json({ error: result.error }, 400);
    send(c, await catalogMessage(db));
    return c.json(result);
  })

  /** PUT /settings/areas/:id: an area in or out of the delivery range (MGR-11, 4.7). */
  .put(
    "/areas/:id",
    requireRole("dispatch", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    zValidator("json", z.object({ inRange: z.boolean() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const { inRange } = c.req.valid("json");
      const area = await db.transaction(async (tx) => {
        const [a] = await tx
          .update(t.neighbourhood)
          .set({ inRange })
          .where(eq(t.neighbourhood.id, id))
          .returning();
        if (!a) return null;
        await tx
          .update(t.setting)
          .set({ catalogVersion: sql`${t.setting.catalogVersion} + 1` })
          .where(eq(t.setting.id, 1));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `${inRange ? "Added" : "Removed"} ${a.name} ${inRange ? "to" : "from"} the delivery range`,
          target: `area:${id}`,
          after: { inRange },
        });
        return a;
      });
      if (!area) return c.json({ error: "That area isn’t on the list" }, 404);
      send(c, await catalogMessage(db));
      return c.json({ area });
    },
  )

  /** PUT /settings/hours-overrides/:day: closed, or different hours, on one date (MGR-09). */
  .put(
    "/hours-overrides/:day",
    requireRole("dispatch", "manager"),
    zValidator("param", z.object({ day: z.iso.date() })),
    zValidator(
      "json",
      z.object({
        closed: z.boolean().default(false),
        onlineHours: hours.optional(),
        walkinHours: hours.optional(),
        note: z.string().trim().max(100).optional(),
      }),
    ),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { day } = c.req.valid("param");
      const b = c.req.valid("json");
      const values = {
        day,
        closed: b.closed,
        onlineOpens: b.onlineHours?.[0] ?? null,
        onlineCloses: b.onlineHours?.[1] ?? null,
        walkinOpens: b.walkinHours?.[0] ?? null,
        walkinCloses: b.walkinHours?.[1] ?? null,
        note: b.note ?? null,
      };
      await db.transaction(async (tx) => {
        await tx
          .insert(t.hoursOverride)
          .values(values)
          .onConflictDoUpdate({ target: t.hoursOverride.day, set: values });
        await tx
          .update(t.setting)
          .set({ catalogVersion: sql`${t.setting.catalogVersion} + 1` })
          .where(eq(t.setting.id, 1));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Set special hours for ${day}${b.closed ? " (closed)" : ""}`,
          target: `hours:${day}`,
          after: values,
        });
      });
      send(c, await catalogMessage(db));
      return c.json({ override: values });
    },
  )

  .delete(
    "/hours-overrides/:day",
    requireRole("dispatch", "manager"),
    zValidator("param", z.object({ day: z.iso.date() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { day } = c.req.valid("param");
      await db.transaction(async (tx) => {
        await tx.delete(t.hoursOverride).where(eq(t.hoursOverride.day, day));
        await tx
          .update(t.setting)
          .set({ catalogVersion: sql`${t.setting.catalogVersion} + 1` })
          .where(eq(t.setting.id, 1));
        await tx.insert(t.auditLog).values({
          actorId: actor.id,
          kind: "setting",
          action: `Removed the special hours for ${day}`,
          target: `hours:${day}`,
        });
      });
      send(c, await catalogMessage(db));
      return c.json({ ok: true });
    },
  );
