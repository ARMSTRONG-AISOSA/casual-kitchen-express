import { Hono } from "hono";
import { requireWriter, type Actor } from "./auth/actor";
import { connect, type Db } from "./db/client";
import { bootstrap } from "./routes/bootstrap";
import { media } from "./routes/media";
import { photos } from "./routes/photos";
import { soupOfTheDay, soups } from "./routes/soups";
import { staff } from "./routes/staff";

// `Env` (the Worker's bindings) is generated into worker-configuration.d.ts by `npm run types`.
const app = new Hono<{ Bindings: Env; Variables: { db: Db; actor: Actor } }>();

// Each app calls this when it opens, so the database wakes before it's needed (architecture.md 14.2).
// It doesn't touch the database itself, so it stays cheap.
app.get("/health", (c) => c.json({ ok: true as const }));

// Changes need a writer. Checked before opening a database connection, so a refused request costs
// nothing. Sign-in replaces this temporary guard with a role check per route.
app.on(["POST", "PUT", "PATCH", "DELETE"], "*", requireWriter);

// Every other route gets one database connection for the request, closed after the reply.
app.use("*", async (c, next) => {
  const { db, close } = await connect(c.env);
  c.set("db", db);
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(close());
  }
});

app.route("/bootstrap", bootstrap);
app.route("/media", media);
app.route("/photos", photos);
app.route("/soups", soups);
app.route("/staff", staff);
app.route("/settings/soup-of-the-day", soupOfTheDay);

export default app;
