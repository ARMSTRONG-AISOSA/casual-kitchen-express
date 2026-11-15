ALTER TABLE "setting" ALTER COLUMN "capacity_budget" SET DEFAULT 9;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_sound" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_rider_min" smallint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_acknowledge_min" smallint DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_kitchen_min" smallint DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_road_min" smallint DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alerts_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alerts_updated_by" text;--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "alert_rider_range" CHECK ("setting"."alert_rider_min" between 5 and 15);--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "alert_acknowledge_range" CHECK ("setting"."alert_acknowledge_min" between 1 and 5);--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "alert_kitchen_range" CHECK ("setting"."alert_kitchen_min" between 10 and 30);--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "alert_road_range" CHECK ("setting"."alert_road_min" between 10 and 45);--> statement-breakpoint
-- Owner decision, 15 November 2026: the rider load budget goes from 6 to 9. Only a row still on the
-- old default moves, so a budget someone chose in Settings is kept.
UPDATE "setting" SET "capacity_budget" = 9 WHERE "capacity_budget" = 6;