ALTER TABLE "books" ADD COLUMN "isPublished" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "uuid" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "isDraft" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_uuid_unique" UNIQUE("uuid");