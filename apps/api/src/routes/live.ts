import { Hono } from "hono";
import { readActor, type Actor } from "../auth/actor";
import type { Db } from "../db/client";
import { liveHub } from "../live/publish";

type Ctx = { Bindings: Env; Variables: { db: Db; actor: Actor } };

/**
 * GET /live: opens the app's live connection (architecture.md 10). The Worker checks who is
 * signed in, then hands the WebSocket to the hub tagged with what that person may see. An app
 * connects once when it opens, catches up with GET /changes, and then only listens. When the
 * app goes to the background it closes the connection, and it reconnects on return.
 */
export const live = new Hono<Ctx>().get("/", async (c) => {
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket")
    return c.json({ error: "Open this as a WebSocket" }, 426);
  const actor = await readActor(c);
  if (!actor) return c.json({ error: "Sign in to continue" }, 401);
  if (actor.mustChangePassword) return c.json({ error: "Set a new password first" }, 403);
  const tags = ["all", `user:${actor.id}`];
  if (actor.role === "customer") tags.push(`customer:${actor.id}`);
  else if (actor.role === "rider") tags.push("riders", `rider:${actor.id}`);
  else tags.push(actor.role);
  const headers = new Headers(c.req.raw.headers);
  headers.set("x-live-tags", JSON.stringify(tags));
  return liveHub(c.env).fetch(new Request(c.req.url, { headers }));
});
