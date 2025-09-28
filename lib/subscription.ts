// lib/subscription.ts
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SubscriptionDetails = {
  id: string;
  productId: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
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
      .sort((a, b) => {
        const aEnd = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : 0;
        const bEnd = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : 0;
        return bEnd - aEnd;
      })[0];

    if (!activeSubscription) {
      // Check for canceled or expired subscriptions
      const latestSubscription = userSubscriptions
        .sort((a, b) => {
          const aEnd = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : 0;
          const bEnd = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : 0;
          return bEnd - aEnd;
        })[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = latestSubscription.currentPeriodEnd ? new Date(latestSubscription.currentPeriodEnd) < now : false;
        const isCanceled = latestSubscription.status === "canceled";

        return {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId ?? null,
            status: latestSubscription.status ?? null,
            amount: latestSubscription.amount ?? null,
            currency: latestSubscription.currency ?? null,
            recurringInterval: latestSubscription.recurringInterval ?? null,
            currentPeriodStart: latestSubscription.currentPeriodStart ?? null,
            currentPeriodEnd: latestSubscription.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd ?? null,
            canceledAt: latestSubscription.canceledAt ?? null,
            organizationId: null,
          },
          error: isCanceled ? "Subscription has been canceled" : isExpired ? "Subscription has expired" : "Subscription is not active",
          errorType: isCanceled ? "CANCELED" : isExpired ? "EXPIRED" : "GENERAL"
        };
      } else {
        return { hasSubscription: false };
      }
    }

    return {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId ?? null,
        status: activeSubscription.status ?? null,
        amount: activeSubscription.amount ?? null,
        currency: activeSubscription.currency ?? null,
        recurringInterval: activeSubscription.recurringInterval ?? null,
        currentPeriodStart: activeSubscription.currentPeriodStart ?? null,
        currentPeriodEnd: activeSubscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd ?? null,
        canceledAt: activeSubscription.canceledAt ?? null,
        organizationId: null,
      }
    };
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return {
      hasSubscription: false,
      error: "Failed to load subscription details",
      errorType: "GENERAL"
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