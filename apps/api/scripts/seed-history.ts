// Three months of demo history (architecture.md 18.3, build step 5): online and walk-in orders with
// their lines, payments, status events, deliveries, refunds, requests, alerts, and ratings; fake
// customers with addresses; weekly rider payouts; daily cash-ups; closed months; and the audit
// trail. Everything is flagged as demo and can be wiped and regenerated (MGR-29).
//
// Run with `npm run db:seed-history --workspace @cke/api` after the base, people, and media seeds.
// It is deterministic (a fixed random seed): the same day produces the same history. The window
// is the 90 days ending yesterday (West Africa Time), so running it again moves the history up to
// date. It refuses to run if real (non-demo) online orders exist, because their numbers would clash.
// The script checks its own output before saving; if any check fails, nothing is written.
import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as t from "../src/db/schema";
import { AREA_CENTRES, KITCHEN_PIN } from "@cke/validation";

const DAYS = 90;
const url = process.env.DATABASE_URL ?? "postgres://cke:cke-local-only@127.0.0.1:5432/cke";
const client = new Client({ connectionString: url });
await client.connect();
const db = drizzle(client, { schema: t, casing: "snake_case" });

/* ---------- deterministic randomness ---------- */

let seed = 20_261_115;
/** mulberry32: a small, fast, repeatable random number generator. */
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4_294_967_296;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const chance = (p: number) => rand() < p;
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items.at(-1)![0];
}
const round = (n: number, to: number) => Math.round(n / to) * to;

/* ---------- dates in West Africa Time (UTC+1 all year) ---------- */

const WAT = 60 * 60 * 1000;
const watDate = (d: Date) => new Date(d.getTime() + WAT).toISOString().slice(0, 10);
const at = (day: string, minutes: number) =>
  new Date(new Date(`${day}T00:00:00+01:00`).getTime() + minutes * 60_000);
const addDays = (day: string, n: number) =>
  new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const dow = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 Sunday
const plus = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
const minutesOf = (d: Date) => {
  const w = new Date(d.getTime() + WAT);
  return w.getUTCHours() * 60 + w.getUTCMinutes() + w.getUTCSeconds() / 60;
};

const today = watDate(new Date());
const firstDay = addDays(today, -DAYS);
const lastDay = addDays(today, -1);
const days = Array.from({ length: DAYS }, (_, i) => addDays(firstDay, i));

/* ---------- reference data from the database ---------- */

const staff = await db
  .select({ userId: t.staffProfile.userId, code: t.staffProfile.code, role: t.staffProfile.role })
  .from(t.staffProfile);
const by = (code: string) => {
  const s = staff.find((x) => x.code === code);
  if (!s) throw new Error(`Staff ${code} is missing. Run db:seed-people first.`);
  return s.userId;
};
const K1 = by("K-001"); // Blessing Okafor
const K2 = by("K-002"); // Samuel Eze
const DISPATCH = by("D-001"); // Osas Edo
const ACCOUNTS = by("A-001"); // Ngozi Bello
const OWNER = by("M-001");
const MANAGER2 = by("M-002"); // Ivie Osagie
const RIDERS = ["R-001", "R-002", "R-003", "R-004"].map(by);
const UYI = by("R-004");
/** Uyi (R-004) left on this day; his account is deactivated, so his deliveries stop here. */
const UYI_LAST_DAY = addDays(lastDay, -6); // he left last week

const items = await db.select().from(t.menuItem).where(eq(t.menuItem.archived, false));
const options = await db.select().from(t.itemOption);
const soups = await db.select().from(t.soupVariety).where(eq(t.soupVariety.active, true));
const areas = await db.select().from(t.neighbourhood);
const [setting] = await db.select().from(t.setting).where(eq(t.setting.id, 1));
if (!items.length || !soups.length || !areas.length || !setting)
  throw new Error("Run db:seed-base first.");
const item = (name: string) => {
  const i = items.find((x) => x.name === name);
  if (!i) throw new Error(`Menu item ${name} is missing`);
  return i;
};

/** Jollof rice went from ₦1,800 to ₦2,000 a little after the halfway mark (audit-logged). */
const JOLLOF_RISE_DAY = addDays(firstDay, 47);

/* ---------- places ---------- */

// The area centres (packages/validation, the owner's pins), and how many customers live in
// each (more near the kitchen in Ugbowo). Pins scatter a few hundred metres around the centre.
const WEIGHT: Record<string, number> = {
  Ugbowo: 22,
  Ekosodin: 16,
  "BDPA estate": 10,
  Osasogie: 9,
  Uselu: 12,
  Uwelu: 7,
  Evbogida: 6,
  Isihor: 8,
  Idunmwowina: 5,
  Iguosa: 5,
  "Oluku (up to Oluku Market)": 6,
};
const PLACES: Record<string, { lat: number; lng: number; w: number }> = Object.fromEntries(
  Object.entries(AREA_CENTRES).map(([name, c]) => [name, { ...c, w: WEIGHT[name] ?? 5 }]),
);
const KITCHEN = KITCHEN_PIN;
function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

const STREETS = [
  "Adesuwa Street",
  "Osayande Close",
  "Ikponmwosa Street",
  "Iyobosa Avenue",
  "Ogiemwonyi Street",
  "Uwaifo Close",
  "Ehigiator Street",
  "Omoruyi Lane",
  "Aiwerioba Close",
  "Akpata Street",
  "Okunbor Close",
  "Ugiagbe Street",
  "Erhabor Lane",
  "Oronsaye Street",
  "Iyamu Crescent",
  "Edokpolo Street",
  "Imafidon Close",
  "Ogbeide Avenue",
  "Idahosa Street",
  "Ekhator Lane",
];
const LANDMARKS = [
  "Opposite the filling station",
  "Behind the pharmacy",
  "Next to the church with the blue gate",
  "Near the mosque",
  "Two buildings after the school",
  "Yellow gate, beside the barber’s shop",
  "Opposite the market entrance",
  "Behind the bank",
  "Near the bus stop",
  "White storey building, second floor",
  "Hostel block C",
  "Beside the provision store",
  "Across from the hotel",
  "End of the street, black gate",
];

/* ---------- people ---------- */

