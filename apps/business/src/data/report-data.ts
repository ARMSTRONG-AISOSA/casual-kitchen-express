// Demo records behind the Reports screen: 60 days, the last item is yesterday. In the real app these
// come from the API for the chosen range (architecture.md 14.4, decision 3).
// A repeatable pseudo-random number, so the demo figures stay the same between visits.
export const seeded = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/* ---------- demo records: 60 days, the last item is yesterday ---------- */

export const AOV = 4300;
export const DAYS = Array.from({ length: 60 }, (_, i) => {
  const weekend = (i + 2) % 7 >= 5;
  const f = 0.85 + seeded(i) * 0.3;
  return {
    online: Math.round((weekend ? 25 : 40) * f),
    walkin: Math.round((weekend ? 8 : 13) * f),
  };
});

// Minutes from the kitchen to each area, and how often orders come from there.
const AREA_BASE = [10, 12, 14, 15, 17, 19, 21, 23, 25, 27];
const AREA_WEIGHT = [22, 18, 12, 10, 10, 7, 6, 5, 5, 5];
const RIDER_IDS = ["R-001", "R-002", "R-003", "R-004"];
const RIDER_WEIGHT = [30, 27, 23, 20];
const RIDER_PACE = [0.95, 1.05, 1, 1.1];

export const pick = (weights: number[], r: number) => {
  let x = r * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x < 0) return i;
  }
  return weights.length - 1;
};

export type Delivery = { day: number; rider: string; area: number; mins: number };

// About 85% of online orders are deliveries (architecture.md 18.3). Each one gets a rider, an area,
// and a delivery time. In the real app these come from the Delivery records (section 9).
export const DELIVERIES: Delivery[] = DAYS.flatMap((d, day) =>
  Array.from({ length: Math.round(d.online * 0.85) }, (_, j) => {
    const k = day * 100 + j;
    const area = pick(AREA_WEIGHT, seeded(k + 0.1));
    const r = pick(RIDER_WEIGHT, seeded(k + 0.2));
    const mins = Math.round(AREA_BASE[area]! * RIDER_PACE[r]! * (0.8 + seeded(k + 0.3) * 0.45));
    return { day, rider: RIDER_IDS[r]!, area, mins };
  }),
);

/* ---------- refunds (Reports, Refunds tab) ---------- */

export type RefundRow = {
  day: number; // 0 to 59, or 60 for today
  at: number;
  orderNo: string;
  channel: "online" | "walkin";
  amount: number;
  kind: "full" | "partial";
  reason: string;
  by: string;
  byName: string;
  byRole: string;
};

const ONLINE_REASONS = [
  "Cancelled before the kitchen started",
  "Customer request approved",
  "Late delivery",
  "Wrong or missing item",
  "Quality problem",
];
const WALKIN_REASONS = ["Customer changed their mind", "Entered by mistake", "Took too long"];
const DAY_MS = 86_400_000;

// About 6% of online orders are cancelled or refunded and 2% of walk-ins (architecture.md 18.3),
// each recorded with who did it. Cancelling before the kitchen starts refunds automatically.
export const REFUND_ROWS: RefundRow[] = DAYS.flatMap((d, day) => {
  const startOfDay = new Date().setHours(0, 0, 0, 0) - (60 - day) * DAY_MS;
  const n = Math.round(d.online * 0.06 * (0.6 + seeded(day + 0.7) * 0.8));
  const w = seeded(day + 0.9) < d.walkin * 0.02 ? 1 : 0;
  const rows: RefundRow[] = [];
  for (let j = 0; j < n + w; j++) {
    const k = day * 50 + j;
    const walkin = j >= n;
    const r = seeded(k + 0.4);
    const reasons = walkin ? WALKIN_REASONS : ONLINE_REASONS;
    const reason = reasons[Math.floor(seeded(k + 0.5) * reasons.length)]!;
    const auto = !walkin && reason === ONLINE_REASONS[0];
    const partial =
      !walkin && (reason === "Late delivery" || reason === "Quality problem") && r < 0.6;
    const full =
      Math.round((AOV + (seeded(k + 0.6) - 0.5) * 3000) / 100) * 100 + (walkin ? 0 : 1500);
    const who = auto
      ? ["System", "System (automatic)", "System"]
      : walkin
        ? r < 0.5
          ? ["K-001", "Blessing Okafor", "Kitchen staff"]
          : ["K-002", "Samuel Eze", "Kitchen staff"]
        : reason === "Customer request approved"
          ? r < 0.7
            ? ["D-001", "Osas Edo", "Dispatch officer"]
            : ["M-002", "Ivie Osagie", "Manager"]
          : r < 0.5
            ? ["M-001", "Efosa Igbinedion", "Manager"]
            : ["M-002", "Ivie Osagie", "Manager"];
    const hour = walkin
      ? 9 + Math.floor(seeded(k + 0.8) * 11)
      : 8 + Math.floor(seeded(k + 0.8) * 10);
    rows.push({
      day,
      at: startOfDay + hour * 3_600_000 + Math.floor(seeded(k + 0.95) * 59) * 60_000,
      orderNo: walkin
        ? `W-${String(1 + Math.floor(seeded(k + 0.3) * 12)).padStart(3, "0")}`
        : `O-${String(day * 38 + 1 + Math.floor(seeded(k + 0.3) * 37)).padStart(4, "0")}`,
      channel: walkin ? "walkin" : "online",
      amount: partial ? Math.round(full / 200) * 100 : full,
      kind: partial ? "partial" : "full",
      reason,
      by: who[0]!,
      byName: who[1]!,
      byRole: who[2]!,
    });
  }
  return rows;
});
