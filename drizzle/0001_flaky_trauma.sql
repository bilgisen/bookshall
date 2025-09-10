CREATE TABLE "workflow_status" (
	"id" text PRIMARY KEY NOT NULL,
	"bookId" text NOT NULL,
	"workflowId" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"error" text,
	"result" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "media_url_uq";--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "notifications" SET DEFAULT '{"email":true,"push":true,"newsletter":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "workflow_status" ADD CONSTRAINT "workflow_status_bookId_books_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_url_uq" ON "media" USING btree ("url");