// Shared validation rules, used by the apps and the API. See docs/architecture.md.
import { z } from "zod";

/** Online orders run continuously from O-0001 (4.8). */
export const onlineOrderNumber = z.string().regex(/^O-\d{4,}$/);

/** Walk-in orders restart at W-001 each day (4.8). */
export const walkinOrderNumber = z.string().regex(/^W-\d{3,}$/);

/** Customer IDs, for example C-00418 (CUS-27). */
export const customerCode = z.string().regex(/^C-\d{5,}$/);

/** Staff codes: R- riders, K- kitchen staff, M- managers (3.1). */
export const staffCode = z.string().regex(/^[RKM]-\d{3,}$/);

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
