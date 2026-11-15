// Shared validation rules, used by the apps and the API. See docs/architecture.md.
import { z } from "zod";

/** Online orders run continuously from O-0001 (4.8). */
export const onlineOrderNumber = z.string().regex(/^O-\d{4,}$/);

/** Walk-in orders restart at W-001 each day (4.8). */
export const walkinOrderNumber = z.string().regex(/^W-\d{3,}$/);

/** Customer IDs, for example C-00418 (CUS-27). */
export const customerCode = z.string().regex(/^C-\d{5,}$/);

/** Staff codes: R- riders, K- kitchen staff, D- dispatch officers, A- account officers, M- managers (3.1). */
export const staffCode = z.string().regex(/^[RKDAM]-\d{3,}$/);

/** The 4-digit delivery code (4.4). */
export const deliveryCode = z.string().regex(/^\d{4}$/);

/** Text the customer types to confirm account deletion (CUS-17). */
export const DELETE_ACCOUNT_PHRASE = "DELETE ACCOUNT";

/** Decided defaults and limits from the architecture document. */
export const DEFAULTS = {
  deliveryFee: 1500,
  riderPay: 1000,
  /** Load points a rider can carry: light items 1, medium 2, heavy 3 (owner decision, 15 November 2026). */
  capacityBudget: 9,
  maxOrdersPerRider: 3,
  batchDistanceKm: 1.5,
  cancellationLimit: 3,
  cancellationLimitMin: 3,
  cancellationLimitMax: 7,
  cancellationWindowDays: 7,
} as const;

/**
 * Alert timers (MGR-14, owner decision 15 November 2026): how many minutes an order can sit in a
 * stage before an alert opens, each with the range dispatch officers and managers can set in
 * Settings, Alerts. The usual times are 10, 5, 15, and 30 minutes (owner, 15 November 2026: waiting
 * for a rider was 5 and on the road 25, which flagged about 1 delivery in 5 each on the demo history).
 */
export const ALERT_TIMERS = {
  rider: {
    label: "Waiting for a rider",
    from: "after the food is ready",
    min: 5,
    max: 15,
    usual: 10,
  },
  acknowledge: {
    label: "Not acknowledged",
    from: "after the order arrives",
    min: 1,
    max: 5,
    usual: 5,
  },
  kitchen: {
    label: "Too long in the kitchen",
    from: "after the kitchen taps it",
    min: 10,
    max: 30,
    usual: 15,
  },
  road: {
    label: "Too long on the road",
    from: "after the rider picks it up",
    min: 10,
    max: 45,
    usual: 30,
  },
} as const;
export type AlertTimer = keyof typeof ALERT_TIMERS;
export const ALERT_TIMER_KEYS = Object.keys(ALERT_TIMERS) as AlertTimer[];

const timer = (k: AlertTimer) =>
  z
    .number()
    .int("Whole minutes only")
    .min(ALERT_TIMERS[k].min, `${ALERT_TIMERS[k].label}: at least ${ALERT_TIMERS[k].min} minutes`)
    .max(ALERT_TIMERS[k].max, `${ALERT_TIMERS[k].label}: at most ${ALERT_TIMERS[k].max} minutes`);

/** The Alerts section in Settings, saved together with one tap. */
export const alertSettings = z.object({
  sound: z.boolean(),
  /** The pleasant double chime when a new online order arrives (design.md 6.2, KIT-02). */
  chime: z.boolean(),
  rider: timer("rider"),
  acknowledge: timer("acknowledge"),
  kitchen: timer("kitchen"),
  road: timer("road"),
});
export type AlertSettings = z.infer<typeof alertSettings>;
/** "1 minute", "5 minutes". */
export const minutes = (n: number) => `${n} minute${n === 1 ? "" : "s"}`;

/** What a save changed, in words, for the audit log: "turned the beep off, waiting for a rider from 5 to 10 minutes". */
export const alertChanges = (was: AlertSettings, now: AlertSettings) => [
  ...(was.sound !== now.sound ? [`turned the beep ${now.sound ? "on" : "off"}`] : []),
  ...(was.chime !== now.chime ? [`turned the new-order chime ${now.chime ? "on" : "off"}`] : []),
  ...ALERT_TIMER_KEYS.filter((k) => was[k] !== now[k]).map(
    (k) => `${ALERT_TIMERS[k].label.toLowerCase()} from ${was[k]} to ${minutes(now[k])}`,
  ),
];

export const ALERT_SETTINGS_USUAL: AlertSettings = {
  sound: true,
  chime: true,
  rider: ALERT_TIMERS.rider.usual,
  acknowledge: ALERT_TIMERS.acknowledge.usual,
  kitchen: ALERT_TIMERS.kitchen.usual,
  road: ALERT_TIMERS.road.usual,
};

/** MGR-31: rider pay can't exceed the delivery fee. */
export const pricingSettings = z
  .object({
    deliveryFee: z.number().int().positive(),
    riderPay: z.number().int().positive(),
  })
  .refine((s) => s.riderPay <= s.deliveryFee, {
    message: "Rider pay can’t be more than the delivery fee",
    path: ["riderPay"],
  });

/** MGR-35: the cancellation limit is 3 to 7 in 7 days. */
export const cancellationLimit = z
  .number()
  .int()
  .min(DEFAULTS.cancellationLimitMin)
  .max(DEFAULTS.cancellationLimitMax);

/** KIT-17: a soup name in the soup of the day rotation, for example “Efo riro”. */
export const soupName = z
  .string()
  .trim()
  .min(2, "Enter the soup’s name")
  .max(40, "Keep the name under 40 characters");

/** 3.1: staff usernames, lower case, as Better Auth's username plugin stores them. */
export const staffUsername = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, "Use 3 to 30 letters, numbers, dots, or underscores");

/** 12.1: a password a staff member sets for themself (at least 8 characters). */
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Keep it under 128 characters");

/**
 * Partial refunds (MGR-15, owner decision 15 November 2026): the amount is typed in, and can never
 * be more than 99% of what the customer paid. A full refund is chosen separately.
 */
export const PARTIAL_REFUND_MAX_SHARE = 0.99;
export const maxPartialRefund = (paid: number) => Math.floor(paid * PARTIAL_REFUND_MAX_SHARE);

/** How a refund is chosen: everything, a typed partial amount, or (managers, after pickup) none. */
export const refundChoice = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("full") }),
  z.object({ kind: z.literal("partial"), amount: z.number().int().min(1, "Enter an amount") }),
  z.object({ kind: z.literal("none") }),
]);
export type RefundChoice = z.infer<typeof refundChoice>;
