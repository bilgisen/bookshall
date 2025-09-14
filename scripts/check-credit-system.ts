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

async function checkCreditSystem() {
  try {
    console.log('Checking credit system tables...');
    
    // Check if credit tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('credit_transactions', 'user_balances')
    `;
    
    console.log('Credit system tables:', tables);
    
    if (tables.length === 0) {
      console.log('No credit system tables found.');
      return;
    }
    
    // Get a user with a balance
    const userWithBalance = await client`
      SELECT user_id, balance 
      FROM user_balances 
      WHERE balance > 0 
      LIMIT 1
    `;
    
    if (userWithBalance.length > 0) {
      const userId = userWithBalance[0].user_id;
      console.log(`\nFound user with balance:`, userWithBalance[0]);
      
      // Get recent transactions for this user
      const transactions = await client`
        SELECT * FROM credit_transactions 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      console.log('\nRecent transactions for user:', transactions);
    } else {
      console.log('\nNo users with balance found.');
      
      // Check if there are any transactions at all
      const anyTransactions = await client`
        SELECT * FROM credit_transactions 
        LIMIT 1
      `;
      
      if (anyTransactions.length > 0) {
        console.log('\nFound transactions in the system:', anyTransactions.length);
      } else {
        console.log('\nNo transactions found in the system.');
      }
    }
    
  } catch (error) {
    console.error('Error checking credit system:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

checkCreditSystem();
