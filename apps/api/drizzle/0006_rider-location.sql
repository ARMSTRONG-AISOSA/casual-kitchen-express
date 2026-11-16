ALTER TABLE "rider_state" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "rider_state" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "rider_state" ADD COLUMN "located_at" timestamp with time zone;