// First names with gender, from across Nigeria (Edo, Yoruba, Igbo, Hausa, and English names).
const FIRST: [string, "female" | "male"][] = [
  ["Osaro", "male"],
  ["Efosa", "male"],
  ["Osagie", "male"],
  ["Eghosa", "male"],
  ["Ivie", "female"],
  ["Osas", "female"],
  ["Nosa", "male"],
  ["Imade", "female"],
  ["Ofure", "female"],
  ["Adesuwa", "female"],
  ["Osaretin", "male"],
  ["Itohan", "female"],
  ["Ehis", "male"],
  ["Esosa", "male"],
  ["Isoken", "female"],
  ["Iyobosa", "female"],
  ["Ewere", "female"],
  ["Uyiosa", "male"],
  ["Tunde", "male"],
  ["Bisi", "female"],
  ["Kemi", "female"],
  ["Funke", "female"],
  ["Seun", "male"],
  ["Yemi", "female"],
  ["Wale", "male"],
  ["Ronke", "female"],
  ["Tobi", "male"],
  ["Dayo", "male"],
  ["Bukola", "female"],
  ["Tolu", "female"],
  ["Emeka", "male"],
  ["Ada", "female"],
  ["Chioma", "female"],
  ["Obinna", "male"],
  ["Uche", "male"],
  ["Ifeoma", "female"],
  ["Nnamdi", "male"],
  ["Amaka", "female"],
  ["Kelechi", "male"],
  ["Chinedu", "male"],
  ["Nkechi", "female"],
  ["Ebuka", "male"],
  ["Aisha", "female"],
  ["Fatima", "female"],
  ["Ibrahim", "male"],
  ["Zainab", "female"],
  ["Sani", "male"],
  ["Halima", "female"],
  ["Grace", "female"],
  ["Joy", "female"],
  ["Peace", "female"],
  ["Daniel", "male"],
  ["Victor", "male"],
  ["Precious", "female"],
  ["Favour", "female"],
  ["Godwin", "male"],
  ["Patience", "female"],
  ["Esther", "female"],
  ["Mercy", "female"],
  ["Faith", "female"],
  ["Kingsley", "male"],
  ["Henry", "male"],
  ["Gift", "female"],
  ["Felix", "male"],
];
const LAST = [
  "Osagie",
  "Omoregie",
  "Igbinosa",
  "Ehigiator",
  "Uwaifo",
  "Ogbeide",
  "Aigbe",
  "Osayande",
  "Iyamu",
  "Erhabor",
  "Oronsaye",
  "Edokpolo",
  "Aimuanwosa",
  "Ekhator",
  "Idahosa",
  "Imafidon",
  "Ogiemwonyi",
  "Ugiagbe",
  "Adeyemi",
  "Ogunleye",
  "Balogun",
  "Adebayo",
  "Afolabi",
  "Olawale",
  "Bakare",
  "Okafor",
  "Nwosu",
  "Eze",
  "Okonkwo",
  "Chukwu",
  "Obi",
  "Nnaji",
  "Ibe",
  "Okeke",
  "Abdullahi",
  "Bello",
  "Yusuf",
  "Garba",
  "Danjuma",
];

type Customer = {
  userId: string;
  code: string;
  name: string;
  gender: "female" | "male";
  phone: string;
  weight: number;
  oneTimer: boolean;
  addresses: {
    id: string;
    label: string;
    area: string;
    lat: number;
    lng: number;
    street: string;
    landmark: string;
    isDefault: boolean;
  }[];
  firstOrder?: Date;
  used: boolean;
};

const taken = new Set(
  (
    await db
      .select({ code: t.customerProfile.code })
      .from(t.customerProfile)
      .where(sql`${t.customerProfile.userId} not like 'demo-customer-%'`)
  ).map((r) => Number(r.code.slice(2))),
);
const areaNames = Object.keys(PLACES);
const customers: Customer[] = [];
const usedNames = new Set<string>();
for (let n = 1, code = 1; customers.length < 250; n++) {
  while (taken.has(code)) code++;
  const [first, gender] = pick(FIRST);
  const name = `${first} ${pick(LAST)}`;
  if (usedNames.has(name)) continue;
  usedNames.add(name);
  const home = weighted(areaNames.map((a) => [a, PLACES[a]!.w] as const));
  const addr = (label: string, area: string, isDefault: boolean) => {
    const c = PLACES[area]!;
    return {
      id: randomUUID(),
      label,
      area,
      lat: +(c.lat + between(-0.004, 0.004)).toFixed(6),
      lng: +(c.lng + between(-0.004, 0.004)).toFixed(6),
      street: `${int(1, 48)} ${pick(STREETS)}`,
      landmark: pick(LANDMARKS),
      isDefault,
    };
  };
  const addresses = [addr("Home", home, true)];
  if (chance(0.35))
    addresses.push(
      addr(
        pick(["Work", "Office", "Shop", "Hostel"]),
        weighted(areaNames.map((a) => [a, PLACES[a]!.w] as const)),
        false,
      ),
    );
  const rank = customers.length + 1;
  customers.push({
    userId: `demo-customer-${String(n).padStart(4, "0")}`,
    code: `C-${String(code).padStart(5, "0")}`,
    name,
    gender,
    // 0800 numbers aren't mobile numbers, so no real person can be called by mistake.
    phone: `0800${String(1_000_000 + rank * 3_517).slice(-7)}`,
    weight: 1 / (rank + 12) ** 0.8, // regulars: the most loyal order most weekdays
    oneTimer: rank > 150, // about 60% reorder (18.3)
    addresses,
    used: false,
  });
  code++;
}
const repeaters = customers.filter((c) => !c.oneTimer);
const oneTimers = customers.filter((c) => c.oneTimer);
// Shuffle the regulars' weights so the most loyal customers aren't simply the first codes.
for (let i = repeaters.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [repeaters[i]!.weight, repeaters[j]!.weight] = [repeaters[j]!.weight, repeaters[i]!.weight];
}

/* ---------- the menu as people order it ---------- */

// Popularity: Jollof rice is the favourite, and combos sell well (18.3).
const MAINS: [string, number][] = [
  ["Jollof rice", 20],
  ["Fried rice", 11],
  ["Rice combo", 7],
  ["Soup of the day", 10],
  ["Classic Jollof Combo", 10],
  ["Office Lunch Combo", 8],
  ["Home Plate", 6],
];
const SIDES: [string, number][] = [
  ["Fried plantain", 9],
  ["Chicken", 5],
  ["Moi moi", 5],
  ["Coleslaw", 3],
  ["Beef", 3],
  ["Fish", 2],
  ["Pounded yam (extra)", 2],
  ["Eba (extra)", 2],
  ["Extra soup", 2],
];
const SNACKS_DRINKS: [string, number][] = [
  ["Soft drink", 10],
  ["Bottled water", 7],
  ["Meat pie", 6],
  ["Yoghurt drink", 4],
  ["Spring rolls", 3],
  ["Doughnut", 3],
];
const PROTEIN: [string, number][] = [
  ["Chicken", 58],
  ["Beef", 25],
  ["Fish", 11],
  ["No protein", 6],
];
const SWALLOW: [string, number][] = [
  ["Eba", 55],
  ["Pounded yam", 45],
];

type Line = {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: string[];
  station: (typeof t.station.enumValues)[number];
  load: number;
};

function line(name: string, day: string, soupName: string): Line {
  const it = item(name);
  const own = options.filter((o) => o.itemId === it.id);
  let opt: (typeof own)[number] | undefined;
  if (own.length) {
    const wanted = own.some((o) => o.name === "Eba") ? weighted(SWALLOW) : weighted(PROTEIN);
    opt = own.find((o) => o.name === wanted) ?? own[0];
  }
  const base = name === "Jollof rice" && day < JOLLOF_RISE_DAY ? 1800 : it.price;
  return {
    itemId: it.id,
    name: it.isSoup ? `${it.name} (${soupName})` : it.name,
    unitPrice: base + (opt?.priceChange ?? 0),
    quantity: chance(0.12) ? 2 : 1,
    options: opt ? [opt.name] : [],
    station: it.station,
    load: it.load,
  };
}

/** About 2.4 items an online order and 2.0 a walk-in (18.3): a main, often a side or a drink. */
function basket(day: string, soupName: string, online: boolean): Line[] {
  const lines: Line[] = [line(weighted(MAINS), day, soupName)];
  if (chance(online ? 0.18 : 0.08)) lines.push(line(weighted(MAINS), day, soupName));
  if (chance(online ? 0.42 : 0.3)) lines.push(line(weighted(SIDES), day, soupName));
  if (chance(online ? 0.6 : 0.5)) lines.push(line(weighted(SNACKS_DRINKS), day, soupName));
  // The same dish twice becomes one line with a quantity.
  const merged: Line[] = [];
  for (const l of lines) {
    const same = merged.find((m) => m.name === l.name && m.options.join() === l.options.join());
    if (same) same.quantity += l.quantity;
    else merged.push(l);
  }
  return merged;
}

