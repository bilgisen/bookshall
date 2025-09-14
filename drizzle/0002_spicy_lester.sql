CREATE TYPE "public"."transaction_type" AS ENUM('earn', 'spend');--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_status" ALTER COLUMN "progress" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_status" ADD COLUMN "workflowRunUrl" text;--> statement-breakpoint
ALTER TABLE "workflow_status" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_status" ADD COLUMN "startedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workflow_status" ADD COLUMN "completedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;