ALTER TABLE "leads" ADD COLUMN "utm" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;