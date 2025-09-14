import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

const TEST_USER_ID = 'test-user-123';

async function setupTestUser() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING;
  
  if (!connectionString) {
    console.error('❌ Error: POSTGRES_URL_NON_POOLING is not set in environment variables');
    process.exit(1);
  }

  console.log('🔧 Setting up test user...');
  
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
  });

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await client`DELETE FROM credit_transactions WHERE user_id = ${TEST_USER_ID}`;
    await client`DELETE FROM user_balances WHERE user_id = ${TEST_USER_ID}`;
    
    // Verify cleanup
    const [balance] = await client`
      SELECT balance FROM user_balances WHERE user_id = ${TEST_USER_ID}
    `;
    
    const [transactions] = await client`
      SELECT COUNT(*) as count FROM credit_transactions WHERE user_id = ${TEST_USER_ID}
    `;
    
    console.log('✅ Cleanup complete');
    console.log(`- User balance: ${balance ? 'exists' : 'does not exist'}`);
    console.log(`- Transaction count: ${transactions?.count || 0}`);
    
    console.log('\nTest user setup complete!');
    console.log(`Test User ID: ${TEST_USER_ID}`);
    
  } catch (error) {
    console.error('❌ Error setting up test user:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestUser();
