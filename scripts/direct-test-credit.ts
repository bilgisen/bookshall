import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

// Load environment variables from the project root
config({ path: path.resolve(process.cwd(), '.env') });

async function testCreditSystem() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
  }

  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
  });

  try {
    console.log('Testing credit system...');
    
    // Get a test user
    const [user] = await client`SELECT id FROM "user" LIMIT 1`;
    if (!user) {
      throw new Error('No users found in the database');
    }
    
    const userId = user.id;
    console.log(`Testing with user ID: ${userId}`);
    
    // Check current balance
    const [balance] = await client`
      SELECT balance FROM user_balances WHERE user_id = ${userId}
    `;
    
    console.log('Current balance:', balance?.balance || 0);
    
    // Add a test transaction
    console.log('Adding test transaction...');
    const transactionId = crypto.randomUUID();
    await client`
      INSERT INTO credit_transactions (id, user_id, type, amount, reason, metadata, created_at, updated_at)
      VALUES (
        ${transactionId},
        ${userId},
        'earn',
        100,
        'test-transaction',
        '{}',
        NOW(),
        NOW()
      )
    `;
    
    console.log('Test transaction added');
    
    // Update balance
    await client`
      INSERT INTO user_balances (user_id, balance, updated_at)
      VALUES (${userId}, 100, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance + 100,
        updated_at = NOW()
      RETURNING *
    `;
    
    console.log('Balance updated');
    
    // Verify balance
    const [updatedBalance] = await client`
      SELECT balance FROM user_balances WHERE user_id = ${userId}
    `;
    
    console.log('Updated balance:', updatedBalance?.balance);
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await client.end();
  }
}

testCreditSystem();
