import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

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

export async function getSubscriptionDetails(userId: string): Promise<SubscriptionDetailsResult> {
  try {
    if (!userId) {
      return { hasSubscription: false };
    }

    // Get all user subscriptions
    const userSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId));

    if (!userSubscriptions.length) {
      return { hasSubscription: false };
    }

    // Get the most recent active subscription
    const activeSubscription = userSubscriptions
      .filter((sub) => sub.status === "active")
      .sort((a, b) => new Date(b.currentPeriodEnd).getTime() - new Date(a.currentPeriodEnd).getTime())[0];

    if (!activeSubscription) {
      // Check for canceled or expired subscriptions
      const latestSubscription = userSubscriptions
        .sort((a, b) => new Date(b.currentPeriodEnd).getTime() - new Date(a.currentPeriodEnd).getTime())[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = latestSubscription.currentPeriodEnd && new Date(latestSubscription.currentPeriodEnd) < now;
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
            currentPeriodStart: latestSubscription.currentPeriodStart,
            currentPeriodEnd: latestSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt,
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
        currentPeriodStart: activeSubscription.currentPeriodStart,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt,
        organizationId: null,
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
export async function isUserSubscribed(userId: string): Promise<boolean> {
  if (!userId) return false;
  const details = await getSubscriptionDetails(userId);
  return details.hasSubscription && details.subscription?.status === 'active';
}

export async function hasAccessToProduct(userId: string, productId: string): Promise<boolean> {
  if (!userId) return false;
  const details = await getSubscriptionDetails(userId);
  return (
    details.hasSubscription && 
    details.subscription?.status === 'active' &&
    details.subscription.productId === productId
  );
}

export async function getUserSubscriptionStatus(userId: string): Promise<"active" | "canceled" | "expired" | "none"> {
  if (!userId) return 'none';
  
  const details = await getSubscriptionDetails(userId);
  
  if (!details.hasSubscription || !details.subscription) return 'none';
  
  if (details.subscription.status === 'canceled') return 'canceled';
  
  if (details.subscription.currentPeriodEnd && 
      new Date(details.subscription.currentPeriodEnd) < new Date()) {
    return 'expired';
  }
  
  return details.subscription.status === 'active' ? 'active' : 'none';
}