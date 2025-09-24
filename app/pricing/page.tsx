// app/pricing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import PricingTable from "./_component/pricing-table";
import Hero from "@/components/homepage/hero";

export default function PricingPage() {
  const [subscriptionDetails, setSubscriptionDetails] = useState({ hasSubscription: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/subscription');
        
        if (!res.ok) {
          // If unauthorized, just continue with default values
          if (res.status === 401) {
            setIsLoading(false);
            return;
          }
          
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch subscription details');
        }
        
        const data = await res.json();
        setSubscriptionDetails(data);
      } catch (error) {
        console.error('Error fetching subscription details:', error);
        // Don't show error to user, just use default values
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If there's an error, we'll just show the pricing table without subscription details
  // The table will handle the missing subscription data gracefully

  return (
    <div className="w-full">
      <Hero />
      <div className="py-16">
        <PricingTable subscriptionDetails={subscriptionDetails} />
      </div>
    </div>
  );
}