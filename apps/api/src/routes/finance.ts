import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import {
  addAdjustment,
  auditTrail,
  cashUps,
  closeMonth,
  countCash,
  payRider,
  riderPay,
  signOff,
  statement,
  todayCashUp,
} from "../finance/money";
import { watNow } from "../orders/clock";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

const month = z.string().regex(/^\d{4}-\d{2}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = ["manager", "accounts"] as const;

/** Rider pay and payouts (MGR-30, ACC-02), mounted at /payouts. */
export const payouts = new Hono<Ctx>()
  .get("/", requireRole(...money), async (c) => c.json(await riderPay(c.get("db"))))
  /** POST /payouts/:code/pay: everything the rider is owed, up to today, marked as paid. */
  .post("/:code/pay", requireRole(...money), async (c) => {
    const r = await payRider(c.get("db"), c.req.param("code"), c.get("actor").id);
    return "error" in r ? c.json({ error: r.error }, 409) : c.json(r, 201);
  });

/** Finance (ACC-03 to ACC-07) and the counter's cash-up (ACC-04), mounted at /finance. */
export const finance = new Hono<Ctx>()
  /** The counter's view of today: what the drawer should hold, and any count already saved. */
  .get("/cash-up/today", requireRole("kitchen", ...money), async (c) =>
    c.json(await todayCashUp(c.get("db"))),
  )
  .put(
    "/cash-up/today",
    requireRole("kitchen", ...money),
    zValidator("json", z.object({ counted: z.number().int().min(0).max(100_000_000) })),
    async (c) => {
      const r = await countCash(c.get("db"), c.req.valid("json").counted, c.get("actor").id);
      return "error" in r ? c.json({ error: r.error }, 409) : c.json(r);
    },
  )
  .get(
    "/cash-ups",
    requireRole(...money),
    zValidator("query", z.object({ month: month.optional() })),
    async (c) =>
      c.json({
        cashUps: await cashUps(
          c.get("db"),
          c.req.valid("query").month ?? watNow().date.slice(0, 7),
        ),
      }),
  )
  .post(
    "/cash-ups/:day/sign-off",
    requireRole(...money),
    zValidator("json", z.object({ note: z.string().max(300).nullish() })),
    async (c) => {
      const d = day.safeParse(c.req.param("day"));
      if (!d.success) return c.json({ error: "Bad date" }, 400);
      const r = await signOff(
        c.get("db"),
        d.data,
        c.req.valid("json").note ?? null,
        c.get("actor").id,
      );
      return "error" in r ? c.json({ error: r.error }, 409) : c.json(r);
    },
  )
  .get(
    "/statement",
    requireRole(...money),
    zValidator("query", z.object({ month: month.optional() })),
    async (c) =>
      c.json(await statement(c.get("db"), c.req.valid("query").month ?? watNow().date.slice(0, 7))),
  )
  .post("/months/:month/close", requireRole(...money), async (c) => {
    const m = month.safeParse(c.req.param("month"));
    if (!m.success) return c.json({ error: "Bad month" }, 400);
    const r = await closeMonth(c.get("db"), m.data, c.get("actor").id);
    return "error" in r ? c.json({ error: r.error }, 409) : c.json(r);
  })
  .post(
    "/adjustments",
    requireRole(...money),
    zValidator(
      "json",
      z.object({
        amount: z
          .number()
          .int()
          .refine((v) => v !== 0, "The amount can’t be zero"),
        reason: z.string().trim().min(3).max(200),
      }),
    ),
    async (c) => {
      const { amount, reason } = c.req.valid("json");
      const r = await addAdjustment(c.get("db"), amount, reason, c.get("actor").id);
      return "error" in r ? c.json({ error: r.error }, 409) : c.json(r, 201);
    },
  )
  .get(
    "/audit",
    requireRole(...money),
    zValidator(
      "query",
      z.object({
        from: day,
        to: day,
        kind: z.enum(["all", "money", "account", "setting", "contact", "other"]).default("all"),
        person: z.string().max(10).optional(),
      }),
    ),
    async (c) => c.json({ entries: await auditTrail(c.get("db"), c.req.valid("query")) }),
  );
