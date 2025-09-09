import { polarClient } from './client';

export class PolarCustomerService {
  /**
   * Create a new Polar customer
   */
  static async createCustomer(email: string, name?: string, metadata: Record<string, unknown> = {}) {
    try {
      const customer = await polarClient.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });
      
      console.log('✅ Polar customer created:', customer.id);
      return customer;
    } catch (error) {
      console.error('❌ Failed to create Polar customer:', error);
      throw error;
    }
  }

  /**
   * Get a customer by ID
   */
  static async getCustomer(customerId: string) {
    try {
      return await polarClient.customers.retrieve(customerId);
    } catch (error) {
      console.error(`❌ Failed to get Polar customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Update a customer
   */
  static async updateCustomer(
    customerId: string, 
    updates: {
      email?: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      return await polarClient.customers.update(customerId, updates);
    } catch (error) {
      console.error(`❌ Failed to update Polar customer ${customerId}:`, error);
      throw error;
    }
  }
}
