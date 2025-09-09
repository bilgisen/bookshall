import { createHmac } from 'crypto';
import type { Event, CheckoutSession, Subscription } from '@polar-sh/sdk';

// Re-export types for backward compatibility
type PolarEvent = Event;

export class PolarWebhookService {
  /**
   * Verify the Polar webhook signature
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean {
    try {
      // Verify the webhook signature using the secret
      // Note: The actual implementation may vary based on the Polar SDK version
      // This is a simplified version - adjust according to the actual SDK API
      const computedSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return computedSignature === signature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle webhook events
   */
  static async handleWebhookEvent(event: PolarEvent) {
    console.log(`🔔 Received Polar webhook event: ${event.type}`);

    try {
      const eventData = event.data.object as Record<string, unknown>;
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session: CheckoutSession = {
            id: eventData.id as string,
            // Add other properties as needed
          };
          await this.handleCheckoutSessionCompleted(session);
          break;
        }
          
        case 'customer.subscription.updated': {
          const subscription: Subscription = {
            id: eventData.id as string,
            // Add other properties as needed
          };
          await this.handleSubscriptionUpdated(subscription);
          break;
        }
          
        case 'customer.subscription.deleted': {
          const subscription: Subscription = {
            id: eventData.id as string,
            // Add other properties as needed
          };
          await this.handleSubscriptionDeleted(subscription);
          break;
        }
          
        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
      
      return { received: true };
    } catch (error) {
      console.error(`❌ Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  private static async handleCheckoutSessionCompleted(session: CheckoutSession) {
    console.log('🛒 Checkout session completed:', session.id);
    // Add your business logic here
    // Example: Update user subscription status in your database
  }

  private static async handleSubscriptionUpdated(subscription: Subscription) {
    console.log('🔄 Subscription updated:', subscription.id);
    // Add your business logic here
    // Example: Update subscription status in your database
  }

  private static async handleSubscriptionDeleted(subscription: Subscription) {
    console.log('🗑️ Subscription deleted:', subscription.id);
    // Add your business logic here
    // Example: Mark subscription as cancelled in your database
  }
}
