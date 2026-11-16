CREATE TYPE "public"."push_app" AS ENUM('customer', 'rider', 'business');--> statement-breakpoint
CREATE TABLE "push_token" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"app" "push_app" NOT NULL,
	"sound" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "pushed_status" "order_status";--> statement-breakpoint
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_token_user_idx" ON "push_token" USING btree ("user_id");--> statement-breakpoint
-- Orders already in the database have been announced as far as they need to be.
UPDATE "order" SET "pushed_status" = "status";
