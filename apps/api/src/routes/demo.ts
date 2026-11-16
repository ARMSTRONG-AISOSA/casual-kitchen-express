import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import { placePractice, practiceOpen, resetPractice, SPEEDS, type Speed } from "../demo/practice";
import { demoSim } from "../demo/sim";
import { orderMessages, send } from "../live/publish";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** Demo controls (MGR-28, MGR-29, architecture.md 18.4), mounted at /demo. Managers only. */
export const demo = new Hono<Ctx>()
  /** GET /demo: auto-play, the speed, and how many practice orders are still moving. */
  .get("/", requireRole("manager"), async (c) => {
    const sim = await demoSim(c.env).state();
    return c.json({ ...sim, open: await practiceOpen(c.get("db")) });
  })

  /** POST /demo/orders: a practice online order (a demo customer) or a practice walk-in. */
  .post(
    "/orders",
    requireRole("manager"),
    zValidator("json", z.object({ kind: z.enum(["online", "walkin"]) })),
    async (c) => {
      const db = c.get("db");
      const { kind } = c.req.valid("json");
      const r = await placePractice(db, c.env.BETTER_AUTH_SECRET, kind, c.get("actor").id);
      if ("error" in r) return c.json({ error: r.error }, 409);
      send(
        c,
        await orderMessages(db, c.env.BETTER_AUTH_SECRET, [r.order.id], {
          newOnline: kind === "online",
        }),
      );
      c.executionCtx.waitUntil(
        demoSim(c.env)
          .kick()
          .catch(() => undefined),
      );
      return c.json({ order: { id: r.order.id, number: r.order.number } }, 201);
    },
  )

  /** PUT /demo/autoplay: the simulated kitchen and rider on or off, at 1x, 5x, or 20x. */
  .put(
    "/autoplay",
    requireRole("manager"),
    zValidator(
      "json",
      z.object({
        auto: z.boolean(),
        speed: z.union(
          SPEEDS.map((s) => z.literal(s)) as [z.ZodLiteral<1>, z.ZodLiteral<5>, z.ZodLiteral<20>],
        ),
      }),
    ),
    async (c) => {
      const { auto, speed } = c.req.valid("json");
      return c.json(await demoSim(c.env).configure(auto, speed as Speed));
    },
  )

  /** POST /demo/reset: every practice order goes; real orders and the history stay. */
  .post("/reset", requireRole("manager"), async (c) => {
    const removed = await resetPractice(c.get("db"));
    // Screens showing them load again.
    send(c, [
      { to: ["kitchen", "dispatch", "manager", "accounts", "riders"], data: { type: "reload" } },
    ]);
    return c.json({ removed });
  });
