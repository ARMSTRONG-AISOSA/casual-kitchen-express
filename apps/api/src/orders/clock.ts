import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import * as t from "../db/schema";

// Times are stored with their time zone and worked out in West Africa Time, which is UTC+1 all
// year (no daylight saving), so a fixed offset is exact (architecture.md 13, Locale).
const WAT_OFFSET_MS = 60 * 60 * 1000;

/** The date and "HH:MM" time in West Africa Time. */
export function watNow(now = new Date()) {
  const iso = new Date(now.getTime() + WAT_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

type Hours = { opens: string; closes: string; closed: boolean };

/**
 * Today's online and walk-in hours: the usual hours from Settings, or today's override (MGR-09).
 * The last order can be placed at the closing minute itself (4.7: "the last online order can be
 * placed at 6:00 pm").
 */
export async function todaysHours(db: Db, date: string) {
  const [[s], [o]] = await Promise.all([
    db.select().from(t.setting).where(eq(t.setting.id, 1)),
    db.select().from(t.hoursOverride).where(eq(t.hoursOverride.day, date)),
  ]);
  if (!s) throw new Error("Settings are missing. Run the base seed.");
  const hm = (v: string | null | undefined, fallback: string) => (v ?? fallback).slice(0, 5);
  const online: Hours = {
    opens: hm(o?.onlineOpens, s.onlineOpens),
    closes: hm(o?.onlineCloses, s.onlineCloses),
    closed: o?.closed ?? false,
  };
  const walkin: Hours = {
    opens: hm(o?.walkinOpens, s.walkinOpens),
    closes: hm(o?.walkinCloses, s.walkinCloses),
    closed: o?.closed ?? false,
  };
  // A pause with an end time lifts itself when that time passes (MGR-10).
  const paused = s.paused && (!s.pausedUntil || s.pausedUntil.getTime() > Date.now());
  return { setting: s, online, walkin, paused };
}

export const isOpen = (h: Hours, time: string) => !h.closed && time >= h.opens && time <= h.closes;

/** "8:00 am" for the customer-facing messages. */
export function clockLabel(hm: string) {
  const [h, m] = hm.split(":").map(Number) as [number, number];
  const suffix = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}
