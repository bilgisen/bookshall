// --- Public Pricing (Frontpage) ---
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CircleCheck } from "lucide-react";
import { SubscriptionDetailsResult } from "@/lib/subscription";

interface PublicPricingProps {
  subscriptionDetails: SubscriptionDetailsResult;
}

const publicPlans = [
  {
    name: "Starter",
    price: 5.90,
    credits: 1000,
    description:
      "You can publish up to 2 books with 1000 credits. Your credits roll over.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
    buttonText: "Get Started",
  },
  {
    name: "Publisher",
    price: 9.90,
    credits: 2500,
    isPopular: true,
    description: "You can publish up to 5 books with 2500 credits. Your credits roll over.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
    buttonText: "Subscribe Now",
  },
  {
    name: "Pro Publisher",
    price: 19.90,
    credits: 5000,
    description: "You can publish up to 10 books with 6000 credits. Your credits roll over.",
    features: [
      "Epub Publishing",
      "PDF Publishing",
      "Audiobook Publishing",
      "HTML Publishing",
      "DOC Publishing",
      "AI Chat",
    ],
    buttonText: "Go Pro",
  },
];

export default function PublicPricing({ subscriptionDetails }: PublicPricingProps) {
  // Use subscription details to determine UI state
  const hasActiveSubscription = subscriptionDetails.hasSubscription;
  const currentPlan = subscriptionDetails.subscription?.productId;
  
  // Log subscription details for debugging
  console.log('Subscription Active:', hasActiveSubscription);
  console.log('Current Plan:', currentPlan);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-6">
      <h1 className="text-5xl font-semibold text-center tracking-tighter">
        Pricing
      </h1>
      <div className="mt-12 sm:mt-16 max-w-(--breakpoint-lg) mx-auto grid grid-cols-1 lg:grid-cols-3 items-center gap-10 lg:gap-0">
        {publicPlans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative border p-7 rounded-xl lg:rounded-none lg:first:rounded-l-xl lg:last:rounded-r-xl",
              {
                "border-2 border-primary py-12 rounded-xl!": plan.isPopular,
              }
            )}
          >
            {plan.isPopular && (
              <Badge className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2">
                Most Popular
              </Badge>
            )}
            <h3 className="text-lg font-medium">{plan.name}</h3>
            <p className="mt-2 text-4xl font-bold"><span className='text-xl text-muted-foreground'>$</span>{plan.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.credits} credits / month
            </p>
            <p className="mt-4 font-medium text-muted-foreground">
              {plan.description}
            </p>
            <Separator className="my-6" />
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.isPopular ? "default" : "outline"}
              size="lg"
              className="w-full mt-6"
            >
              {plan.buttonText}
            </Button>
          </div>
        ))}

<div className="mt-12 text-center">
        <p className="text-muted-foreground">
          Need a custom plan? {" "}
          <span className="text-primary cursor-pointer hover:underline">
            Contact us
          </span>
        </p>
      </div>
      </div>
    </div>

    
  );
};