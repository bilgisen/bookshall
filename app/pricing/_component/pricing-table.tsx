"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ---- Types ----
type SubscriptionDetails = {
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

type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: "CANCELED" | "EXPIRED" | "GENERAL";
};

interface PricingTableProps {
  subscriptionDetails: SubscriptionDetailsResult;
}

// ---- Plan Config ----
const plans = [
  {
    name: "Starter",
    price: 6.9,
    credits: 1000,
    envTier: process.env.NEXT_PUBLIC_STARTER_TIER,
    envSlug: process.env.NEXT_PUBLIC_STARTER_SLUG,
    description: "You can publish up to 4 books per month with 1000 credits. Your credits roll over.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
  },
  {
    name: "Publisher",
    price: 14.9,
    credits: 2500,
    envTier: process.env.NEXT_PUBLIC_PUBLISHER_TIER,
    envSlug: process.env.NEXT_PUBLIC_PUBLISHER_SLUG,
    description: "Publish more books with 2500 monthly credits.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
  },
  {
    name: "Pro Publisher",
    price: 29.9,
    credits: 6000,
    envTier: process.env.NEXT_PUBLIC_PRO_TIER,
    envSlug: process.env.NEXT_PUBLIC_PRO_SLUG,
    description: "Professional plan with 6000 credits per month.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
  },
];

export default function PricingTable({ subscriptionDetails }: PricingTableProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        setIsAuthenticated(!!session.data?.user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleCheckout = async (productId?: string, slug?: string) => {
    if (!productId || !slug) {
      toast.error("Missing checkout configuration");
      return;
    }

    if (isAuthenticated === false) {
      router.push("/sign-in");
      return;
    }

    try {
      await authClient.checkout({ products: [productId], slug });
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Oops, something went wrong");
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open subscription management");
    }
  };

  const isCurrentPlan = (tierProductId?: string) => {
    return (
      subscriptionDetails.hasSubscription &&
      subscriptionDetails.subscription?.productId === tierProductId &&
      subscriptionDetails.subscription?.status === "active"
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <section className="flex flex-col items-center justify-center px-4 mb-24 w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-medium tracking-tight mb-4">Pricing</h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that fits your publishing needs.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full">
        {plans.map((plan) => (
          <Card key={plan.name} className="relative h-fit">
            {isCurrentPlan(plan.envTier) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Current Plan
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.credits} credits included
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              {isCurrentPlan(plan.envTier) ? (
                <div className="w-full space-y-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleManageSubscription}
                  >
                    Manage Subscription
                  </Button>
                  {subscriptionDetails.subscription && (
                    <p className="text-sm text-muted-foreground text-center">
                      {subscriptionDetails.subscription.cancelAtPeriodEnd
                        ? `Expires ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`
                        : `Renews ${formatDate(subscriptionDetails.subscription.currentPeriodEnd)}`}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(plan.envTier, plan.envSlug)}
                >
                  {isAuthenticated === false
                    ? "Sign In to Subscribe"
                    : `Subscribe to ${plan.name}`}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

    
    </section>
  );
}
