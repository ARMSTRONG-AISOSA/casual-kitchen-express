import { Hono } from "hono";
import type { Actor } from "./auth/actor";
import { createAuth } from "./auth/auth";
import { connect, type Db } from "./db/client";
import { bootstrap } from "./routes/bootstrap";
import { changes } from "./routes/changes";
import { me } from "./routes/me";
import { media } from "./routes/media";
import { menu } from "./routes/menu";
import { myOrders, orders } from "./routes/orders";
import { people } from "./routes/people";
import { photos } from "./routes/photos";
import { soupOfTheDay, soups } from "./routes/soups";
import { staff } from "./routes/staff";

export { AuthRateLimiter } from "./auth/rate-limit";

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

// Sign-in, sign-out, and sessions (Better Auth, architecture.md 12).
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  createAuth(c.env, c.get("db"), new URL(c.req.url).origin).handler(c.req.raw),
);

app.route("/bootstrap", bootstrap);
app.route("/changes", changes);
app.route("/me/orders", myOrders);
app.route("/me", me);
app.route("/media", media);
app.route("/menu", menu);
app.route("/orders", orders);
app.route("/people", people);
app.route("/photos", photos);
app.route("/soups", soups);
app.route("/staff", staff);
app.route("/settings/soup-of-the-day", soupOfTheDay);

export default app;
