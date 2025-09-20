ALTER TABLE "subscription" ALTER COLUMN "createdAt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "currency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "recurringInterval" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "currentPeriodStart" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "cancelAtPeriodEnd" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "startedAt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "customerId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "productId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "checkoutId" DROP NOT NULL;