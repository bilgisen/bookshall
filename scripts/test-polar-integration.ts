#!/usr/bin/env node
/**
 * Test script to verify Polar integration
 * Run with: pnpm tsx scripts/test-polar-integration.ts
 */

import { polarClient } from '../lib/services/polar/client';
import { PolarCustomerService } from '../lib/services/polar/customer-service';
import { PolarCheckoutService } from '../lib/services/polar/checkout-service';

async function testPolarIntegration() {
  try {
    console.log('🚀 Testing Polar integration...');
    
    // 1. Test client initialization
    console.log('\n🔍 Testing Polar client initialization...');
    if (!polarClient) {
      throw new Error('Polar client failed to initialize');
    }
    console.log('✅ Polar client initialized successfully');
    
    // 2. Test listing products
    console.log('\n📦 Testing product listing...');
    const products = await polarClient.products.list({ limit: 5 });
    console.log(`✅ Found ${products.data?.length || 0} products`);
    
    if (products.data?.length) {
      console.log('Sample product:', {
        id: products.data[0].id,
        name: products.data[0].name,
        active: products.data[0].active,
      });
    }
    
    // 3. Test customer operations
    console.log('\n👤 Testing customer operations...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    console.log('Creating test customer...');
    const customer = await PolarCustomerService.createCustomer(
      testEmail,
      'Test User',
      { test: true }
    );
    console.log(`✅ Created customer: ${customer.id} (${customer.email})`);
    
    // 4. Test checkout session creation
    if (products.data?.length) {
      console.log('\n🛒 Testing checkout session creation...');
      const priceId = products.data[0].default_price;
      
      if (typeof priceId === 'string') {
        const session = await PolarCheckoutService.createCheckoutSession({
          priceId,
          customerId: customer.id,
          successUrl: 'https://your-app.com/success',
          cancelUrl: 'https://your-app.com/cancel',
          metadata: { test: true }
        });
        
        console.log('✅ Created checkout session:', session.url);
      } else {
        console.warn('⚠️ No default price found for the product');
      }
    }
    
    console.log('\n🎉 Polar integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Polar integration test failed:');
    console.error(error);
    process.exit(1);
  }
}

testPolarIntegration();
