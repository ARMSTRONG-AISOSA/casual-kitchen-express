// The database schema, from docs/architecture.md section 9. Money is whole naira. Times are stored
// with their time zone and shown in West Africa Time.
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at("created_at").notNull().defaultNow();
const id = () => uuid("id").primaryKey().defaultRandom();
/** Every seeded record is flagged so the demo data can be wiped and regenerated (18.3). */
const isDemo = () => boolean("is_demo").notNull().default(false);

/**
 * One counter for every change that apps keep in sync. Each changed row takes the next number, so an
 * app that reconnects asks only for rows newer than the last number it saw (14.4, decision 4).
 */
export const changeSeq = pgSequence("change_seq");
const changeVersion = () =>
  bigint("version", { mode: "number" })
    .notNull()
    .default(sql`nextval('change_seq')`);

/* ---------- enums ---------- */

export const staffRole = pgEnum("staff_role", [
  "rider",
  "kitchen",
  "dispatch",
  "accounts",
  "manager",
]);
export const accountStatus = pgEnum("account_status", ["active", "deactivated", "deleted"]);
export const gender = pgEnum("gender", ["female", "male", "prefer_not_to_say"]);
export const station = pgEnum("station", ["rice", "soups_and_swallows", "snacks_and_drinks"]);
export const orderChannel = pgEnum("order_channel", ["online", "walkin"]);
export const orderType = pgEnum("order_type", ["delivery", "pickup", "eat_in", "take_away"]);
export const orderStatus = pgEnum("order_status", [
  "placed",
  "confirmed",
  "acknowledged",
  "preparing",
  "ready",
  "rider_accepted",
  "picked_up",
  "arriving",
  "delivered",
  "ready_for_collection",
  "collected",
  "cancelled",
]);
export const orderException = pgEnum("order_exception", [
  "delayed",
  "item_unavailable",
  "delivery_issue",
]);
export const paymentMethod = pgEnum("payment_method", ["card", "transfer", "cash"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "confirmed", "refunded"]);
export const actorKind = pgEnum("actor_kind", ["staff", "customer", "system"]);
export const payoutStatus = pgEnum("payout_status", ["owed", "paid"]);
export const refundKind = pgEnum("refund_kind", ["full", "partial"]);
export const refundStatus = pgEnum("refund_status", ["pending", "completed"]);
export const requestStatus = pgEnum("request_status", ["pending", "approved", "declined"]);
export const helpReason = pgEnum("help_reason", ["customer_unreachable", "code_problem", "other"]);
export const helpStatus = pgEnum("help_status", ["open", "resolved"]);
export const helpResolution = pgEnum("help_resolution", ["manual_completion", "kept_open"]);
export const alertKind = pgEnum("alert_kind", [
  "unaccepted",
  "stuck",
  "item_unavailable",
  "cancellation_request",
  "help_request",
]);
export const auditKind = pgEnum("audit_kind", ["money", "account", "setting", "contact", "other"]);
export const trackingMode = pgEnum("tracking_mode", ["light", "milestones"]);
export const platform = pgEnum("platform", ["android", "ios"]);

