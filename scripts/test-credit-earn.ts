import { config } from 'dotenv';
import { CreditService } from '../lib/services/credit';
import postgres from 'postgres';
import path from 'path';

// Load environment variables from the project root
config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

console.log('Connecting to database...');
const client = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
});

async function testCreditEarn() {
  try {
    // Get a test user ID (you may need to replace this with an actual user ID)
    const [testUser] = await client`SELECT id FROM "user" LIMIT 1`;
    
    if (!testUser) {
      console.error('No users found in the database');
      return;
    }
    
    const userId = testUser.id;
    console.log(`Testing credit earn for user ${userId}`);
    
    // Get initial balance
    const initialBalance = await CreditService.getBalance(userId);
    console.log(`Initial balance: ${initialBalance}`);
    
    // Earn credits
    const amount = 100;
    console.log(`Earning ${amount} credits...`);
    const result = await CreditService.earnCredits(userId, amount, 'test-earn');
    
    if (!result.success) {
      console.error('Failed to earn credits:', result.error);
      return;
    }
    
    console.log('Successfully earned credits:', result.transaction);
    
    // Get updated balance
    const updatedBalance = await CreditService.getBalance(userId);
    console.log(`Updated balance: ${updatedBalance}`);
    
    // Check database directly
    const [balanceRecord] = await client`
      SELECT * FROM user_balances WHERE user_id = ${userId}
    `;
    
    console.log('Database balance record:', balanceRecord);
    
  } catch (error) {
    console.error('Error in testCreditEarn:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

testCreditEarn();
