import { Hono } from "hono";

// `Env` (the Worker's bindings) is generated into worker-configuration.d.ts by `npm run types`.
const app = new Hono<{ Bindings: Env }>();

// Each app calls this when it opens, so the database wakes before it's needed (architecture.md 14.2).
app.get("/health", (c) => c.json({ ok: true as const }));

export default app;
