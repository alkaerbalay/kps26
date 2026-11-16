CREATE TABLE "audit" (
	"id" serial PRIMARY KEY,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"kind" text NOT NULL,
	"customer_id" integer NOT NULL,
	"customer_name" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(18,2) NOT NULL,
	"paid" numeric(18,2) DEFAULT '0' NOT NULL,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'د.ع' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(18,2) NOT NULL,
	"document_id" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "movements" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"sku" text NOT NULL UNIQUE,
	"category" text NOT NULL,
	"price" numeric(18,2) NOT NULL,
	"cost" numeric(18,2) DEFAULT '0' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"minimum" integer DEFAULT 10 NOT NULL,
	"unit" text DEFAULT 'قطعة' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"name" text DEFAULT 'الكفيل لحلول الطاقة' NOT NULL,
	"currency" text DEFAULT 'د.ع' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT 'كربلاء المقدسة، العراق' NOT NULL,
	"logo" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");