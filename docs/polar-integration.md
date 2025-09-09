# Polar Integration Guide

This document outlines how to use the Polar payment integration in the BooksHall application.

## Setup

1. **Environment Variables**
   Ensure these environment variables are set in your `.env` file:
   ```
   # Polar
   POLAR_ACCESS_TOKEN=your_polar_access_token
   POLAR_WEBHOOK_SECRET=your_webhook_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_STARTER_TIER=your_starter_tier_id
   ```

2. **Install Dependencies**
   ```bash
   pnpm add @polar-sh/sdk
   ```

## Services

### 1. Polar Client

Base client for interacting with the Polar API.

```typescript
import { polarClient } from '@/lib/services/polar/client';

// Example: List products
const products = await polarClient.products.list({ limit: 10 });
```

### 2. Customer Service

Handles customer-related operations.

```typescript
import { PolarCustomerService } from '@/lib/services/polar/customer-service';

// Create a customer
const customer = await PolarCustomerService.createCustomer(
  'user@example.com',
  'John Doe',
  { userId: '123' }
);

// Get a customer
const customer = await PolarCustomerService.getCustomer('cus_123');

// Update a customer
const updated = await PolarCustomerService.updateCustomer('cus_123', {
  email: 'new.email@example.com',
  metadata: { userId: '123', plan: 'premium' }
});
```

### 3. Checkout Service

Handles checkout sessions and payments.

```typescript
import { PolarCheckoutService } from '@/lib/services/polar/checkout-service';

// Create a checkout session
const session = await PolarCheckoutService.createCheckoutSession({
  priceId: 'price_123',
  customerId: 'cus_123',
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cancel',
  metadata: { userId: '123' }
});

// Redirect user to session.url
```

## Webhooks

Webhooks are handled automatically at `/api/webhooks/polar`. The webhook handler verifies the signature and processes events.

### Available Events

- `checkout.session.completed` - When a checkout is completed
- `customer.subscription.updated` - When a subscription is updated
- `customer.subscription.deleted` - When a subscription is cancelled

### Testing Webhooks

1. Use the Polar CLI to forward webhooks to your local environment:
   ```bash
   polar listen --forward-to localhost:3000/api/webhooks/polar
   ```

2. Trigger test events using the Polar dashboard or API.

## Testing

Run the integration test script:

```bash
pnpm tsx scripts/test-polar-integration.ts
```

## Troubleshooting

1. **Webhook Signature Verification Fails**
   - Ensure `POLAR_WEBHOOK_SECRET` is set correctly
   - Verify the payload is not modified before verification

2. **API Authentication Fails**
   - Check that `POLAR_ACCESS_TOKEN` is valid
   - Ensure the token has the required permissions

3. **TypeScript Errors**
   - Make sure `@types/node` is installed
   - Check that your `tsconfig.json` includes Node.js types

## Security Notes

- Never log sensitive information
- Always verify webhook signatures
- Use environment variables for secrets
- Implement proper error handling

## Resources

- [Polar API Documentation](https://docs.polar.sh/)
- [Polar Dashboard](https://dashboard.polar.sh/)
- [Polar Node.js SDK](https://github.com/polarsource/polar-js)
