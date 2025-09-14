import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// Create a test database connection
export const testDb = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
});

// Test user ID
export const TEST_USER_ID = 'test-user-123';

// Clean up test data
export async function cleanupTestData() {
  try {
    await testDb`DELETE FROM user_balances WHERE user_id = ${TEST_USER_ID}`.catch(() => {});
    await testDb`DELETE FROM credit_transactions WHERE user_id = ${TEST_USER_ID}`.catch(() => {});
    console.log('✅ Cleaned up test data');
  } catch (error) {
    console.error('❌ Failed to clean up test data:', error);
    throw error;
  }
}

// Verify test data was cleaned up
export async function verifyCleanup() {
  try {
    const [balance] = await testDb`SELECT * FROM user_balances WHERE user_id = ${TEST_USER_ID}`;
    const [transactions] = await testDb`SELECT COUNT(*) as count FROM credit_transactions WHERE user_id = ${TEST_USER_ID}`;
    
    console.log('🔍 Cleanup verification:');
    console.log(`- User balance exists: ${!!balance}`);
    console.log(`- Transaction count: ${transactions?.count || 0}`);
    
    if (balance || (transactions?.count || 0) > 0) {
      throw new Error('Cleanup verification failed');
    }
    
    console.log('✅ Cleanup verified');
  } catch (error) {
    console.error('❌ Cleanup verification failed:', error);
    throw error;
  }
}
