import { getSubscriptionDetails } from "@/lib/subscription";
import { authClient } from "@/lib/auth-client";
import PricingTable from "./_component/pricing-table";

export default async function PricingPage() {
  const { data: session } = await authClient.getSession();
  const userId = session?.user?.id;
  
  // Only fetch subscription details if user is logged in
  const subscriptionDetails = userId 
    ? await getSubscriptionDetails(userId)
    : { hasSubscription: false };

  // Tip uyumsuzluğu için: PricingTable'a subscriptionDetails propunu verirken
  // productId gibi alanlar null olabileceği için, PricingTable'da SubscriptionDetails tipini
  // 'string | null' olarak güncelleyin veya burada fallback verin.
  // Burada fallback ile tip hatasını engelliyoruz:
  const safeSubscriptionDetails = subscriptionDetails.subscription
    ? {
        ...subscriptionDetails,
        subscription: {
          ...subscriptionDetails.subscription,
          productId: subscriptionDetails.subscription.productId ?? "",
        },
      }
    : subscriptionDetails;

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <PricingTable subscriptionDetails={safeSubscriptionDetails} />
    </div>
  );
}