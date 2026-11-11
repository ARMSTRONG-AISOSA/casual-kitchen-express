// Shared domain types. The source of truth is docs/architecture.md.

/** Section 3: account roles. */
export type Role = "customer" | "rider" | "kitchen" | "manager";

/** Section 4.8: every order has a channel. */
export type OrderChannel = "online" | "walkin";

/** Online orders are delivery or pickup; walk-in orders are eat in or take away. */
export type OnlineOrderType = "delivery" | "pickup";
export type WalkinOrderType = "eat_in" | "take_away";

/** Sections 4.1 to 4.3, 4.8: order statuses. */
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "acknowledged"
  | "preparing"
  | "ready"
  | "rider_accepted"
  | "picked_up"
  | "arriving"
  | "delivered"
  | "ready_for_collection"
  | "collected"
  | "cancelled";

/** Section 4.3: exception flags shown alongside a status. */
export type OrderException = "delayed" | "item_unavailable" | "delivery_issue";

/** Section 9: payment methods (all simulated). */
export type PaymentMethod = "card" | "transfer" | "cash";

export type RefundStatus = "pending" | "completed";

/** Section 6: menu item load levels. Light 1, medium 2, heavy 3. */
export type LoadLevel = 1 | 2 | 3;

/** Section 5.3, KIT-04: kitchen stations. */
export type Station = "rice" | "soups_and_swallows" | "snacks_and_drinks";

/** Section 7.1: rider tracking mode setting (MGR-32). */
export type TrackingMode = "light" | "milestones";

export type ThemePreference = "light" | "dark" | "system";

/** Amounts are whole naira. */
export type Naira = number;
