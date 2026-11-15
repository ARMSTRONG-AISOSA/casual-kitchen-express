import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { alertMessages, orderMessages, send } from "../live/publish";
import { alertViews } from "../orders/alerts";
import { touch } from "../orders/store";
import { latestChange } from "./orders";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/**
 * Alerts (MGR-14, design 6.4): orders waiting for a rider, stuck orders, unavailable items, riders'
 * help requests, and customers' cancellation requests. Kitchen staff see them; dispatch officers
 * and managers act on them.
 */
export const alerts = new Hono<Ctx>()
  /** GET /alerts: the open alerts, newest first, with the latest change number. */
  .get("/", requireRole("kitchen", "dispatch", "manager"), async (c) => {
    const db = c.get("db");
    return c.json({ alerts: await alertViews(db, { open: true }), latest: await latestChange(db) });
  })

  /**
   * POST /alerts/:id/clear: dismisses a waiting, stuck, or unavailable-item alert. Requests are
   * cleared by deciding them (approve or decline, resolve), so they can't be dismissed unseen.
   */
  .post(
    "/:id/clear",
    requireRole("dispatch", "manager"),
    zValidator("param", z.object({ id: z.uuid() })),
    async (c) => {
      const db = c.get("db");
      const actor = c.get("actor");
      const { id } = c.req.valid("param");
      const result = await db.transaction(async (tx) => {
        const [a] = await tx
          .select()
          .from(t.alert)
          .where(and(eq(t.alert.id, id), isNull(t.alert.clearedAt)));
        if (!a) return { status: 404 as const, error: "That alert is already cleared" };
        if (a.kind === "cancellation_request" || a.kind === "help_request")
          return { status: 409 as const, error: "Decide the request to clear it" };
        await tx
          .update(t.alert)
          .set({ clearedAt: new Date(), clearedBy: actor.id, ...touch() })
          .where(eq(t.alert.id, id));
        // Clearing a stuck alert lifts "Running a little late"; an unavailable item stays flagged until refunded or cancelled.
        if (a.kind === "stuck" && a.orderId)
          await tx
            .update(t.order)
            .set({ exception: null, ...touch() })
            .where(and(eq(t.order.id, a.orderId), eq(t.order.exception, "delayed")));
        return { orderId: a.orderId };
      });
      if ("error" in result) return c.json({ error: result.error }, result.status);
      send(c, [
        ...(await alertMessages(db, [id])),
        ...(result.orderId
          ? await orderMessages(db, c.env.BETTER_AUTH_SECRET, [result.orderId])
          : []),
      ]);
      return c.json({ ok: true });
    },
  );
