import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHmac } from 'crypto';
import { db } from '@/db/drizzle';
import { subscription, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for webhook handling
export const runtime = 'nodejs';

// Verify the webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error('❌ POLAR_WEBHOOK_SECRET is not set');
    return false;
  }
  
  try {
    const digest = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const isSignatureValid = signature === digest;
    if (!isSignatureValid) {
      console.error('❌ Invalid webhook signature');
    }
    
    return isSignatureValid;
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

// Types for Polar webhook events
interface PolarEvent<T = unknown> {
  id: string;
  type: string;
  data: {
    object: T;
  };
}

interface SubscriptionObject {
  id: string;
  created: number;
  currency: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  start_date: number;
  ended_at: number | null;
  customer: string;
  customer_email?: string; // Added for user lookup
  discount?: {
    id: string;
  };
  cancellation_details?: {
    reason?: string;
    comment?: string;
  };
  items: {
    data: Array<{
      price: {
        id: string;
        unit_amount: number;
        recurring?: {
          interval: string;
        };
        product: string;
      };
      quantity: number;
    }>;
  };
  latest_invoice: string;
  metadata?: Record<string, string | number | boolean | null | undefined | string[]>;
}

// Handle subscription created/updated event
async function handleSubscriptionEvent(event: PolarEvent<SubscriptionObject>) {
  const subscriptionData = event.data.object;
  
  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(subscription)
      .where(eq(subscription.id, subscriptionData.id))
      .then(rows => rows[0]);

    // Extract userId from metadata or find by customer email if not provided
    let userId = subscriptionData.metadata?.userId || null;
    
    // If userId is not in metadata, try to find user by customer email
    if (!userId) {
      const customer = await db
        .select({ email: user.email, id: user.id })
        .from(user)
        .where(eq(user.email, subscriptionData.customer_email || ''))
        .then(rows => rows[0]);
      
      if (customer) {
        userId = customer.id;
      }
    }

    // Ensure we have a valid user ID before proceeding
    if (!userId) {
      console.error('❌ No user ID found for subscription:', subscriptionData.id);
      throw new Error('No user ID found for subscription');
    }

    // Ensure userId is a string
    const userIdStr = String(userId);

    // Build the subscription object with all required fields
    const subscriptionObj = {
      id: subscriptionData.id,
      createdAt: new Date(subscriptionData.created * 1000),
      modifiedAt: new Date(),
      amount: subscriptionData.items.data[0]?.price.unit_amount || 0,
      currency: subscriptionData.currency,
      recurringInterval: subscriptionData.items.data[0]?.price.recurring?.interval || 'month',
      status: subscriptionData.status,
      currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
      currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end || false,
      canceledAt: subscriptionData.canceled_at ? new Date(subscriptionData.canceled_at * 1000) : null,
      startedAt: new Date(subscriptionData.start_date * 1000),
      // Include both endsAt and endedAt to match schema
      endsAt: subscriptionData.ended_at ? new Date(subscriptionData.ended_at * 1000) : null,
      endedAt: subscriptionData.ended_at ? new Date(subscriptionData.ended_at * 1000) : null,
      customerId: subscriptionData.customer,
      productId: subscriptionData.items.data[0]?.price.product || '',
      discountId: subscriptionData.discount?.id || null,
      checkoutId: subscriptionData.latest_invoice || `ch_${subscriptionData.id}`,
      customerCancellationReason: subscriptionData.cancellation_details?.reason || null,
      customerCancellationComment: subscriptionData.cancellation_details?.comment || null,
      userId: userIdStr, // Ensure userId is a string
      metadata: JSON.stringify({
        ...subscriptionData.metadata,
        customer_email: subscriptionData.customer_email,
        items: subscriptionData.items.data.map(item => ({
          price: item.price.id,
          quantity: item.quantity,
        })),
      }),
      customFieldData: JSON.stringify({}) // Initialize as empty object if no custom fields
    };

    if (existing) {
      // Update existing subscription
      const { id, ...updateData } = subscriptionObj;
      await db
        .update(subscription)
        .set({
          ...updateData,
          modifiedAt: new Date()
        })
        .where(eq(subscription.id, id));
      console.log(`✅ Updated subscription ${id}`);
    } else {
      // Create new subscription
      await db.insert(subscription).values({
        ...subscriptionObj,
        modifiedAt: new Date()
      });
      console.log(`✅ Created new subscription ${subscriptionObj.id}`);
    }
  } catch (error) {
    console.error('❌ Error handling subscription event:', error);
    throw error;
  }
}

// Handle subscription deleted/canceled event
async function handleSubscriptionDeleted(event: PolarEvent<{ id: string }>) {
  const subscriptionId = event.data.object.id;
  
  try {
    await db
      .update(subscription)
      .set({ 
        status: 'canceled',
        canceledAt: new Date(),
        modifiedAt: new Date() 
      })
      .where(eq(subscription.id, subscriptionId));
    
    console.log(`✅ Marked subscription as canceled: ${subscriptionId}`);
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // Get headers and raw payload
    const headersList = await headers();
    const signature = headersList.get('polar-signature') || '';
    const eventType = headersList.get('polar-event-type');
    const payload = await req.text();
    
    // Log incoming webhook for debugging
    console.log('🔔 Received Polar webhook with type:', eventType);

    // Verify the webhook signature
    if (!verifySignature(payload, signature)) {
      console.error('❌ Webhook signature verification failed');
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Parse the event
    let event;
    try {
      event = JSON.parse(payload);
      console.log(`🔍 Processing event: ${event.type} (ID: ${event.id})`);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful checkout
        console.log('✅ Checkout completed:', event.data.object.id);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event);
        break;
        
      case 'customer.subscription.deleted':
      case 'customer.subscription.canceled':
        await handleSubscriptionDeleted(event);
        break;
        
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error("❌ Unhandled error in webhook handler:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