/* ---------- reasons and notes ---------- */

const EARLY_CANCEL = [
  "Ordered by mistake",
  "Changed my mind",
  "Wrong address",
  "Want to add more items",
  "Ordered twice",
];
const REQUEST_REASON = [
  "Taking too long",
  "Plans changed",
  "Ordered the wrong thing",
  "Can’t receive it now",
];
const AFTER_REFUND = [
  "Arrived cold",
  "Missing drink",
  "Wrong protein",
  "Spilled in the bag",
  "Late delivery",
];
const WALKIN_CANCEL = ["Customer left", "Customer changed their mind", "Wrong order entered"];

/* ---------- rows to write ---------- */

type OrderRow = typeof t.order.$inferInsert;
const rows = {
  users: [] as (typeof t.user.$inferInsert)[],
  profiles: [] as (typeof t.customerProfile.$inferInsert)[],
  addresses: [] as (typeof t.address.$inferInsert)[],
  orders: [] as OrderRow[],
  lines: [] as (typeof t.orderItem.$inferInsert)[],
  events: [] as (typeof t.orderStatusEvent.$inferInsert)[],
  payments: [] as (typeof t.payment.$inferInsert)[],
  deliveries: [] as (typeof t.delivery.$inferInsert)[],
  refunds: [] as (typeof t.refund.$inferInsert)[],
  cancels: [] as (typeof t.cancellationRequest.$inferInsert)[],
  helps: [] as (typeof t.helpRequest.$inferInsert)[],
  alerts: [] as (typeof t.alert.$inferInsert)[],
  ratings: [] as (typeof t.rating.$inferInsert)[],
  audit: [] as (typeof t.auditLog.$inferInsert)[],
  payouts: [] as (typeof t.payout.$inferInsert)[],
  cashUps: [] as (typeof t.cashUp.$inferInsert)[],
  closes: [] as (typeof t.monthClose.$inferInsert)[],
  adjustments: [] as (typeof t.adjustment.$inferInsert)[],
};
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const demoRef = () => `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
const codeHash = (orderId: string) =>
  createHash("sha256")
    .update(`${orderId}:${String(int(0, 9999)).padStart(4, "0")}`)
    .digest("hex");

type Ev = {
  status: (typeof t.orderStatus.enumValues)[number];
  kind: "staff" | "customer" | "system";
  actor: string | null;
  at: Date;
};
function addEvents(orderId: string, evs: Ev[]) {
  for (const e of evs)
    rows.events.push({ orderId, status: e.status, actorKind: e.kind, actorId: e.actor, at: e.at });
}
function refund(
  o: OrderRow & { id: string },
  amount: number,
  reason: string,
  requestedBy: string,
  decidedBy: string | null,
  when: Date,
) {
  const kind = amount === o.total ? "full" : "partial";
  rows.refunds.push({
    orderId: o.id,
    amount,
    kind,
    reason,
    status: "completed",
    requestedBy,
    decidedBy,
    requestedAt: when,
    completedAt: plus(when, 0.2),
  });
  rows.audit.push({
    actorId: decidedBy ?? requestedBy,
    kind: "money",
    action: `Refunded ${naira(amount)} for ${o.number} (${reason})`,
    target: `order:${o.id}`,
    after: { amount, kind, reason },
    at: plus(when, 0.2),
    isDemo: true,
  });
}
/** A partial refund: a round amount, never more than 99% of what was paid (owner decision). */
const partialOf = (total: number, share: number) =>
  Math.max(100, Math.min(Math.floor(total * 0.99), round(total * share, 100)));

/* ---------- the days ---------- */

/** How long a rider waits at the kitchen for a second order going the same way. */
const BATCH_WINDOW_MS = 10 * 60_000;

type Plan = {
  riderId: string;
  accepted: Date;
  picked: Date;
  stop: number;
  group: string;
  assignedBy: string | null;
  delivered: Date;
  actual?: Date;
};
type Task = {
  ready: Date;
  drop: { lat: number; lng: number };
  load: number;
  finish: (plan?: Plan) => void;
};

/**
 * Hands the day's deliveries to riders in the order they became ready (section 6). Orders ready
 * within 10 minutes of each other, going the same way (within the batch distance) and within the
 * load budget, ride together, up to three, and are dropped off nearest first. Each group goes to
 * whoever is free first. When an order waits more than 15 minutes, dispatch often steps in and
 * assigns it (DSP-05).
 */
function planRiders(tasks: Task[], riders: { id: string; freeAt: Date }[]) {
  tasks.sort((a, b) => a.ready.getTime() - b.ready.getTime());
  const groups: Task[][] = [];
  for (const task of tasks) {
    // Any group started in the last 10 minutes that this order fits, if the rider takes it along.
    const fits = (g: Task[]) =>
      g.length < 3 &&
      task.ready.getTime() - g[0]!.ready.getTime() <= BATCH_WINDOW_MS &&
      g.every((x) => metres(x.drop, task.drop) <= setting!.batchDistanceM) &&
      g.reduce((s, x) => s + x.load, 0) + task.load <= setting!.capacityBudget;
    const open = groups.filter(
      (g) => task.ready.getTime() - g[0]!.ready.getTime() <= BATCH_WINDOW_MS,
    );
    const g = open.find(fits);
    if (g && chance(0.8)) g.push(task);
    else groups.push([task]);
  }
  groups.sort((a, b) => a[0]!.ready.getTime() - b[0]!.ready.getTime());
  for (const g of groups) {
    const first = g[0]!.ready;
    const lastReady = g.at(-1)!.ready;
    const rider = riders.reduce((a, b) => (a.freeAt <= b.freeAt ? a : b));
    // A free rider at the kitchen hears the new order and takes it within a few minutes; now and
    // then one is slow (on a call, finishing food).
    const earliest = plus(first, between(0.5, 4) + (chance(0.1) ? between(2, 5) : 0));
    const accepted = rider.freeAt > earliest ? plus(rider.freeAt, between(0.5, 2)) : earliest;
    const waited = (accepted.getTime() - first.getTime()) / 60_000;
    const assignedBy = waited > 15 && chance(0.4) ? DISPATCH : null;
    const picked = plus(accepted > lastReady ? accepted : lastReady, between(1.5, 4));
    const stops = [...g].sort((a, b) => metres(KITCHEN, a.drop) - metres(KITCHEN, b.drop));
    const group = randomUUID();
    let clock = picked;
    let from = KITCHEN;
    for (const [i, s] of stops.entries()) {
      const leg = metres(from, s.drop);
      const ride =
        4 + (leg / 1000) * 2.5 + between(0, 4) + (chance(0.04) ? between(6, 12) : 0) + (i ? 2 : 0);
      const ownAccept = accepted > s.ready ? accepted : plus(s.ready, between(0.3, 1));
      const plan: Plan = {
        riderId: rider.id,
        accepted: ownAccept,
        picked,
        stop: i + 1,
        group,
        assignedBy,
        delivered: plus(clock, ride),
      };
      s.finish(plan);
      clock = plan.actual ?? plan.delivered;
      from = s.drop;
    }
    // Back to the kitchen for the next one.
    rider.freeAt = plus(clock, 2 + (metres(from, KITCHEN) / 1000) * 2.5 + between(1, 4));
  }
}

const DOW_ONLINE = [0.92, 1.0, 0.97, 1.0, 1.02, 1.1, 1.08]; // Sunday to Saturday
let onlineNo = 0;
let lastSoup = "";
type RiderClock = {
  id: string;
  freeAt: Date;
  carrying: {
    readyAt: Date;
    pickedAt: Date;
    deliveredAt: Date;
    load: number;
    drop: { lat: number; lng: number };
    group: string;
  }[];
};

for (const [dayIndex, day] of days.entries()) {
  const weekday = dow(day);
  const weekend = weekday === 0 || weekday === 6;
  const trend = 0.86 + 0.26 * (dayIndex / (DAYS - 1)); // growing over the three months
  const independence = day.slice(5) === "10-01"; // 1 October: offices closed, more walk-ins
  const noise = () => between(0.9, 1.1);
  const onlineCount = Math.round(
    (weekend ? 25 : 40) * DOW_ONLINE[weekday]! * trend * noise() * (independence ? 0.8 : 1),
  );
  const walkinCount = Math.round((weekend ? 8 : 13) * trend * noise() * (independence ? 1.35 : 1));

  // Today's soup: a different one from yesterday most days.
  let soup = pick(soups);
  if (soup.name === lastSoup && chance(0.8))
    soup = pick(soups.filter((x) => x.name !== lastSoup)) ?? soup;
  lastSoup = soup.name;

  // Two kitchen shifts, 08:00 to 14:00 and 14:00 to 20:30; Blessing and Samuel swap each week.
  const swap = Math.floor(dayIndex / 7) % 2 === 1;
  const onShift = (d: Date) => (minutesOf(d) < 14 * 60 ? (swap ? K2 : K1) : swap ? K1 : K2);
  const riders: RiderClock[] = RIDERS.filter((r) => r !== UYI || day <= UYI_LAST_DAY).map((id) => ({
    id,
    freeAt: at(day, 8 * 60),
    carrying: [],
  }));

  const onlineTimes = Array.from({ length: onlineCount }, () =>
    weighted([
      [() => between(12 * 60, 14.5 * 60), 0.34],
      [() => between(16.5 * 60, 18 * 60), 0.22],
      [() => between(8 * 60, 18 * 60), 0.44],
    ] as const)(),
  ).sort((a, b) => a - b);
  const walkinTimes = Array.from({ length: walkinCount }, () =>
    weighted([
      [() => between(12 * 60, 14.5 * 60), 0.35],
      [() => between(17 * 60, 20.5 * 60), 0.35],
      [() => between(8 * 60, 20.5 * 60), 0.3],
    ] as const)(),
  ).sort((a, b) => a - b);

  /* ----- online orders ----- */
  const later: Task[] = [];
  for (const minute of onlineTimes) {
    onlineNo++;
    const placed = at(day, Math.min(minute, 18 * 60));
    let c = chance(0.035) ? oneTimers.find((x) => !x.used) : undefined;
    if (!c) c = weighted(repeaters.map((x) => [x, x.weight] as const));
    c.used = true;
    c.firstOrder ??= placed;
    const type = chance(0.85) ? "delivery" : "pickup";
    const address =
      type === "delivery"
        ? c.addresses.length > 1 && chance(0.3)
          ? c.addresses[1]!
          : c.addresses[0]!
        : undefined;
    const lines = basket(day, soup.name, true);
    const food = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const fee = type === "delivery" ? setting.deliveryFee : 0;
    const id = randomUUID();
    const o: OrderRow & { id: string } = {
      id,
      number: `O-${String(onlineNo).padStart(4, "0")}`,
      businessDate: day,
      channel: "online",
      customerId: c.userId,
      type,
      status: "confirmed",
      foodTotal: food,
      deliveryFee: fee,
      total: food + fee,
      paymentMethod: chance(0.6) ? "card" : "transfer",
      addressId: address?.id ?? null,
      neighbourhoodId: address ? areas.find((a) => a.name === address.area)!.id : null,
      deliveryCodeHash: type === "delivery" ? codeHash(id) : null,
      soupVarietyId: lines.some(
        (l) => l.name.startsWith("Soup of the day") || l.name.startsWith("Extra soup"),
      )
        ? soup.id
        : null,
      placedAt: placed,
      isDemo: true,
    };
    for (const l of lines) rows.lines.push({ ...l, orderId: id, ticked: true });
    rows.payments.push({
      orderId: id,
      method: o.paymentMethod,
      demoRef: demoRef(),
      amount: o.total,
      status: "confirmed",
      at: placed,
    });
    const evs: Ev[] = [
      { status: "placed", kind: "customer", actor: c.userId, at: placed },
      { status: "confirmed", kind: "system", actor: null, at: plus(placed, 0.02) },
    ];
    const outcome = weighted([
      ["early_cancel", 4],
      ["late_cancel", 2],
      ["issue", type === "delivery" ? 2 : 0],
      ["done", 92],
    ] as const);

    if (outcome === "early_cancel") {
      // Cancelled by the customer before the kitchen acknowledged: refunded in full (4.6).
      const when = plus(placed, between(0.6, 2.5));
      const reason = pick(EARLY_CANCEL);
      evs.push({ status: "cancelled", kind: "customer", actor: c.userId, at: when });
      Object.assign(o, { status: "cancelled", cancelledAt: when });
      refund(o, o.total, reason, c.userId, null, when);
      rows.payments.at(-1)!.status = "refunded";
      addEvents(id, evs);
      rows.orders.push(o);
      continue;
    }

    const kitchenAck = plus(placed, between(1, 3) + (chance(0.04) ? between(3, 6) : 0));
    const cook = onShift(kitchenAck);
    evs.push({ status: "acknowledged", kind: "staff", actor: cook, at: kitchenAck });
    const preparing = plus(kitchenAck, between(0.5, 2.5));
    evs.push({ status: "preparing", kind: "staff", actor: cook, at: preparing });
    o.acknowledgedAt = kitchenAck;

    if (outcome === "late_cancel") {
      // The customer asked once the kitchen had it; dispatch (or a manager on Sundays) approved,
      // with a full refund or, when the food was already cooking, a partial one (4.6).
      const asked = plus(preparing, between(2, 7));
      const decided = plus(asked, between(2, 9));
      const decider = weekday === 0 ? MANAGER2 : DISPATCH;
      const reason = pick(REQUEST_REASON);
      const reqId = randomUUID();
      rows.cancels.push({
        id: reqId,
        orderId: id,
        customerId: c.userId,
        reason,
        status: "approved",
        decidedBy: decider,
        requestedAt: asked,
        decidedAt: decided,
      });
      rows.alerts.push({
        kind: "cancellation_request",
        orderId: id,
        requestId: reqId,
        createdAt: asked,
        clearedBy: decider,
        clearedAt: decided,
      });
      evs.push({ status: "cancelled", kind: "staff", actor: decider, at: decided });
      Object.assign(o, { status: "cancelled", cancelledAt: decided });
      const amount = chance(0.55) ? o.total : partialOf(o.total, between(0.5, 0.85));
      refund(o, amount, `Customer request: ${reason}`, c.userId, decider, decided);
      if (amount === o.total) rows.payments.at(-1)!.status = "refunded";
      rows.audit.push({
        actorId: decider,
        kind: "other",
        action: `Cancelled ${o.number} (Customer request: ${reason})`,
        target: `order:${id}`,
        at: decided,
        isDemo: true,
      });
      addEvents(id, evs);
      rows.orders.push(o);
      continue;
    }

    // Plating and packing: the rice and soups are cooked ahead, so 5 to 13 minutes, with the odd
    // slow one (a fresh pot, a big order).
    const ready = plus(kitchenAck, between(5, 13) + (chance(0.06) ? between(6, 14) : 0));
    o.readyAt = ready;

    // Riders are given orders in the order they become ready, not the order they were placed, so
    // a delivery's last steps wait until every order of the day has been cooked.
    const finish = (plan?: Plan) => {
      if (type === "pickup") {
        evs.push({
          status: "ready_for_collection",
          kind: "staff",
          actor: onShift(ready),
          at: ready,
        });
        const collected = plus(ready, between(3, 25));
        evs.push({ status: "collected", kind: "staff", actor: onShift(collected), at: collected });
        Object.assign(o, { status: "collected", collectedAt: collected });
      } else {
        evs.push({ status: "ready", kind: "staff", actor: onShift(ready), at: ready });
        // The rider, pickup, stop, and delivery time come from the day's plan (below): orders
        // ready close together and going the same way ride together, nearest first (section 6).
        const drop = { lat: address!.lat, lng: address!.lng };
        const distance = metres(KITCHEN, drop);
        const { riderId, picked, stop, group, assignedBy } = plan!;
        const accepted = plan!.accepted;
        const ride = (plan!.delivered.getTime() - picked.getTime()) / 60_000;
        const waited = (accepted.getTime() - ready.getTime()) / 60_000;
        if (waited > setting.alertRiderMin) {
          // Nobody took it within the "waiting for a rider" time in Settings, Alerts (5 minutes
          // usually): the alert, cleared when a rider (or dispatch) acts.
          rows.alerts.push({
            kind: "unaccepted",
            orderId: id,
            createdAt: plus(ready, setting.alertRiderMin),
            clearedBy: assignedBy,
            clearedAt: accepted,
          });
        }
        let delivered = plan!.delivered;
        evs.push({
          status: "rider_accepted",
          kind: "staff",
          actor: assignedBy ?? riderId,
          at: accepted,
        });
        evs.push({ status: "picked_up", kind: "staff", actor: riderId, at: picked });
        let manualBy: string | null = null;
        if (outcome === "issue") {
          // The customer couldn't be reached or the code didn't work: the rider asked for help, and
          // dispatch approved a manual completion or kept it open until the customer came out (DSP-04).
          const asked = plus(picked, ride + between(1, 3));
          const resolved = plus(asked, between(4, 14));
          const reason = chance(0.7)
            ? "customer_unreachable"
            : chance(0.8)
              ? "code_problem"
              : "other";
          const manual = chance(0.7);
          const helpId = randomUUID();
          rows.helps.push({
            id: helpId,
            orderId: id,
            riderId,
            reason,
            status: "resolved",
            resolution: manual ? "manual_completion" : "kept_open",
            resolvedBy: DISPATCH,
            createdAt: asked,
            resolvedAt: resolved,
          });
          rows.alerts.push({
            kind: "help_request",
            orderId: id,
            requestId: helpId,
            createdAt: asked,
            clearedBy: DISPATCH,
            clearedAt: resolved,
          });
          delivered = manual ? resolved : plus(resolved, between(2, 8));
          if (manual) {
            manualBy = DISPATCH;
            rows.audit.push({
              actorId: DISPATCH,
              kind: "other",
              action: `Approved a manual completion for ${o.number}`,
              target: `order:${id}`,
              after: { reason },
              at: resolved,
              isDemo: true,
            });
          }
        }
        const arriving = plus(delivered, -between(2, 4));
        if (arriving > picked)
          evs.push({ status: "arriving", kind: "staff", actor: riderId, at: arriving });
        evs.push({
          status: "delivered",
          kind: "staff",
          actor: manualBy ?? riderId,
          at: delivered,
        });
        plan!.actual = delivered;
        rows.deliveries.push({
          orderId: id,
          riderId,
          batchGroup: group,
          stopNumber: stop,
          assignedBy,
          acceptedAt: accepted,
          pickedUpAt: picked,
          deliveredAt: delivered,
          distanceM: distance,
          riderPay: setting.riderPay,
          manualCompletionBy: manualBy,
        });
        Object.assign(o, {
          status: "delivered",
          pickedUpAt: picked,
          deliveredAt: delivered,
          codeAttempts: chance(0.06) ? 1 : 0,
        });
      }

      const finished = (o.deliveredAt ?? o.collectedAt)!;
      // A few finished orders get a small refund from a manager afterwards (MGR-15).
      if (chance(0.012)) {
        const when = plus(finished, between(15, 120));
        refund(
          o,
          Math.min(partialOf(o.total, between(0.1, 0.35)), Math.floor(o.total * 0.99)),
          pick(AFTER_REFUND),
          c.userId,
          weekday === 0 ? MANAGER2 : OWNER,
          when,
        );
      }
      // Ratings lean positive; slow orders score lower (CUS-18).
      if (chance(0.45)) {
        const slow = (finished.getTime() - placed.getTime()) / 60_000 > 60;
        const stars = slow
          ? weighted([
              [5, 20],
              [4, 35],
              [3, 30],
              [2, 10],
              [1, 5],
            ] as const)
          : weighted([
              [5, 64],
              [4, 26],
              [3, 7],
              [2, 2],
              [1, 1],
            ] as const);
        rows.ratings.push({
          orderId: id,
          customerId: c.userId,
          stars,
          at: plus(finished, between(3, 90)),
          isDemo: true,
        });
      }
      addEvents(id, evs);
      rows.orders.push(o);
    };
    if (type === "pickup") finish();
    else {
      const load = lines.reduce((sum, l) => sum + l.load * l.quantity, 0);
      later.push({ ready, drop: { lat: address!.lat, lng: address!.lng }, load, finish });
    }
  }
  planRiders(later, riders);

  /* ----- walk-in orders ----- */
  for (const [i, minute] of walkinTimes.entries()) {
    const placed = at(day, Math.min(minute, 20.5 * 60));
    const staffer = chance(0.05) ? (weekday === 0 ? MANAGER2 : OWNER) : onShift(placed);
    const lines = basket(day, soup.name, false);
    const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const method = weighted([
      ["cash", 55],
      ["card", 25],
      ["transfer", 20],
    ] as const);
    // Cash: about a third pay the exact amount; the rest hand over the next round ₦500 or ₦1,000.
    let received: number | null = null;
    if (method === "cash") {
      const step = weighted([
        [500, 2],
        [1000, 5],
      ] as const);
      const up = Math.ceil(total / step) * step;
      received = chance(0.35) ? total : up === total ? total + step : up;
    }
    const id = randomUUID();
    const o: OrderRow & { id: string } = {
      id,
      number: `W-${String(i + 1).padStart(3, "0")}`,
      businessDate: day,
      channel: "walkin",
      type: chance(0.6) ? "take_away" : "eat_in",
      status: "confirmed",
      foodTotal: total,
      deliveryFee: 0,
      total,
      paymentMethod: method,
      enteredBy: staffer,
      label: chance(0.4) ? pick(FIRST)[0] : null,
      soupVarietyId: lines.some((l) => l.name.includes("(")) ? soup.id : null,
      placedAt: placed,
      isDemo: true,
    };
    for (const l of lines) rows.lines.push({ ...l, orderId: id, ticked: true });
    rows.payments.push({
      orderId: id,
      method,
      demoRef: demoRef(),
      amount: total,
      cashReceived: received,
      changeDue: received === null ? null : received - total,
      takenBy: staffer,
      status: "confirmed",
      at: placed,
    });
    const ack = plus(placed, between(0.3, 1.5));
    const cook = onShift(ack);
    const evs: Ev[] = [
      { status: "placed", kind: "staff", actor: staffer, at: placed },
      { status: "confirmed", kind: "staff", actor: staffer, at: plus(placed, 0.05) },
      { status: "acknowledged", kind: "staff", actor: cook, at: ack },
      { status: "preparing", kind: "staff", actor: cook, at: plus(ack, between(0.3, 1.5)) },
    ];
    o.acknowledgedAt = ack;
    if (chance(0.02)) {
      // Cancelled at the counter before it was ready: refunded by the staff member (4.6).
      const when = plus(ack, between(2, 6));
      const reason = pick(WALKIN_CANCEL);
      evs.push({ status: "cancelled", kind: "staff", actor: cook, at: when });
      Object.assign(o, { status: "cancelled", cancelledAt: when });
      const amount = chance(0.8) ? total : partialOf(total, between(0.5, 0.8));
      refund(o, amount, `Cancelled: ${reason}`, cook, cook, when);
      if (amount === total) rows.payments.at(-1)!.status = "refunded";
    } else {
      const ready = plus(ack, between(6, 15));
      const collected = plus(ready, between(1, 6));
      evs.push({ status: "ready_for_collection", kind: "staff", actor: onShift(ready), at: ready });
      evs.push({ status: "collected", kind: "staff", actor: onShift(collected), at: collected });
      Object.assign(o, { status: "collected", readyAt: ready, collectedAt: collected });
    }
    addEvents(id, evs);
    rows.orders.push(o);
  }

  /* ----- the day's cash-up (ACC-04) ----- */
  const dayCash = rows.payments
    .filter((p) => p.method === "cash" && watDate(p.at as Date) === day)
    .reduce((s, p) => s + p.amount, 0);
  const dayIds = new Set(
    rows.orders
      .filter((x) => x.businessDate === day && x.channel === "walkin" && x.paymentMethod === "cash")
      .map((x) => x.id),
  );
  const cashRefunds = rows.refunds
    .filter((r) => dayIds.has(r.orderId))
    .reduce((s, r) => s + r.amount, 0);
  const expected = dayCash - cashRefunds;
  const off = chance(0.12)
    ? weighted([
        [-500, 2],
        [-200, 4],
        [-100, 4],
        [100, 2],
        [200, 1],
      ] as const)
    : 0;
  const closer = swap ? K1 : K2; // the afternoon shift counts the drawer
  const countedAt = at(day, 20 * 60 + 42);
  const isYesterday = day === lastDay; // left for the account officer to sign off in a demo
  const signer = chance(0.85) ? ACCOUNTS : OWNER;
  const signedAt = at(addDays(day, 1), 9 * 60 + int(10, 50));
  const cashUpId = randomUUID();
  rows.cashUps.push({
    id: cashUpId,
    businessDate: day,
    expected,
    counted: expected + off,
    countedBy: closer,
    countedAt,
    signedOffBy: isYesterday ? null : signer,
    signedOffAt: isYesterday ? null : signedAt,
    note:
      off < 0
        ? `Short ${naira(-off)}: change given wrongly at the counter`
        : off > 0
          ? `Over ${naira(off)}: a customer left their change`
          : null,
    isDemo: true,
  });
  rows.audit.push({
    actorId: closer,
    kind: "money",
    action: `Counted the cash for ${day}: ${naira(expected + off)} (expected ${naira(expected)})`,
    target: `cash-up:${cashUpId}`,
    at: countedAt,
    isDemo: true,
  });
  if (!isYesterday)
    rows.audit.push({
      actorId: signer,
      kind: "money",
      action: `Signed off the cash-up for ${day}`,
      target: `cash-up:${cashUpId}`,
      at: signedAt,
      isDemo: true,
    });
}

/* ---------- customers, now that their first orders are known ---------- */

for (const c of customers.filter((x) => x.firstOrder)) {
  const joined = plus(c.firstOrder!, -between(2, 25));
  rows.users.push({
    id: c.userId,
    name: c.name,
    email: `${c.code.toLowerCase()}@example.com`,
    emailVerified: true,
    role: "customer",
    isDemo: true,
    createdAt: joined,
    updatedAt: joined,
  });
  rows.profiles.push({
    userId: c.userId,
    code: c.code,
    name: c.name,
    gender: chance(0.8) ? c.gender : null,
    defaultAddressId: c.addresses[0]!.id,
    createdAt: joined,
  });
  for (const a of c.addresses)
    rows.addresses.push({
      id: a.id,
      userId: c.userId,
      label: a.label,
      street: a.street,
      landmark: a.landmark,
      neighbourhoodId: areas.find((x) => x.name === a.area)!.id,
      contactPhone: c.phone,
      lat: a.lat,
      lng: a.lng,
      isDefault: a.isDefault,
      createdAt: joined,
    });
}

/* ---------- the Jollof price change, audit-logged ---------- */

rows.audit.push({
  actorId: OWNER,
  kind: "setting",
  action: "Changed the price of Jollof rice from ₦1,800 to ₦2,000",
  target: `item:${item("Jollof rice").id}`,
  before: { price: 1800 },
  after: { price: 2000 },
  at: at(JOLLOF_RISE_DAY, 7 * 60 + 41),
  isDemo: true,
});

/* ---------- weekly rider payouts (18.2, ACC-02): Monday to Sunday ---------- */

const monday = (day: string) => addDays(day, -((dow(day) + 6) % 7));
for (const riderId of RIDERS) {
  const mine = rows.deliveries.filter((d) => d.riderId === riderId);
  const weeks = [...new Set(mine.map((d) => monday(watDate(d.deliveredAt as Date))))].sort();
  for (const w of weeks) {
    const end = addDays(w, 6);
    const inWeek = mine.filter((d) => monday(watDate(d.deliveredAt as Date)) === w);
    const current = end >= today; // this week isn't over: still owed
    const paidAt = at(addDays(w, 7), 10 * 60 + int(0, 40));
    const amount = inWeek.reduce((s, d) => s + (d.riderPay ?? 0), 0);
    const payer = chance(0.85) ? ACCOUNTS : OWNER;
    rows.payouts.push({
      riderId,
      periodStart: w < firstDay ? firstDay : w,
      periodEnd: end > lastDay ? lastDay : end,
      deliveries: inWeek.length,
      amount,
      status: current ? "owed" : "paid",
      paidAt: current ? null : paidAt,
      paidBy: current ? null : payer,
      isDemo: true,
    });
    if (!current)
      rows.audit.push({
        actorId: payer,
        kind: "money",
        action: `Marked ${naira(amount)} as paid to ${staffCode(riderId)} for ${w} to ${end}`,
        target: `payout:${riderId}:${w}`,
        at: paidAt,
        isDemo: true,
      });
  }
}
function staffCode(userId: string) {
  return staff.find((s) => s.userId === userId)!.code;
}

/* ---------- closed months (ACC-07) and one correction ---------- */

const months = [...new Set(days.map((d) => d.slice(0, 7)))].filter(
  (m) => `${m}-01` < `${today.slice(0, 7)}-01`,
);
for (const m of months) {
  const inMonth = rows.orders.filter((o) => o.businessDate.startsWith(m));
  const sum = (f: (o: OrderRow) => boolean) => inMonth.filter(f).reduce((s, o) => s + o.total, 0);
  const ids = new Set(inMonth.map((o) => o.id));
  const refunds = rows.refunds.filter((r) => ids.has(r.orderId)).reduce((s, r) => s + r.amount, 0);
  const fees = inMonth
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + (o.deliveryFee ?? 0), 0);
  const riderPay = rows.deliveries
    .filter((d) => ids.has(d.orderId))
    .reduce((s, d) => s + (d.riderPay ?? 0), 0);
  const variance = rows.cashUps
    .filter((c) => c.businessDate.startsWith(m))
    .reduce((s, c) => s + (c.counted - c.expected), 0);
  const sales = sum(() => true);
  const snapshot = {
    sales,
    online: sum((o) => o.channel === "online"),
    walkin: sum((o) => o.channel === "walkin"),
    byMethod: {
      cash: sum((o) => o.paymentMethod === "cash"),
      card: sum((o) => o.paymentMethod === "card"),
      transfer: sum((o) => o.paymentMethod === "transfer"),
    },
    refunds,
    deliveryFees: fees,
    riderPayEarned: riderPay,
    cashVariance: variance,
    net: sales - refunds - riderPay + variance,
    orders: inMonth.length,
  };
  const closedAt = at(`${addDays(`${m}-28`, 5).slice(0, 7)}-0${int(2, 4)}`, 11 * 60 + int(0, 50));
  const closer = chance(0.8) ? ACCOUNTS : OWNER;
  rows.closes.push({ month: `${m}-01`, closedBy: closer, closedAt, snapshot, isDemo: true });
  rows.audit.push({
    actorId: closer,
    kind: "money",
    action: `Closed ${m}: net ${naira(snapshot.net)}`,
    target: `month:${m}`,
    at: closedAt,
    isDemo: true,
  });
}
// A correction found after a month closed goes into the next open month (ACC-07).
const lastClosed = months.at(-1);
if (lastClosed) {
  const late = rows.cashUps
    .filter((c) => c.businessDate.startsWith(lastClosed) && c.counted < c.expected)
    .at(-1);
  if (late) {
    const when = at(addDays(lastDay, -3), 10 * 60 + 5);
    rows.adjustments.push({
      month: `${today.slice(0, 7)}-01`,
      amount: late.expected - late.counted,
      reason: `Cash found in the drawer later, from the ${late.businessDate} cash-up`,
      cashUpId: late.id!,
      enteredBy: ACCOUNTS,
      at: when,
      isDemo: true,
    });
    rows.audit.push({
      actorId: ACCOUNTS,
      kind: "money",
      action: `Entered an adjustment of ${naira(late.expected - late.counted)} for the ${late.businessDate} cash-up (closed month)`,
      target: `cash-up:${late.id}`,
      at: when,
      isDemo: true,
    });
  }
}

/* ---------- running late (MGR-14): the timed check, as the API runs it ---------- */

// An order that sat in a stage longer than the times in Settings, Alerts got a "stuck" alert and
// was marked Delayed ("Running a little late"); the alert cleared when the order was finished.
// One per order, at the first stage that ran over, as the API does when nobody clears it by hand.
const lateBy = { acknowledge: 0, kitchen: 0, road: 0 };
{
  const deliveryOf = new Map(rows.deliveries.map((d) => [d.orderId, d]));
  const min = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60_000;
  for (const o of rows.orders) {
    const end = (o.deliveredAt ?? o.collectedAt ?? o.cancelledAt) as Date;
    const placed = o.placedAt as Date;
    const ack = o.acknowledgedAt as Date | undefined;
    const ready = o.readyAt as Date | undefined;
    const picked = deliveryOf.get(o.id!)?.pickedUpAt as Date | undefined;
    let at: Date | null = null;
    let stage: keyof typeof lateBy | null = null;
    if (min(placed, ack ?? end) > setting.alertAcknowledgeMin)
      ((at = plus(placed, setting.alertAcknowledgeMin)), (stage = "acknowledge"));
    else if (ack && min(ack, ready ?? end) > setting.alertKitchenMin)
      ((at = plus(ack, setting.alertKitchenMin)), (stage = "kitchen"));
    else if (picked && min(picked, end) > setting.alertRoadMin)
      ((at = plus(picked, setting.alertRoadMin)), (stage = "road"));
    if (!at || !stage) continue;
    lateBy[stage]++;
    o.exception = "delayed";
    rows.alerts.push({ kind: "stuck", orderId: o.id!, createdAt: at, clearedAt: end });
  }
}

/* ---------- checks before anything is saved (18.3, quality rules) ---------- */

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);
const now = new Date();
for (const o of rows.orders) {
  const m = minutesOf(o.placedAt as Date);
  if ((o.placedAt as Date) > now) fail(`${o.number} on ${o.businessDate} is in the future`);
  if (o.channel === "online" && (m < 8 * 60 || m > 18 * 60))
    fail(`${o.number} on ${o.businessDate} was placed outside 08:00 to 18:00`);
  if (o.channel === "walkin" && (m < 8 * 60 || m > 20.5 * 60))
    fail(`${o.number} on ${o.businessDate} was placed outside 08:00 to 20:30`);
}
const linesBy = Map.groupBy(rows.lines, (l) => l.orderId);
const eventsBy = Map.groupBy(rows.events, (e) => e.orderId);
const refundsBy = Map.groupBy(rows.refunds, (r) => r.orderId);
const payBy = new Map(rows.payments.map((p) => [p.orderId, p]));
for (const o of rows.orders) {
  const food = (linesBy.get(o.id!) ?? []).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  if (food !== o.foodTotal || o.total !== o.foodTotal + (o.deliveryFee ?? 0))
    fail(`${o.number} totals don’t add up`);
  if (payBy.get(o.id!)?.amount !== o.total) fail(`${o.number} payment doesn’t match the total`);
  const evs = eventsBy.get(o.id!) ?? [];
  for (let i = 1; i < evs.length; i++)
    if ((evs[i]!.at as Date) < (evs[i - 1]!.at as Date))
      fail(`${o.number} timeline is out of order`);
  if (evs.at(-1)?.status !== o.status) fail(`${o.number} last event doesn’t match its status`);
  if (!evs.some((e) => e.actorKind === "staff") && o.status !== "cancelled")
    fail(`${o.number} has no staff attribution`);
  const refunded = (refundsBy.get(o.id!) ?? []).reduce((s, r) => s + r.amount, 0);
  if (refunded > o.total) fail(`${o.number} refunded more than it cost`);
  for (const r of refundsBy.get(o.id!) ?? [])
    if (r.kind === "partial" && r.amount > Math.floor(o.total * 0.99))
      fail(`${o.number} partial refund is over 99%`);
  if (o.status === "cancelled" && refunded === 0)
    fail(`${o.number} was cancelled without a refund`);
  const pay = payBy.get(o.id!)!;
  if (pay.method === "cash" && (pay.cashReceived ?? 0) < o.total)
    fail(`${o.number} cash received is less than the total`);
}
const online = rows.orders
  .filter((o) => o.channel === "online")
  .map((o) => Number(o.number.slice(2)))
  .sort((a, b) => a - b);
if (online.some((n, i) => n !== i + 1)) fail("Online order numbers aren’t continuous from O-0001");
for (const day of days) {
  const w = rows.orders
    .filter((o) => o.channel === "walkin" && o.businessDate === day)
    .map((o) => Number(o.number.slice(2)));
  if (w.some((n, i) => n !== i + 1)) fail(`Walk-in numbers on ${day} aren’t W-001 onwards`);
}
for (const riderId of RIDERS) {
  const spans = rows.deliveries
    .filter((d) => d.riderId === riderId)
    .map((d) => [(d.acceptedAt as Date).getTime(), (d.deliveredAt as Date).getTime()] as const);
  for (const [s] of spans)
    if (spans.filter(([a, b]) => a <= s && s < b).length > 3)
      fail(`${staffCode(riderId)} carried more than three orders at once`);
  if (
    riderId === UYI &&
    rows.deliveries.some((d) => d.riderId === UYI && watDate(d.deliveredAt as Date) > UYI_LAST_DAY)
  )
    fail("Uyi delivered after leaving");
}
for (const p of rows.payouts) {
  const sum = rows.deliveries
    .filter(
      (d) =>
        d.riderId === p.riderId &&
        watDate(d.deliveredAt as Date) >= p.periodStart &&
        watDate(d.deliveredAt as Date) <= p.periodEnd,
    )
    .reduce((s, d) => s + (d.riderPay ?? 0), 0);
  if (sum !== p.amount)
    fail(`Payout for ${staffCode(p.riderId)} from ${p.periodStart} doesn’t match its deliveries`);
}
if (problems.length) {
  console.error(
    `The history didn’t pass its checks (${problems.length}):\n- ${problems.slice(0, 20).join("\n- ")}`,
  );
  await client.end();
  process.exit(1);
}

/* ---------- write it all in one transaction ---------- */

const realOnline = await db
  .select({ n: sql<number>`count(*)::int` })
  .from(t.order)
  .where(and(eq(t.order.channel, "online"), eq(t.order.isDemo, false)));
if (realOnline[0]!.n > 0) {
  console.error(
    "Real online orders exist, so the demo order numbers would clash. Nothing was changed.",
  );
  await client.end();
  process.exit(1);
}

async function chunked<T>(rowsOf: T[], write: (part: T[]) => Promise<unknown>) {
  for (let i = 0; i < rowsOf.length; i += 1000) await write(rowsOf.slice(i, i + 1000));
}

await db.transaction(async (tx) => {
  // Wipe the old demo history first (MGR-29).
  const old = (
    await tx.select({ id: t.order.id }).from(t.order).where(eq(t.order.isDemo, true))
  ).map((r) => r.id);
  for (let i = 0; i < old.length; i += 2000) {
    const part = old.slice(i, i + 2000);
    await tx.delete(t.alert).where(inArray(t.alert.orderId, part));
    await tx.delete(t.helpRequest).where(inArray(t.helpRequest.orderId, part));
    await tx.delete(t.cancellationRequest).where(inArray(t.cancellationRequest.orderId, part));
    await tx.delete(t.refund).where(inArray(t.refund.orderId, part));
    await tx.delete(t.delivery).where(inArray(t.delivery.orderId, part));
    await tx.delete(t.rating).where(inArray(t.rating.orderId, part));
    await tx.delete(t.order).where(inArray(t.order.id, part)); // lines, payments, events cascade
  }
  await tx.delete(t.auditLog).where(eq(t.auditLog.isDemo, true));
  await tx.delete(t.payout).where(eq(t.payout.isDemo, true));
  await tx.delete(t.adjustment).where(eq(t.adjustment.isDemo, true));
  await tx.delete(t.cashUp).where(eq(t.cashUp.isDemo, true));
  await tx.delete(t.monthClose).where(eq(t.monthClose.isDemo, true));
  await tx.delete(t.address).where(like(t.address.userId, "demo-customer-%"));
  await tx.delete(t.customerProfile).where(like(t.customerProfile.userId, "demo-customer-%"));
  await tx.delete(t.user).where(like(t.user.id, "demo-customer-%"));

  await chunked(rows.users, (p) => tx.insert(t.user).values(p));
  await chunked(rows.profiles, (p) => tx.insert(t.customerProfile).values(p));
  await chunked(rows.addresses, (p) => tx.insert(t.address).values(p));
  // History is already announced: no push notification for any of it (10).
  await chunked(rows.orders, (p) =>
    tx.insert(t.order).values(p.map((o) => ({ ...o, pushedStatus: o.status }))),
  );
  await chunked(rows.lines, (p) => tx.insert(t.orderItem).values(p));
  await chunked(rows.events, (p) => tx.insert(t.orderStatusEvent).values(p));
  await chunked(rows.payments, (p) => tx.insert(t.payment).values(p));
  await chunked(rows.deliveries, (p) => tx.insert(t.delivery).values(p));
  await chunked(rows.refunds, (p) => tx.insert(t.refund).values(p));
  await chunked(rows.cancels, (p) => tx.insert(t.cancellationRequest).values(p));
  await chunked(rows.helps, (p) => tx.insert(t.helpRequest).values(p));
  await chunked(rows.alerts, (p) => tx.insert(t.alert).values(p));
  await chunked(rows.ratings, (p) => tx.insert(t.rating).values(p));
  await chunked(rows.cashUps, (p) => tx.insert(t.cashUp).values(p));
  await chunked(rows.adjustments, (p) => tx.insert(t.adjustment).values(p));
  await chunked(rows.payouts, (p) => tx.insert(t.payout).values(p));
  await chunked(rows.closes, (p) => tx.insert(t.monthClose).values(p));
  await chunked(rows.audit, (p) => tx.insert(t.auditLog).values(p));
});

/* ---------- summary ---------- */

const size = (
  await db.execute<{ mb: string }>(
    sql`select round(pg_database_size(current_database()) / 1048576.0, 1) as mb`,
  )
).rows[0]!.mb;
const onlineRows = rows.orders.filter((o) => o.channel === "online");
const walkins = rows.orders.filter((o) => o.channel === "walkin");
const sales = rows.orders.reduce((s, o) => s + o.total, 0);
console.log(`Demo history: ${firstDay} to ${lastDay} (${DAYS} days)
  Online orders: ${onlineRows.length} (O-0001 to O-${String(onlineNo).padStart(4, "0")}), ${onlineRows.filter((o) => o.type === "delivery").length} deliveries, ${onlineRows.filter((o) => o.status === "cancelled").length} cancelled
  Walk-in orders: ${walkins.length}, ${walkins.filter((o) => o.status === "cancelled").length} cancelled
  Customers: ${rows.users.length} with ${rows.addresses.length} addresses; ratings: ${rows.ratings.length}
  Deliveries: ${rows.deliveries.length} (${rows.deliveries.filter((d) => d.stopNumber! > 1).length} as a second or third stop, ${rows.deliveries.filter((d) => d.assignedBy).length} assigned by dispatch)
  Refunds: ${rows.refunds.length} (${rows.refunds.filter((r) => r.kind === "partial").length} partial), ${naira(rows.refunds.reduce((s, r) => s + r.amount, 0))}
  Sales: ${naira(sales)}; payouts: ${rows.payouts.length} (${rows.payouts.filter((p) => p.status === "owed").length} owed); cash-ups: ${rows.cashUps.length}; closed months: ${rows.closes.map((c) => c.month.slice(0, 7)).join(", ") || "none"}
  Alerts: ${rows.alerts.filter((a) => a.kind === "unaccepted").length} waiting for a rider (after ${setting.alertRiderMin} min); running late: ${lateBy.acknowledge} not acknowledged (${setting.alertAcknowledgeMin} min), ${lateBy.kitchen} in the kitchen (${setting.alertKitchenMin} min), ${lateBy.road} on the road (${setting.alertRoadMin} min)
  Audit entries: ${rows.audit.length}. Checks passed. Database size: ${size} MB`);
await client.end();
