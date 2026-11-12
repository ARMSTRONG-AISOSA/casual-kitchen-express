CREATE TYPE "public"."account_status" AS ENUM('active', 'deactivated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."actor_kind" AS ENUM('staff', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "public"."alert_kind" AS ENUM('unaccepted', 'stuck', 'item_unavailable', 'cancellation_request', 'help_request');--> statement-breakpoint
CREATE TYPE "public"."audit_kind" AS ENUM('money', 'account', 'setting', 'contact', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."help_reason" AS ENUM('customer_unreachable', 'code_problem', 'other');--> statement-breakpoint
CREATE TYPE "public"."help_resolution" AS ENUM('manual_completion', 'kept_open');--> statement-breakpoint
CREATE TYPE "public"."help_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('online', 'walkin');--> statement-breakpoint
CREATE TYPE "public"."order_exception" AS ENUM('delayed', 'item_unavailable', 'delivery_issue');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('placed', 'confirmed', 'acknowledged', 'preparing', 'ready', 'rider_accepted', 'picked_up', 'arriving', 'delivered', 'ready_for_collection', 'collected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('delivery', 'pickup', 'eat_in', 'take_away');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'transfer', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'confirmed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('owed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."refund_kind" AS ENUM('full', 'partial');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'completed');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('rider', 'kitchen', 'dispatch', 'accounts', 'manager');--> statement-breakpoint
CREATE TYPE "public"."station" AS ENUM('rice', 'soups_and_swallows', 'snacks_and_drinks');--> statement-breakpoint
CREATE TYPE "public"."tracking_mode" AS ENUM('light', 'milestones');--> statement-breakpoint
CREATE SEQUENCE "public"."change_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"street" text,
	"landmark" text,
	"neighbourhood_id" uuid NOT NULL,
	"contact_phone" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adjustment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"cash_up_id" uuid,
	"entered_by" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "alert_kind" NOT NULL,
	"order_id" uuid,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cleared_by" text,
	"cleared_at" timestamp with time zone,
	"version" bigint DEFAULT nextval('change_seq') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"kind" "audit_kind" NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cancellation_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cash_up" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_date" date NOT NULL,
	"expected" integer NOT NULL,
	"counted" integer NOT NULL,
	"counted_by" text NOT NULL,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_off_by" text,
	"signed_off_at" timestamp with time zone,
	"note" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "cash_up_business_date_unique" UNIQUE("business_date")
);
--> statement-breakpoint
CREATE TABLE "customer_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"gender" "gender",
	"photo_id" uuid,
	"default_address_id" uuid,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profile_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"rider_id" text NOT NULL,
	"batch_group" uuid,
	"stop_number" smallint DEFAULT 1 NOT NULL,
	"assigned_by" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"distance_m" integer,
	"rider_pay" integer,
	"manual_completion_by" text,
	CONSTRAINT "delivery_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "device_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "help_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"rider_id" text NOT NULL,
	"reason" "help_reason" NOT NULL,
	"status" "help_status" DEFAULT 'open' NOT NULL,
	"resolution" "help_resolution",
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hours_override" (
	"day" date PRIMARY KEY NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"online_opens" time,
	"online_closes" time,
	"walkin_opens" time,
	"walkin_closes" time,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "item_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_change" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text,
	"path" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"format" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"image_id" uuid,
	"available" boolean DEFAULT true NOT NULL,
	"station" "station" NOT NULL,
	"load" smallint NOT NULL,
	"is_soup" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "month_close" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"closed_by" text NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot" jsonb NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "month_close_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "neighbourhood" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"in_range" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "neighbourhood_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"content" jsonb NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"business_date" date NOT NULL,
	"channel" "order_channel" NOT NULL,
	"customer_id" text,
	"type" "order_type" NOT NULL,
	"status" "order_status" NOT NULL,
	"exception" "order_exception",
	"food_total" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"address_id" uuid,
	"neighbourhood_id" uuid,
	"delivery_code_hash" text,
	"code_attempts" smallint DEFAULT 0 NOT NULL,
	"entered_by" text,
	"label" text,
	"soup_variety_id" uuid,
	"placed_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"collected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" bigint DEFAULT nextval('change_seq') NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid,
	"name" text NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"station" "station" NOT NULL,
	"load" smallint NOT NULL,
	"ticked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"actor_kind" "actor_kind" NOT NULL,
	"actor_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"demo_ref" text NOT NULL,
	"amount" integer NOT NULL,
	"cash_received" integer,
	"change_due" integer,
	"taken_by" text,
	"status" "payment_status" DEFAULT 'confirmed' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"deliveries" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" "payout_status" DEFAULT 'owed' NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_by" text,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"stars" smallint NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "rating_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"kind" "refund_kind" NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"requested_by" text,
	"decided_by" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rider_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"capacity_budget" smallint,
	"version" bigint DEFAULT nextval('change_seq') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"online_opens" time DEFAULT '08:00' NOT NULL,
	"online_closes" time DEFAULT '18:00' NOT NULL,
	"walkin_opens" time DEFAULT '08:00' NOT NULL,
	"walkin_closes" time DEFAULT '20:30' NOT NULL,
	"tablet_sign_out" time DEFAULT '20:30' NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"paused_until" timestamp with time zone,
	"boundary" jsonb,
	"capacity_budget" smallint DEFAULT 6 NOT NULL,
	"batch_distance_m" integer DEFAULT 1500 NOT NULL,
	"tracking_mode" "tracking_mode" DEFAULT 'light' NOT NULL,
	"delivery_fee" integer DEFAULT 1500 NOT NULL,
	"rider_pay" integer DEFAULT 1000 NOT NULL,
	"cancellation_limit" smallint DEFAULT 3 NOT NULL,
	"whatsapp_number" text DEFAULT '2349095466063' NOT NULL,
	"soup_variety_id" uuid,
	"catalog_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "soup_variety" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "soup_variety_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "staff_role" NOT NULL,
	"job_title" text,
	"gender" "gender",
	"phone" text,
	"home_address" text,
	"photo_id" uuid,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profile_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_neighbourhood_id_neighbourhood_id_fk" FOREIGN KEY ("neighbourhood_id") REFERENCES "public"."neighbourhood"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_cash_up_id_cash_up_id_fk" FOREIGN KEY ("cash_up_id") REFERENCES "public"."cash_up"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_entered_by_user_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_cleared_by_user_id_fk" FOREIGN KEY ("cleared_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_request" ADD CONSTRAINT "cancellation_request_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_request" ADD CONSTRAINT "cancellation_request_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_request" ADD CONSTRAINT "cancellation_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_up" ADD CONSTRAINT "cash_up_counted_by_user_id_fk" FOREIGN KEY ("counted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_up" ADD CONSTRAINT "cash_up_signed_off_by_user_id_fk" FOREIGN KEY ("signed_off_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_photo_id_media_asset_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_rider_id_user_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_manual_completion_by_user_id_fk" FOREIGN KEY ("manual_completion_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_token" ADD CONSTRAINT "device_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_rider_id_user_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_option" ADD CONSTRAINT "item_option_item_id_menu_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_category_id_menu_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_image_id_media_asset_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_close" ADD CONSTRAINT "month_close_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_address_id_address_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_neighbourhood_id_neighbourhood_id_fk" FOREIGN KEY ("neighbourhood_id") REFERENCES "public"."neighbourhood"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_entered_by_user_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_soup_variety_id_soup_variety_id_fk" FOREIGN KEY ("soup_variety_id") REFERENCES "public"."soup_variety"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_item_id_menu_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_event" ADD CONSTRAINT "order_status_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_taken_by_user_id_fk" FOREIGN KEY ("taken_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_rider_id_user_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_state" ADD CONSTRAINT "rider_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "setting_soup_variety_id_soup_variety_id_fk" FOREIGN KEY ("soup_variety_id") REFERENCES "public"."soup_variety"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profile" ADD CONSTRAINT "staff_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profile" ADD CONSTRAINT "staff_profile_photo_id_media_asset_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media_asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "address_user_idx" ON "address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alert_open_idx" ON "alert" USING btree ("cleared_at");--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_kind_idx" ON "audit_log" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "delivery_rider_idx" ON "delivery" USING btree ("rider_id","delivered_at");--> statement-breakpoint
CREATE INDEX "delivery_delivered_idx" ON "delivery" USING btree ("delivered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_number_day_uq" ON "order" USING btree ("business_date","number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_online_number_uq" ON "order" USING btree ("number") WHERE "order"."channel" = 'online';--> statement-breakpoint
CREATE INDEX "order_placed_idx" ON "order" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "order_channel_status_idx" ON "order" USING btree ("channel","status");--> statement-breakpoint
CREATE INDEX "order_customer_idx" ON "order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_entered_by_idx" ON "order" USING btree ("entered_by");--> statement-breakpoint
CREATE INDEX "order_version_idx" ON "order" USING btree ("version");--> statement-breakpoint
CREATE INDEX "order_item_order_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "event_order_idx" ON "order_status_event" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payout_rider_idx" ON "payout" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");