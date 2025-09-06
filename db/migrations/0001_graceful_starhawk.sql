ALTER TABLE "chapters" DROP CONSTRAINT "chapters_uuid_unique";--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "bookId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chapters" ALTER COLUMN "parentChapterId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "bookId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "uuid";