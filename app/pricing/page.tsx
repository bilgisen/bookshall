import { getSubscriptionDetails } from "@/lib/subscription";
import { auth } from "@/lib/auth";
import PricingTable from "./_component/pricing-table";

export default async function PricingPage() {
  // Make auth check optional
  let subscriptionDetails = { hasSubscription: false };
  
  try {
    const session = await auth();
    if (session?.user?.id) {
      subscriptionDetails = await getSubscriptionDetails(session.user.id);
    }
  } catch (error) {
    console.error('Error fetching subscription details:', error);
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <PricingTable subscriptionDetails={subscriptionDetails} />
    </div>
  );
}
