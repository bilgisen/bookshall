import { polarClient } from './client';

export class PolarCheckoutService {
  /**
   * Create a checkout session
   */
  static async createCheckoutSession({
    priceId,
    customerId,
    successUrl,
    cancelUrl,
    metadata = {},
  }: {
    priceId: string;
    customerId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const session = await polarClient.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: customerId,
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
      });

      return session;
    } catch (error) {
      console.error('❌ Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Get a checkout session by ID
   */
  static async getCheckoutSession(sessionId: string) {
    try {
      return await polarClient.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error(`❌ Failed to get checkout session ${sessionId}:`, error);
      throw error;
    }
  }
}
