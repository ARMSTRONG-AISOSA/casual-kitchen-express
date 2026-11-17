import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import { watNow } from "../orders/clock";
import { refundRows, reportSummary } from "../reports/summary";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const range = z
  .object({ from: day, to: day, channel: z.enum(["all", "online", "walkin"]).default("all") })
  .refine((r) => r.from <= r.to, { message: "From must be on or before To" });

/**
 * Reports (MGR-17 to MGR-22, MGR-27, MGR-34) for managers and account officers, mounted at
 * /reports. A range wholly in the past never changes, so phones may keep it (14.4); today's
 * figures are fresh each time.
 */
export const reports = new Hono<Ctx>()
  .get("/summary", requireRole("manager", "accounts"), zValidator("query", range), async (c) => {
    const { from, to, channel } = c.req.valid("query");
    const past = to < watNow().date;
    c.header("cache-control", past ? "private, max-age=86400" : "no-store");
    return c.json(await reportSummary(c.get("db"), from, to, channel));
  })
  .get("/refunds", requireRole("manager", "accounts"), zValidator("query", range), async (c) => {
    const { from, to, channel } = c.req.valid("query");
    return c.json({ refunds: await refundRows(c.get("db"), from, to, channel) });
  });
