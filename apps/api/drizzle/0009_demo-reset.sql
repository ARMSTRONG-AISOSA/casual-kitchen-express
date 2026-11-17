CREATE TABLE "demo_reset" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"step" smallint DEFAULT 0 NOT NULL,
	"steps" smallint DEFAULT 0 NOT NULL,
	"label" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"started_by" text,
	"error" text
);
