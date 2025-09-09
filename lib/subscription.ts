// Using relative imports to avoid module resolution issues
import { auth as authModule } from "./auth";
import { db } from "./db/drizzle";
import { subscription } from "./db";

// Type declaration for the auth module
declare module "./auth" {
  export const authModule: {
    api: {
      getSession: (options: { headers: () => Promise<Headers> }) => Promise<{
        user?: {
          id: string;
          email?: string;
          name?: string;
        } | null;
      }>;
    };
  };
}
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

// Type for the raw subscription data from the database
type RawSubscription = {
  id: string;
  userId: string | null;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
  modifiedAt: Date | null; // This is the actual field name in the database
  organizationId?: string | null;
};

export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  try {
    const session = await authModule.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    const userSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, session.user.id));

    if (!userSubscriptions.length) {
      return { hasSubscription: false };
    }

    // Get the most recent active subscription
    const activeSubscription = (userSubscriptions as unknown as RawSubscription[])
      .filter((sub) => sub.status === "active")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    if (!activeSubscription) {
      // Check for canceled or expired subscriptions
const latestSubscription = (userSubscriptions as unknown as RawSubscription[])
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      if (latestSubscription) {
        const now = new Date();
        const currentPeriodEnd = new Date(latestSubscription.currentPeriodEnd);
        const isExpired = currentPeriodEnd < now;
        const isCanceled = latestSubscription.status === "canceled";

        return {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId,
            status: latestSubscription.status,
            amount: latestSubscription.amount,
            currency: latestSubscription.currency,
            recurringInterval: latestSubscription.recurringInterval,
            currentPeriodStart: new Date(latestSubscription.currentPeriodStart),
            currentPeriodEnd: new Date(latestSubscription.currentPeriodEnd),
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt ? new Date(latestSubscription.canceledAt) : null,
            organizationId: null,
          },
          error: isCanceled ? "Subscription has been canceled" : isExpired ? "Subscription has expired" : "Subscription is not active",
          errorType: isCanceled ? "CANCELED" : isExpired ? "EXPIRED" : "GENERAL",
        };
      }

      return { hasSubscription: false };
    }

    return {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        recurringInterval: activeSubscription.recurringInterval,
        currentPeriodStart: new Date(activeSubscription.currentPeriodStart),
        currentPeriodEnd: new Date(activeSubscription.currentPeriodEnd),
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt ? new Date(activeSubscription.canceledAt) : null,
        organizationId: activeSubscription.organizationId || null,
      },
    };
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return {
      hasSubscription: false,
      error: "Failed to load subscription details",
      errorType: "GENERAL",
    };
  }
}

// Simple helper to check if user has an active subscription
export async function isUserSubscribed(): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return result.hasSubscription && result.subscription?.status === "active";
}

// Helper to check if user has access to a specific product/tier
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return (
    result.hasSubscription &&
    result.subscription?.status === "active" &&
    result.subscription?.productId === productId
  );
}

// Helper to get user's current subscription status
export async function getUserSubscriptionStatus(): Promise<"active" | "canceled" | "expired" | "none"> {
  const result = await getSubscriptionDetails();
  
  if (!result.hasSubscription) {
    return "none";
  }
  
  if (result.subscription?.status === "active") {
    return "active";
  }
  
  if (result.errorType === "CANCELED") {
    return "canceled";
  }
  
  if (result.errorType === "EXPIRED") {
    return "expired";
  }
  
  return "none";
}