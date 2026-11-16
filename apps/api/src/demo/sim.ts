import { DurableObject } from "cloudflare:workers";
import { connect } from "../db/client";
import type { LiveMessage } from "../live/hub";
import { liveHub, orderMessages } from "../live/publish";
import { sendPush } from "../live/push";
import { practiceOpen, SPEEDS, stepPractice, type Speed } from "./practice";

/** How often the simulator takes a turn: every 5 seconds at 1x, faster at 5x and 20x (at most once a second). */
const turnMs = (speed: Speed) => Math.max(1000, 5000 / speed);

/**
 * The live simulator's clock (architecture.md 18.4): auto-play on or off and the speed, kept in
 * this Durable Object, with its alarm taking a turn while practice orders are moving. With none
 * left the alarm stops, and placing a practice order starts it again, so it costs nothing idle.
 * It counts toward the free request limits like real traffic (14.2).
 */
export class DemoSim extends DurableObject<Env> {
  async state() {
    const auto = (await this.ctx.storage.get<boolean>("auto")) ?? false;
    const speed = (await this.ctx.storage.get<Speed>("speed")) ?? 1;
    return { auto, speed };
  }

  async configure(auto: boolean, speed: Speed) {
    await this.ctx.storage.put({ auto, speed: SPEEDS.includes(speed) ? speed : 1 });
    if (auto) await this.kick();
    else await this.ctx.storage.deleteAlarm();
    return this.state();
  }

  /** A practice order was placed: take turns if auto-play is on. */
  async kick() {
    const { auto, speed } = await this.state();
    if (auto && (await this.ctx.storage.getAlarm()) === null)
      await this.ctx.storage.setAlarm(Date.now() + turnMs(speed));
  }

  override async alarm() {
    const { auto, speed } = await this.state();
    if (!auto) return;
    const { db, close } = await connect(this.env);
    try {
      const moved = await stepPractice(db, speed);
      const messages: LiveMessage[] = [
        ...(await orderMessages(db, this.env.BETTER_AUTH_SECRET, moved.orders)),
        ...moved.positions.map((p) => ({
          to: [`customer:${p.customerId}`],
          data: {
            type: "rider-location",
            orderId: p.orderId,
            lat: p.lat,
            lng: p.lng,
            at: new Date().toISOString(),
          },
        })),
      ];
      const live = messages.filter((m) => !m.push);
      if (live.length) await liveHub(this.env).publish(live);
      const pushes = messages.flatMap((m) => m.push ?? []);
      if (pushes.length) await sendPush(this.env, pushes);
      if ((await practiceOpen(db)) > 0) await this.ctx.storage.setAlarm(Date.now() + turnMs(speed));
    } finally {
      await close();
    }
  }
}

export const demoSim = (env: Env) => env.DEMO_SIM.getByName("main");
