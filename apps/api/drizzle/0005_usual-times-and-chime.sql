ALTER TABLE "setting" ALTER COLUMN "alert_rider_min" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "setting" ALTER COLUMN "alert_road_min" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "setting" ADD COLUMN "alert_chime" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Owner decision, 15 November 2026: the usual times are 10 minutes waiting for a rider (was 5) and
-- 30 on the road (was 25). Only a row nobody has saved its own times on moves.
UPDATE "setting" SET "alert_rider_min" = 10, "alert_road_min" = 30
  WHERE "alerts_updated_at" IS NULL AND "alert_rider_min" = 5 AND "alert_road_min" = 25;