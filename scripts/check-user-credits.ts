import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env' });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
});

async function checkUserCredits(userId: string) {
  try {
    console.log(`Checking credits for user ${userId}...`);
    
    // Check user_balances table
    const balance = await client`
      SELECT * FROM user_balances 
      WHERE user_id = ${userId}
    `;
    
    if (balance.length === 0) {
      console.log('No balance record found for user.');
      return;
    }
    
    console.log('User balance:', balance[0]);
    
    // Check recent transactions
    const transactions = await client`
      SELECT * FROM credit_transactions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('\nRecent transactions:');
    console.table(transactions);
    
  } catch (error) {
    console.error('Error checking user credits:', error);
  } finally {
    await client.end();
  }
}

// Get user ID from command line arguments or use a default one
const userId = process.argv[2] || 'user-id-here';
checkUserCredits(userId);
