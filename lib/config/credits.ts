/**
 * Credit Tariffs Configuration
 * 
 * This file defines the credit costs and earnings for various actions in the system.
 * All credit values are in the smallest unit (e.g., 1 = 1 credit).
 */

export type CreditAction =
  // User actions that cost credits
  | 'PUBLISH_BOOK'          // When a user publishes a new book
  | 'PUBLISH_CHAPTER'        // When a user publishes a new chapter
  | 'USE_AI_ASSISTANT'       // When a user uses the AI assistant
  | 'DOWNLOAD_BOOK'          // When a user downloads a book
  | 'ENABLE_PREMIUM_FEATURE' // When a user enables a premium feature

  // User actions that earn credits
  | 'SIGN_UP_BONUS'          // When a new user signs up
  | 'REFERRAL_BONUS'         // When a user refers a friend who signs up
  | 'DAILY_LOGIN'            // When a user logs in on a new day
  | 'COMPLETE_PROFILE'       // When a user completes their profile
  | 'SUBSCRIPTION_RENEWAL'   // When a user's subscription renews
  | 'ADMIN_GRANT';           // When an admin grants credits manually

// Define the credit values for each action
type CreditTariff = {
  earn?: number;  // Credits earned by this action
  spend?: number; // Credits spent by this action
  description: string; // Human-readable description
};

export const creditTariffs: Record<CreditAction, CreditTariff> = {
  // Spending actions
  PUBLISH_BOOK: {
    spend: 100,
    description: 'Publish a new book',
  },
  
  PUBLISH_CHAPTER: {
    spend: 10,
    description: 'Publish a new chapter',
  },
  
  USE_AI_ASSISTANT: {
    spend: 5,
    description: 'Use AI writing assistant',
  },
  
  DOWNLOAD_BOOK: {
    spend: 20,
    description: 'Download a book',
  },
  
  ENABLE_PREMIUM_FEATURE: {
    spend: 50,
    description: 'Enable premium feature',
  },
  
  // Earning actions
  SIGN_UP_BONUS: {
    earn: 100,
    description: 'Welcome bonus for new users',
  },
  
  REFERRAL_BONUS: {
    earn: 200,
    description: 'Referral bonus for bringing in a new user',
  },
  
  DAILY_LOGIN: {
    earn: 5,
    description: 'Daily login bonus',
  },
  
  COMPLETE_PROFILE: {
    earn: 50,
    description: 'Complete your profile',
  },
  
  SUBSCRIPTION_RENEWAL: {
    earn: 500,
    description: 'Monthly subscription renewal bonus',
  },
  
  ADMIN_GRANT: {
    earn: 0, // Will be set by admin
    description: 'Credits granted by administrator',
  },
};

// Subscription plans and their credit benefits
export const subscriptionPlans = {
  FREE: {
    name: 'Free',
    monthlyCredits: 0,
    features: [
      'Basic access',
      'Limited credits',
    ],
  },
  
  STARTER: {
    name: 'Starter',
    monthlyCredits: 1000,
    features: [
      '1,000 credits/month',
      'Publish up to 5 books',
      'Basic analytics',
    ],
  },
  
  PRO: {
    name: 'Pro',
    monthlyCredits: 5000,
    features: [
      '5,000 credits/month',
      'Unlimited books',
      'Advanced analytics',
      'Priority support',
    ],
  },
  
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyCredits: 20000,
    features: [
      '20,000 credits/month',
      'Unlimited books',
      'Advanced analytics',
      'Dedicated support',
      'Custom features',
    ],
  },
};

/**
 * Get the credit cost or earning for an action
 */
export function getCreditValue(action: CreditAction, customAmount?: number): number {
  const tariff = creditTariffs[action];
  
  if (customAmount !== undefined) {
    return customAmount;
  }
  
  if (tariff.earn !== undefined) {
    return tariff.earn;
  }
  
  if (tariff.spend !== undefined) {
    return -tariff.spend; // Return as negative for spending
  }
  
  return 0;
}

/**
 * Get a human-readable description of a credit action
 */
export function getCreditDescription(action: CreditAction): string {
  return creditTariffs[action]?.description || action;
}
