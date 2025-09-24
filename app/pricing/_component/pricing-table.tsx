// app/pricing/_component/pricing-table.tsx
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
import { motion } from "framer-motion";

interface PricingTableProps {
  subscriptionDetails?: {
    hasSubscription?: boolean;
    isActive?: boolean;
  };
}

export default function PricingTable({
  subscriptionDetails = { hasSubscription: false, isActive: false },
}: PricingTableProps) {
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

  const handleCheckout = async (productId: string, slug: string) => {
    if (isAuthenticated === false) {
      router.push("/sign-in");
      return;
    }

    try {
      await authClient.checkout({
        products: [productId],
        slug: slug,
      });
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

  const STARTER_TIER = process.env.NEXT_PUBLIC_STARTER_TIER;
  const STARTER_SLUG = process.env.NEXT_PUBLIC_STARTER_SLUG;
  const PUBLISHER_TIER = process.env.NEXT_PUBLIC_PUBLISHER_TIER;
  const PUBLISHER_SLUG = process.env.NEXT_PUBLIC_PUBLISHER_SLUG;
  const PRO_PUBLISHER_TIER = process.env.NEXT_PUBLIC_PRO_PUBLISHER_TIER;
  const PRO_PUBLISHER_SLUG = process.env.NEXT_PUBLIC_PRO_PUBLISHER_SLUG;

  if (!STARTER_TIER || !STARTER_SLUG || !PUBLISHER_TIER || !PUBLISHER_SLUG || !PRO_PUBLISHER_TIER || !PRO_PUBLISHER_SLUG) {
    throw new Error("Missing required environment variables for pricing tiers");
  }

  // Check if the current plan is active
  const isCurrentPlan = (planId: string) => {
    return subscriptionDetails?.isActive === true;
  };

  const subscriptionPlans = [
    {
      id: "starter",
      name: "Starter",
      price: "5.60",
      credits: "1000",
      description: "Perfect for getting started",
      features: ["Epub, HTML, PDF, DOC, Audiobook publishing"],
      usage: "Sufficient for publishing 2 EPUBs per month",
      productId: STARTER_TIER,
      slug: STARTER_SLUG,
    },
    {
      id: "publisher",
      name: "Publisher",
      price: "9.90",
      credits: "2000",
      description: "Ideal for growing publishers",
      features: ["Epub, HTML, PDF, DOC, Audiobook publishing"],
      usage: "Sufficient for publishing 4 EPUBs per month",
      productId: PUBLISHER_TIER,
      slug: PUBLISHER_SLUG,
    },
    {
      id: "pro-publisher",
      name: "Pro Publisher",
      price: "19.90",
      credits: "5000",
      description: "For professional publishers",
      features: ["Epub, HTML, PDF, DOC, Audiobook publishing"],
      usage: "Sufficient for publishing 10 EPUBs and audiobooks per month",
      productId: PRO_PUBLISHER_TIER,
      slug: PRO_PUBLISHER_SLUG,
    },
  ];

  const creditPackages = [
    {
      id: "1000-credits",
      name: "1000 Credits",
      price: "7.50",
      description: "Perfect for small projects",
    },
    {
      id: "2000-credits",
      name: "2000 Credits",
      price: "13.00",
      description: "Great for medium projects",
    },
    {
      id: "5000-credits",
      name: "5000 Credits",
      price: "30.00",
      description: "Best value for large projects",
    },
  ];

  return (
    <section className="flex flex-col bg-background items-center justify-center px-4 py-12 w-full">
      {/* Subscription Plans */}
      <div className="w-full max-w-6xl mb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Subscriptions</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {subscriptionPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative h-full flex flex-col">
                {subscriptionDetails?.isActive && (
                  <Badge className="absolute -top-3 right-4" variant="secondary">
                    Active
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg font-medium text-primary">{plan.credits} credits</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>{plan.features[0]}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>{plan.usage}</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  {subscriptionDetails?.isActive ? (
                    <div className="w-full space-y-2">
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleManageSubscription}
                      >
                        Manage Subscription
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.productId, plan.slug)}
                    >
                      {isAuthenticated === false
                        ? "Sign In to Get Started"
                        : `Get ${plan.name}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Credit Packages */}
      <div className="w-full max-w-4xl mb-16">
        <h2 className="text-2xl font-semibold mb-8 text-center">Credits</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {creditPackages.map((packageItem, index) => (
            <motion.div
              key={packageItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{packageItem.name}</CardTitle>
                  <CardDescription>{packageItem.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${packageItem.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <span>Epub, HTML, PDF, DOC, Audiobook publishing</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Coming Soon
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Common Features */}
      <div className="w-full max-w-4xl mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">All Plans Include</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            "Epub Publishing",
            "HTML Export",
            "PDF Generation",
            "DOC Conversion",
            "Audiobook Creation"
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center justify-center p-4 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">
          Need a custom plan?{" "}
          <span className="text-primary cursor-pointer hover:underline">
            Contact us
          </span>
        </p>
        <Button variant="outline" size="lg">
          Get in Touch
        </Button>
      </div>
    </section>
  );
}