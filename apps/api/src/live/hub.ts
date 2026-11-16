import { DurableObject } from "cloudflare:workers";
import { inArray, sql } from "drizzle-orm";
import { connect } from "../db/client";
import * as t from "../db/schema";
import { scanAlerts } from "../orders/alerts";
import { alertMessages, orderMessages } from "./publish";
import { sendPush, type PushMessage } from "./push";

const ALERT_CHECK_MS = 60_000;
/** Orders still in progress, which the alert check watches. */
const OPEN_STATUSES = [
  "placed",
  "confirmed",
  "acknowledged",
  "preparing",
  "ready",
  "rider_accepted",
  "picked_up",
  "arriving",
  "ready_for_collection",
] as const;

/** One message for the apps, and the groups of connections (tags) it goes to. */
/** `push` carries push notifications instead: sent to Expo, never over the WebSocket. */
export type LiveMessage = { to: string[]; data: unknown; push?: PushMessage[] };

/**
 * The live connection (architecture.md 10, 14.4): every app keeps one WebSocket to this single
 * Durable Object, and the API sends each change through it to only the people who should see it,
 * so apps never poll and watching a screen costs no API calls. Messages sent from here are free on
 * the free plan; only messages from the apps count, and apps send nothing but a ping, which is
 * answered without waking the object (hibernation, verified in 16.1 item 3).
 *
 * Each connection carries tags: "all"; the person's role ("kitchen", "dispatch", "accounts",
 * "manager", or "riders" for riders); "user:<id>"; and "customer:<id>" or "rider:<id>".
 *
 * It also runs the timed alert check (MGR-14) from its alarm (14.0: Durable Object alarms for
 * per-order timers): once a minute, only while orders are in progress. With no orders the alarm
 * stops, so a quiet restaurant never wakes the database (Neon's free hours, 14.2).
 */
export class LiveHub extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** Accepts a connection the Worker has already signed in, with its tags. */
  override async fetch(request: Request) {
    const tags = JSON.parse(request.headers.get("x-live-tags") ?? "[]") as string[];
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], tags);
    pair[1].send(JSON.stringify({ type: "hello" }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  /** Sends each message once to every connection in any of its groups. */
  async publish(messages: LiveMessage[]) {
    // An order changed, so the alert check should be running.
    if (messages.some((m) => (m.data as { type?: string } | null)?.type === "order"))
      await this.checkSoon();
    let sent = 0;
    for (const m of messages) {
      if (m.push) continue;
      const text = JSON.stringify(m.data);
      const seen = new Set<WebSocket>();
      for (const tag of m.to)
        for (const ws of this.ctx.getWebSockets(tag)) {
          if (seen.has(ws)) continue;
          seen.add(ws);
          try {
            ws.send(text);
            sent++;
          } catch {
            // A connection that is closing; the app reconnects and catches up with /changes.
          }
        }
    }
    return sent;
  }

  /** Sets the alert check's alarm for a minute from now, unless one is already set. */
  async checkSoon() {
    if ((await this.ctx.storage.getAlarm()) === null)
      await this.ctx.storage.setAlarm(Date.now() + ALERT_CHECK_MS);
  }

  /** The timed alert check: open and clear alerts, send them, and run again while orders are open. */
  override async alarm() {
    const { db, close } = await connect(this.env);
    try {
      const found = await scanAlerts(db);
      const messages = [
        ...(await alertMessages(db, found.alerts, found.beep)),
        ...(await orderMessages(db, this.env.BETTER_AUTH_SECRET, found.orders)),
      ];
      if (messages.length) await this.publish(messages);
      const pushes = messages.flatMap((m) => m.push ?? []);
      if (pushes.length) await sendPush(this.env, pushes);
      const [open] = (await db
        .select({ n: sql<number>`count(*)::int` })
        .from(t.order)
        .where(inArray(t.order.status, [...OPEN_STATUSES]))) as [{ n: number }];
      if (open.n > 0) await this.ctx.storage.setAlarm(Date.now() + ALERT_CHECK_MS);
      else await this.ctx.storage.deleteAlarm();
    } finally {
      await close();
    }
  }

  /** Closes a person's connections, for example when a manager deactivates them (3.1). */
  closeUser(userId: string) {
    for (const ws of this.ctx.getWebSockets(`user:${userId}`)) ws.close(4001, "Signed out");
  }

  /** When the alert check runs next, or null when it's stopped (for tests and checks). */
  nextCheck() {
    return this.ctx.storage.getAlarm();
  }

  /** How many connections are open, by tag (for tests and checks). */
  count(tag: string) {
    return this.ctx.getWebSockets(tag).length;
  }

  // Apps send nothing but pings, which are answered automatically.
  override webSocketMessage() {}

  override webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code, "Closed");
    } catch {
      // already closed
    }
  }
}
