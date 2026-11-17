CREATE TABLE "operations" (
	"id" text PRIMARY KEY,
	"request_hash" text NOT NULL,
	"response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "currency" text;