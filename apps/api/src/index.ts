import { Hono } from "hono";
import type { Actor } from "./auth/actor";
import { createAuth } from "./auth/auth";
import { connect, type Db } from "./db/client";
import { resetting } from "./demo/reset";
import { addresses } from "./routes/addresses";
import { alerts } from "./routes/alerts";
import { bootstrap } from "./routes/bootstrap";
import { cancellationRequests, myOrderActions, orderActions } from "./routes/cancellations";
import { changes } from "./routes/changes";
import { demo } from "./routes/demo";
import { live } from "./routes/live";
import { me } from "./routes/me";
import { media } from "./routes/media";
import { menu } from "./routes/menu";
import { myOrders, orders } from "./routes/orders";
import { people } from "./routes/people";
import { photos } from "./routes/photos";
import { reports } from "./routes/reports";
import { assign, helpRequests, rider, riders } from "./routes/rider";
import { settings } from "./routes/settings";
import { soupOfTheDay, soups } from "./routes/soups";
import { staff } from "./routes/staff";

export { AuthRateLimiter } from "./auth/rate-limit";
export { LiveHub } from "./live/hub";
export { DemoSim } from "./demo/sim";

// `Env` (the Worker's bindings) is generated into worker-configuration.d.ts by `npm run types`.
const app = new Hono<{ Bindings: Env; Variables: { db: Db; actor: Actor } }>();

// Each app calls this when it opens, so the database wakes before it's needed (architecture.md 14.2).
// It doesn't touch the database itself, so it stays cheap.
app.get("/health", (c) => c.json({ ok: true as const }));

// Every other route gets one database connection for the request, closed after the reply.
// Permission checks are attached to each route itself (src/auth/actor.ts), not here.
app.use("*", async (c, next) => {
  const { db, close } = await connect(c.env);
  c.set("db", db);
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(close());
  }
});

// While Reset demo data runs (MGR-29), new orders are refused: the reset would wipe them.
const NEW_ORDER = new Set(["/me/orders", "/orders/walk-in", "/demo/orders"]);
app.use("*", async (c, next) => {
  if (c.req.method === "POST" && NEW_ORDER.has(new URL(c.req.url).pathname.replace(/\/$/, "")))
    if (await resetting(c.get("db")))
      return c.json(
        { error: "Demo data is being reset. Try again in a few minutes.", resetting: true },
        503,
      );
  await next();
});

// Sign-in, sign-out, and sessions (Better Auth, architecture.md 12).
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  createAuth(c.env, c.get("db"), new URL(c.req.url).origin).handler(c.req.raw),
);

app.route("/alerts", alerts);
app.route("/bootstrap", bootstrap);
app.route("/cancellation-requests", cancellationRequests);
app.route("/changes", changes);
app.route("/demo", demo);
app.route("/help-requests", helpRequests);
app.route("/live", live);
app.route("/me/addresses", addresses);
app.route("/me/orders", myOrders);
app.route("/me/orders", myOrderActions);
app.route("/me", me);
app.route("/media", media);
app.route("/menu", menu);
app.route("/orders", orders);
app.route("/orders", orderActions);
app.route("/orders", assign);
app.route("/people", people);
app.route("/photos", photos);
app.route("/reports", reports);
app.route("/rider", rider);
app.route("/riders", riders);
app.route("/soups", soups);
app.route("/staff", staff);
app.route("/settings/soup-of-the-day", soupOfTheDay);
app.route("/settings", settings);

export default app;
