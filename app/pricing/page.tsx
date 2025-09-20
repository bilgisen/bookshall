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

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <PricingTable subscriptionDetails={subscriptionDetails} />
    </div>
  );
}