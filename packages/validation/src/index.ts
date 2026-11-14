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
  capacityBudget: 6,
  maxOrdersPerRider: 3,
  batchDistanceKm: 1.5,
  cancellationLimit: 3,
  cancellationLimitMin: 3,
  cancellationLimitMax: 7,
  cancellationWindowDays: 7,
} as const;

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
