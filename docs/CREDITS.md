# Credit System

This document outlines the credit system implementation for the BooksHall platform.

## Overview

The credit system allows users to earn and spend credits for various actions on the platform. Credits can be obtained through subscriptions, referrals, or other promotional activities, and can be spent on premium features like publishing books, using AI tools, etc.

## Database Schema

### Users Table
- `credits` (integer): The current credit balance of the user

### credit_transactions Table
- `id` (uuid): Unique identifier for the transaction
- `user_id` (uuid): Reference to the user
- `type` (enum): 'earn' or 'spend'
- `amount` (integer): Number of credits
- `reason` (string): Reason for the transaction
- `metadata` (jsonb): Additional metadata about the transaction
- `created_at` (timestamp): When the transaction occurred

## API Endpoints

### GET /api/credits/[userId]
Get the user's current balance and transaction history.

**Query Parameters:**
- `limit`: Number of transactions to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `startDate`: Filter transactions after this date
- `endDate`: Filter transactions before this date

### POST /api/credits/[userId]/earn
Add credits to a user's account.

**Request Body:**
```json
{
  "amount": 100,
  "reason": "referral_bonus",
  "metadata": {
    "referralId": "abc123"
  }
}
```

### POST /api/credits/[userId]/spend
Deduct credits from a user's account.

**Request Body:**
```json
{
  "amount": 50,
  "reason": "publish_book",
  "metadata": {
    "bookId": "book-123"
  }
}
```

## React Hooks

### useCredits
A React hook to manage credit operations in components.

```tsx
const { 
  balance, 
  transactions, 
  isLoading, 
  earnCredits, 
  spendCredits,
  performCreditAction,
  canAfford
} = useCredits(userId);

// Example usage:
const handlePublish = async () => {
  try {
    await performCreditAction('PUBLISH_BOOK');
    // Book published successfully
  } catch (error) {
    // Handle error
  }
};
```

## Components

### CreditBalance
Displays the user's current balance and transaction history.

```tsx
<CreditBalance 
  userId={userId} 
  showHistory={true} 
/>
```

### CreditActionButton
A button that handles credit actions with built-in validation and feedback.

```tsx
<CreditActionButton
  userId={userId}
  action="PUBLISH_BOOK"
  amount={-100} // Optional override
  metadata={{ bookId: '123' }}
  onSuccess={() => console.log('Book published!')}
  confirmMessage="This will cost 100 credits. Continue?"
>
  Publish Book
</CreditActionButton>
```

## Polar.sh Integration

### Webhook Endpoint: `/api/polar/webhook`

This endpoint handles Polar.sh subscription events and automatically awards credits to users when they subscribe or renew their subscription.

### Configuration
Set the following environment variables:
- `POLAR_WEBHOOK_SECRET`: Your Polar.sh webhook secret
- `POLAR_PLAN_CREDITS`: JSON mapping of plan IDs to credit amounts

## Testing

To test the credit system, you can use the following cURL commands:

```bash
# Get user's balance
curl -X GET 'http://localhost:3000/api/credits/USER_ID'

# Add credits
curl -X POST 'http://localhost:3000/api/credits/USER_ID/earn' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 100, "reason": "test_earn"}'

# Spend credits
curl -X POST 'http://localhost:3000/api/credits/USER_ID/spend' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 50, "reason": "test_spend"}'
```

## Error Handling

- **Insufficient Credits**: Returns 402 status code with details
- **Invalid Request**: Returns 400 status code with error message
- **Unauthorized**: Returns 401 status code for unauthorized access
- **Server Errors**: Returns 500 status code for unexpected errors

## Security Considerations

- All credit operations are performed within database transactions
- Credit spending is validated before deduction
- Webhook endpoints verify Polar.sh signatures
- User authentication is required for all credit operations