/* ---------- accounts (Better Auth's core tables, plus its username and admin plugin fields) ---------- */
// The field list follows Better Auth 1.7's Drizzle schema. Confirm it against Better Auth's own
// generator when sign-in is built (16.1, item 1).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: at("ban_expires"),
  isDemo: isDemo(),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: at("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: at("access_token_expires_at"),
    refreshTokenExpiresAt: at("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: at("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/* ---------- places and media ---------- */

export const neighbourhood = pgTable("neighbourhood", {
  id: id(),
  name: text("name").notNull().unique(),
  inRange: boolean("in_range").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const mediaAsset = pgTable("media_asset", {
  id: id(),
  ownerId: text("owner_id").references(() => user.id),
  path: text("path").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: text("format").notNull(),
  // Where a photo came from, recorded as the brand document asks (Food Imagery). “business” means
  // CKE's own photo (an optional photographer name and link); “internet” needs author, licence, and
  // source link.
  sourceKind: text("source_kind").$type<"business" | "internet">(),
  title: text("title"),
  author: text("author"),
  licence: text("licence"),
  licenceUrl: text("licence_url"),
  sourceUrl: text("source_url"),
  isDemo: isDemo(),
  createdAt: createdAt(),
});

/* ---------- people ---------- */

export const customerProfile = pgTable("customer_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  code: text("code").notNull().unique(), // C-00418 (CUS-27)
  name: text("name").notNull(),
  gender: gender("gender"),
  photoId: uuid("photo_id").references(() => mediaAsset.id),
  defaultAddressId: uuid("default_address_id"),
  status: accountStatus("status").notNull().default("active"),
  createdAt: createdAt(),
});

export const address = pgTable(
  "address",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    label: text("label").notNull(),
    street: text("street"),
    landmark: text("landmark"),
    neighbourhoodId: uuid("neighbourhood_id")
      .notNull()
      .references(() => neighbourhood.id),
    contactPhone: text("contact_phone").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("address_user_idx").on(t.userId)],
);

export const staffProfile = pgTable("staff_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  code: text("code").notNull().unique(), // R-001, K-001, D-001, A-001, M-001; never reused (3.1)
  fullName: text("full_name").notNull(),
  role: staffRole("role").notNull(),
  jobTitle: text("job_title"),
  gender: gender("gender"),
  phone: text("phone"),
  homeAddress: text("home_address"),
  photoId: uuid("photo_id").references(() => mediaAsset.id),
  status: accountStatus("status").notNull().default("active"),
  isOwner: boolean("is_owner").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const riderState = pgTable("rider_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  online: boolean("online").notNull().default(false),
  capacityBudget: smallint("capacity_budget"), // null uses the setting
  version: changeVersion(),
});

/* ---------- menu ---------- */

export const menuCategory = pgTable("menu_category", {
  id: id(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItem = pgTable("menu_item", {
  id: id(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => menuCategory.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  imageId: uuid("image_id").references(() => mediaAsset.id),
  available: boolean("available").notNull().default(true), // false means sold out (KIT-08)
  station: station("station").notNull(),
  load: smallint("load").notNull(), // 1, 2, or 3 (section 6)
  isSoup: boolean("is_soup").notNull().default(false), // takes the soup of the day (KIT-17)
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const itemOption = pgTable("item_option", {
  id: id(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => menuItem.id),
  name: text("name").notNull(),
  priceChange: integer("price_change").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** The rotating soups the soup of the day is picked from (KIT-17). */
export const soupVariety = pgTable("soup_variety", {
  id: id(),
  name: text("name").notNull().unique(),
  // Each soup has its own photo. The soup and extra soup dishes show today's soup's photo.
  imageId: uuid("image_id").references(() => mediaAsset.id),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ---------- settings ---------- */

/**
 * One row. `catalogVersion` goes up whenever the menu or a customer-facing setting changes, so
 * apps fetch them again only then (14.4, decision 1).
 */
export const setting = pgTable("setting", {
  id: smallint("id").primaryKey().default(1),
  onlineOpens: time("online_opens").notNull().default("08:00"),
  onlineCloses: time("online_closes").notNull().default("18:00"),
  walkinOpens: time("walkin_opens").notNull().default("08:00"),
  walkinCloses: time("walkin_closes").notNull().default("20:30"),
  tabletSignOut: time("tablet_sign_out").notNull().default("20:30"),
  paused: boolean("paused").notNull().default(false),
  pausedUntil: at("paused_until"),
  boundary: jsonb("boundary").$type<[number, number][]>(), // [lng, lat] polygon (4.7)
  capacityBudget: smallint("capacity_budget").notNull().default(6),
  batchDistanceM: integer("batch_distance_m").notNull().default(1500),
  trackingMode: trackingMode("tracking_mode").notNull().default("light"),
  deliveryFee: integer("delivery_fee").notNull().default(1500),
  riderPay: integer("rider_pay").notNull().default(1000),
  cancellationLimit: smallint("cancellation_limit").notNull().default(3),
  whatsappNumber: text("whatsapp_number").notNull().default("2349095466063"),
  soupVarietyId: uuid("soup_variety_id").references(() => soupVariety.id),
  catalogVersion: integer("catalog_version").notNull().default(1),
  updatedAt: at("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

/** Overrides to the usual hours, for example a holiday (MGR-09). */
export const hoursOverride = pgTable("hours_override", {
  day: date("day").primaryKey(),
  closed: boolean("closed").notNull().default(false),
  onlineOpens: time("online_opens"),
  onlineCloses: time("online_closes"),
  walkinOpens: time("walkin_opens"),
  walkinCloses: time("walkin_closes"),
  note: text("note"),
});

/* ---------- orders ---------- */

export const order = pgTable(
  "order",
  {
    id: id(),
    number: text("number").notNull(), // O-0001 runs on; W-001 restarts daily (4.8)
    businessDate: date("business_date").notNull(),
    channel: orderChannel("channel").notNull(),
    customerId: text("customer_id").references(() => user.id), // empty for walk-ins
    type: orderType("type").notNull(),
    status: orderStatus("status").notNull(),
    exception: orderException("exception"),
    foodTotal: integer("food_total").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0), // stored when placed (18.2)
    total: integer("total").notNull(),
    paymentMethod: paymentMethod("payment_method").notNull(),
    addressId: uuid("address_id").references(() => address.id),
    neighbourhoodId: uuid("neighbourhood_id").references(() => neighbourhood.id),
    deliveryCodeHash: text("delivery_code_hash"),
    codeAttempts: smallint("code_attempts").notNull().default(0),
    enteredBy: text("entered_by").references(() => user.id), // walk-ins
    label: text("label"), // optional name to call out (walk-ins)
    soupVarietyId: uuid("soup_variety_id").references(() => soupVariety.id),
    placedAt: at("placed_at").notNull(),
    acknowledgedAt: at("acknowledged_at"),
    readyAt: at("ready_at"),
    pickedUpAt: at("picked_up_at"),
    deliveredAt: at("delivered_at"),
    collectedAt: at("collected_at"),
    cancelledAt: at("cancelled_at"),
    version: changeVersion(),
    isDemo: isDemo(),
  },
  (t) => [
    uniqueIndex("order_number_day_uq").on(t.businessDate, t.number),
    uniqueIndex("order_online_number_uq")
      .on(t.number)
      .where(sql`${t.channel} = 'online'`),
    index("order_placed_idx").on(t.placedAt),
    index("order_channel_status_idx").on(t.channel, t.status),
    index("order_customer_idx").on(t.customerId),
    index("order_entered_by_idx").on(t.enteredBy),
    index("order_version_idx").on(t.version),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => menuItem.id),
    name: text("name").notNull(), // as it was when ordered
    unitPrice: integer("unit_price").notNull(),
    quantity: smallint("quantity").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    station: station("station").notNull(),
    load: smallint("load").notNull(),
    ticked: boolean("ticked").notNull().default(false),
  },
  (t) => [index("order_item_order_idx").on(t.orderId)],
);

/** Every status change with who made it, for the timeline and the timing reports (4.5, MGR-19). */
export const orderStatusEvent = pgTable(
  "order_status_event",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    actorKind: actorKind("actor_kind").notNull(),
    actorId: text("actor_id"),
    at: at("at").notNull().defaultNow(),
  },
  (t) => [index("event_order_idx").on(t.orderId)],
);

export const payment = pgTable("payment", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  method: paymentMethod("method").notNull(),
  demoRef: text("demo_ref").notNull(), // simulated; no card numbers are ever stored
  amount: integer("amount").notNull(),
  cashReceived: integer("cash_received"),
  changeDue: integer("change_due"),
  takenBy: text("taken_by").references(() => user.id),
  status: paymentStatus("status").notNull().default("confirmed"),
  at: at("at").notNull().defaultNow(),
});

export const delivery = pgTable(
  "delivery",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => order.id),
    riderId: text("rider_id")
      .notNull()
      .references(() => user.id),
    batchGroup: uuid("batch_group"),
    stopNumber: smallint("stop_number").notNull().default(1),
    assignedBy: text("assigned_by").references(() => user.id), // empty when accepted from the queue
    acceptedAt: at("accepted_at").notNull().defaultNow(),
    pickedUpAt: at("picked_up_at"),
    deliveredAt: at("delivered_at"),
    distanceM: integer("distance_m"),
    riderPay: integer("rider_pay"), // stored when delivered
    manualCompletionBy: text("manual_completion_by").references(() => user.id),
  },
  (t) => [
    index("delivery_rider_idx").on(t.riderId, t.deliveredAt),
    index("delivery_delivered_idx").on(t.deliveredAt),
  ],
);

export const payout = pgTable(
  "payout",
  {
    id: id(),
    riderId: text("rider_id")
      .notNull()
      .references(() => user.id),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    deliveries: integer("deliveries").notNull(),
    amount: integer("amount").notNull(),
    status: payoutStatus("status").notNull().default("owed"),
    paidAt: at("paid_at"),
    paidBy: text("paid_by").references(() => user.id),
    isDemo: isDemo(),
  },
  (t) => [index("payout_rider_idx").on(t.riderId)],
);

export const refund = pgTable("refund", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id),
  amount: integer("amount").notNull(),
  kind: refundKind("kind").notNull(),
  reason: text("reason").notNull(),
  status: refundStatus("status").notNull().default("pending"),
  requestedBy: text("requested_by"),
  decidedBy: text("decided_by").references(() => user.id),
  requestedAt: at("requested_at").notNull().defaultNow(),
  completedAt: at("completed_at"),
});

export const rating = pgTable("rating", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => order.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => user.id),
  stars: smallint("stars").notNull(),
  at: at("at").notNull().defaultNow(),
  isDemo: isDemo(),
});

/* ---------- requests and alerts ---------- */

export const cancellationRequest = pgTable("cancellation_request", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => user.id),
  reason: text("reason").notNull(),
  status: requestStatus("status").notNull().default("pending"),
  decidedBy: text("decided_by").references(() => user.id), // a dispatch officer or a manager
  requestedAt: at("requested_at").notNull().defaultNow(),
  decidedAt: at("decided_at"),
});

export const helpRequest = pgTable("help_request", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id),
  riderId: text("rider_id")
    .notNull()
    .references(() => user.id),
  reason: helpReason("reason").notNull(),
  status: helpStatus("status").notNull().default("open"),
  resolution: helpResolution("resolution"),
  resolvedBy: text("resolved_by").references(() => user.id),
  createdAt: createdAt(),
  resolvedAt: at("resolved_at"),
});

export const alert = pgTable(
  "alert",
  {
    id: id(),
    kind: alertKind("kind").notNull(),
    orderId: uuid("order_id").references(() => order.id),
    requestId: uuid("request_id"),
    createdAt: createdAt(),
    clearedBy: text("cleared_by").references(() => user.id),
    clearedAt: at("cleared_at"),
    version: changeVersion(),
  },
  (t) => [index("alert_open_idx").on(t.clearedAt)],
);

/* ---------- finance (ACC-03 to ACC-07) ---------- */

export const cashUp = pgTable("cash_up", {
  id: id(),
  businessDate: date("business_date").notNull().unique(),
  expected: integer("expected").notNull(),
  counted: integer("counted").notNull(),
  countedBy: text("counted_by")
    .notNull()
    .references(() => user.id),
  countedAt: at("counted_at").notNull().defaultNow(),
  // Whoever signed it off: an account officer or any manager, with the time (ACC-04).
  signedOffBy: text("signed_off_by").references(() => user.id),
  signedOffAt: at("signed_off_at"),
  note: text("note"),
  isDemo: isDemo(),
});

export const monthClose = pgTable("month_close", {
  id: id(),
  month: date("month").notNull().unique(), // the first day of the month
  closedBy: text("closed_by")
    .notNull()
    .references(() => user.id),
  closedAt: at("closed_at").notNull().defaultNow(),
  snapshot: jsonb("snapshot").notNull(), // the statement totals when closed
  isDemo: isDemo(),
});

export const adjustment = pgTable("adjustment", {
  id: id(),
  month: date("month").notNull(), // the open month it applies to
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  orderId: uuid("order_id").references(() => order.id),
  cashUpId: uuid("cash_up_id").references(() => cashUp.id),
  enteredBy: text("entered_by")
    .notNull()
    .references(() => user.id),
  at: at("at").notNull().defaultNow(),
  isDemo: isDemo(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: text("actor_id"), // a staff or customer ID, or empty for the system
    kind: auditKind("kind").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    before: jsonb("before"),
    after: jsonb("after"),
    at: at("at").notNull().defaultNow(),
    isDemo: isDemo(),
  },
  (t) => [index("audit_at_idx").on(t.at), index("audit_kind_idx").on(t.kind)],
);

/* ---------- push ---------- */

export const deviceToken = pgTable("device_token", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  platform: platform("platform").notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
});

export const notification = pgTable("notification", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: jsonb("content").notNull(),
  sentAt: at("sent_at").notNull().defaultNow(),
  isDemo: isDemo(),
});
