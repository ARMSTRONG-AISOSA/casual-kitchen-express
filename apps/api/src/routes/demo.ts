import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireRole, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import { placePractice, practiceOpen, resetPractice, SPEEDS, type Speed } from "../demo/practice";
import { demoSim } from "../demo/sim";
import { claimReset, failReset, resetState, startRunner } from "../demo/reset";
import { orderMessages, send } from "../live/publish";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/** Requests from the reset's runner carry DEMO_RESET_SECRET instead of a session. */
const runnerSigned = (env: Env, given: string | undefined) =>
  !!env.DEMO_RESET_SECRET && given === env.DEMO_RESET_SECRET;

/** Demo controls (MGR-28, MGR-29, architecture.md 18.4), mounted at /demo. Managers only. */
export const demo = new Hono<Ctx>()
  /** GET /demo: auto-play, the speed, and how many practice orders are still moving. */
  .get("/", requireRole("manager"), async (c) => {
    const db = c.get("db");
    const sim = await demoSim(c.env).state();
    return c.json({ ...sim, open: await practiceOpen(db), reset: await resetState(db) });
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
  })

  /**
   * POST /demo/reset-all: Reset demo data (MGR-29). Starts the runner, which clears every order and
   * puts the menu, settings, staff, photos, and history back to the start (src/demo/reset.ts).
   */
  .post(
    "/reset-all",
    requireRole("manager"),
    zValidator("json", z.object({ confirm: z.literal("RESET") })),
    async (c) => {
      const db = c.get("db");
      if (!(await claimReset(db, c.get("actor").staffCode ?? null)))
        return c.json({ error: "A reset is already running." }, 409);
      const problem = await startRunner(c.env);
      if (problem) await failReset(db, problem);
      const reset = await resetState(db);
      send(c, [{ to: ["manager"], data: { type: "demo-reset", reset } }]);
      return problem ? c.json({ error: problem, reset }, 502) : c.json({ reset }, 202);
    },
  )

  /**
   * POST /demo/reset-all/notify: the runner reports a step or the end (it writes the state itself).
   * Signed with DEMO_RESET_SECRET, not a session. At the end every app loads again.
   */
  /**
   * PUT and DELETE /demo/reset-all/media/<path>: the reset's starting photos (scripts/seed-media.ts),
   * so it needs no Cloudflare key. Signed with DEMO_RESET_SECRET, and only while a reset runs.
   */
  .on(["PUT", "DELETE"], "/reset-all/media/*", async (c) => {
    if (!runnerSigned(c.env, c.req.header("x-demo-reset-secret")))
      return c.json({ error: "Not allowed" }, 403);
    if ((await resetState(c.get("db"))).status !== "running")
      return c.json({ error: "No reset is running" }, 409);
    const path = new URL(c.req.url).pathname.replace(/^.*\/reset-all\/media\//, "");
    if (!/^[a-z0-9-]+\/[\w.-]+$/i.test(path)) return c.json({ error: "Bad path" }, 400);
    if (c.req.method === "DELETE") {
      await c.env.MEDIA.delete(path);
      return c.json({ ok: true });
    }
    if (!path.endsWith(".webp")) return c.json({ error: "Only WebP photos" }, 400);
    await c.env.MEDIA.put(path, c.req.raw.body, { httpMetadata: { contentType: "image/webp" } });
    return c.json({ ok: true });
  })

  .post("/reset-all/notify", async (c) => {
    if (!runnerSigned(c.env, c.req.header("x-demo-reset-secret")))
      return c.json({ error: "Not allowed" }, 403);
    const reset = await resetState(c.get("db"));
    const messages: Parameters<typeof send>[1] = [
      { to: ["manager"], data: { type: "demo-reset", reset } },
    ];
    if (reset.status !== "running") {
      // Practice auto-play goes back to off with everything else.
      if (reset.status === "idle")
        await demoSim(c.env)
          .configure(false, 1)
          .catch(() => undefined);
      messages.push(
        { to: ["all"], data: { type: "catalog", version: Date.now() } },
        { to: ["all"], data: { type: "reload", reason: "reset" } },
      );
    }
    send(c, messages);
    return c.json({ ok: true });
  });
