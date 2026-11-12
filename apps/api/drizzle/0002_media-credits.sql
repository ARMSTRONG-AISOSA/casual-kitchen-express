ALTER TABLE "media_asset" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "author" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "licence" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "licence_url" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "media_asset" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;