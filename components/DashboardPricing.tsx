"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SubscriptionDetails = {
  productId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
};

type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
};

interface DashboardUpgradePlansProps {
  subscriptionDetails: SubscriptionDetailsResult;
}

const plans = [
  {
    name: "Starter",
    price: 5.90,
    credits: 1000,
    envTier: process.env.NEXT_PUBLIC_STARTER_TIER,
    envSlug: process.env.NEXT_PUBLIC_STARTER_SLUG,
  },
  {
    name: "Publisher",
    price: 9.90,
    credits: 2000,
    isPopular: true,
    envTier: process.env.NEXT_PUBLIC_PUBLISHER_TIER,
    envSlug: process.env.NEXT_PUBLIC_PUBLISHER_SLUG,
  },
  {
    name: "Pro Publisher",
    price: 19.90,
    credits: 5000,
    envTier: process.env.NEXT_PUBLIC_PRO_TIER,
    envSlug: process.env.NEXT_PUBLIC_PRO_SLUG,
  },
];

const extraCredits = [
  {
    name: "1000 Credit",
    price: 5.90,
    credits: 1000,
    envTier: process.env.NEXT_PUBLIC_CREDIT_K_TIER || "credit_k",
    envSlug: process.env.NEXT_PUBLIC_CREDIT_K_SLUG || "credit_k",
  },
  {
    name: "2000 Credits",
    price: 9.90,
    credits: 2000,
    envTier: process.env.NEXT_PUBLIC_CREDIT_P_TIER || "credit_p",
    envSlug: process.env.NEXT_PUBLIC_CREDIT_P_SLUG || "credit_p",
  },
  {
    name: "5000 Credits",
    price: 19.90,
    credits: 5000,
    envTier: process.env.NEXT_PUBLIC_CREDIT_PE_TIER || "credit_pe",
    envSlug: process.env.NEXT_PUBLIC_CREDIT_PE_SLUG || "credit_pe",
  },
];

export default function DashboardUpgradePlans({
  subscriptionDetails,
}: DashboardUpgradePlansProps) {
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

  const isCurrentPlan = (tierProductId?: string) => {
    return (
      subscriptionDetails.hasSubscription &&
      subscriptionDetails.subscription?.productId === tierProductId &&
      subscriptionDetails.subscription?.status === "active"
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upgrade Plan</h2>
        <div className="space-y-4">
          {plans.map((plan, index) => (
            <div key={`${plan.name}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.credits} credits / month</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckout(plan.envTier, plan.envSlug)}
                  className="ml-4"
                >
                  ${plan.price} /month
                </Button>
              </div>
              {index < plans.length - 1 && <hr className="border-t border-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <h2 className="text-lg font-semibold">Buy Extra Credits</h2>
        <div className="space-y-4">
          {extraCredits.map((credit, index) => (
            <div key={`${credit.envTier}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
            
                  <h3 className="font-medium">{credit.name}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheckout(credit.envTier, credit.envSlug)}
                  className="ml-4"
                >
                  ${credit.price}
                </Button>
              </div>
              {index < extraCredits.length - 1 && <hr className="border-t border-border" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
