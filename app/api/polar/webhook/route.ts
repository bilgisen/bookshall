import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { CreditService } from '@/lib/services/credit/credit.service';

// Define types for Polar webhook
class PolarWebhook {
  private secret: string;
  
  constructor(secret: string) {
    this.secret = secret;
  }
  
  verify(event: unknown): PolarEvent {
    // In a real implementation, verify the signature here
    // This is a simplified version
    return event as PolarEvent;
  }
}

interface PolarPrice {
  amount: number;
  currency: string;
}

interface PolarProduct {
  id: string;
  name: string;
}

interface PolarCustomer {
  id: string;
  email: string;
}

interface PolarSubscription {
  id: string;
  status: string;
  price: PolarPrice;
  product: PolarProduct;
  customer: PolarCustomer;
  current_period_end?: string;
  billing_cycle?: string;
  amount?: number;
  currency?: string;
}

interface PolarEvent {
  type: string;
  data: Record<string, unknown>;
}

// Initialize the webhook with your Polar.sh webhook secret
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('POLAR_WEBHOOK_SECRET environment variable is not set');
}

const webhook = new PolarWebhook(webhookSecret);

export async function POST(request: Request) {
  try {
    // Get the signature from the headers
    const headersList = await headers();
    const signature = headersList.get('polar-webhook-signature');
    if (!signature) {
      console.error('Missing Polar signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get the raw body for signature verification
    const event = (await request.json()) as PolarEvent;
    try {
      // Verify the webhook signature
      const verifiedEvent = webhook.verify(event);
      
      // Process the event
      await handlePolarEvent(verifiedEvent);
      
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface PolarEvent {
  type: string;
  data: Record<string, unknown>;
}

async function handlePolarEvent(event: PolarEvent) {
  console.log('Processing Polar event:', event.type);
  
  // Safely access the event data with proper type checking
  const eventData = event.data as Record<string, unknown>;
  const eventId = (eventData.id as string) || 'unknown';
  
  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
      await handleSubscriptionEvent(eventData);
      break;
      
    case 'subscription.canceled':
      // Handle subscription cancellation if needed
      console.log('Subscription canceled:', eventId);
      break;
      
    case 'subscription.expired':
      // Handle subscription expiration if needed
      console.log('Subscription expired:', eventId);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

interface PolarSubscription {
  id: string;
  status: string;
  price: {
    amount: number;
    currency: string;
  };
  product: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    email: string;
  };
  current_period_end?: string;
}

async function handleSubscriptionEvent(subscriptionData: unknown) {
  // Safely cast the subscription data
  const subscription = subscriptionData as PolarSubscription;
  const { customer, product, status } = subscription;
  
  // Skip processing if the subscription is not active
  if (status !== 'active') {
    console.log(`Skipping non-active subscription: ${subscription.id}`);
    return;
  }
  
  try {
    // Find the user by their Polar customer ID
    const user = await findUserByPolarCustomerId(customer.id);
    if (!user) {
      console.error(`User not found for Polar customer ID: ${customer.id}`);
      return;
    }
    
    // Determine the credit amount based on the product (previously plan)
    const creditAmount = getCreditAmountForPlan(product.id);
    if (creditAmount <= 0) {
      console.log(`No credit amount defined for product: ${product.id}`);
      return;
    }
    
    // Add credits to the user's account
    await CreditService.earnCredits(
      user.id,
      creditAmount,
      `subscription_${product.id}`,
      {
        subscriptionId: subscription.id,
        planId: product.id,
        planName: product.name,
        ...(subscription.billing_cycle ? { billingCycle: subscription.billing_cycle } : {}),
        amount: subscription.amount || 0,
        currency: subscription.currency || 'USD',
        status: subscription.status,
      }
    );
    
    console.log(`Added ${creditAmount} credits to user ${user.id} for ${product.name} subscription`);
  } catch (error) {
    console.error('Error processing subscription event:', error);
    throw error;
  }
}

interface User {
  id: string;
  // Add other user properties as needed
  email?: string;
  name?: string;
  // Add polarCustomerId if it exists in your schema
  polarCustomerId?: string;
}

async function findUserByPolarCustomerId(polarCustomerId: string): Promise<User | null> {
  try {
    // In a real implementation, you would look up the user by their Polar customer ID
    // This is a placeholder - replace with your actual user lookup logic
    // For example, you might store the Polar customer ID in your users table
    // and query it here.
    
    // Example implementation (replace with your actual database query):
    /*
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.polarCustomerId, polarCustomerId),
    });
    
    if (!user) {
      console.log(`User not found for Polar customer ID: ${polarCustomerId}`);
      return null;
    }
    
    return user;
    */
    
    // For now, we'll return a mock user with the ID set to the polarCustomerId
    // You should implement proper user lookup based on your schema
    console.log(`Looking up user for Polar customer ID: ${polarCustomerId}`);
    return {
      id: polarCustomerId, // This should be your internal user ID
      polarCustomerId,
      email: 'user@example.com'
    };
  } catch (error) {
    console.error('Error finding user by Polar customer ID:', error);
    return null;
  }
}

function getCreditAmountForPlan(planId: string): number {
  // Map Polar plan IDs to credit amounts
  // Update this mapping based on your Polar plans
  const planCreditMap: Record<string, number> = {
    // Example mappings - replace with your actual plan IDs
    'plan_starter': 1000,  // Starter plan: 1000 credits/month
    'plan_pro': 5000,      // Pro plan: 5000 credits/month
    'plan_enterprise': 20000, // Enterprise plan: 20000 credits/month
  };
  
  return planCreditMap[planId] || 0;
}

// Bu dosya artık kullanılmıyor. Tüm webhook işlemleri /api/auth/polar/webhooks üzerinden yönetilmektedir.
