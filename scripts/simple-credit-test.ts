import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  console.error('❌ Error: POSTGRES_URL_NON_POOLING is not set in environment variables');
  process.exit(1);
}

// Create a test database connection
const db = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
});

// Use a valid test user ID (from the find-test-user.ts script)
const TEST_USER_ID = 'V19yWk6GO6O2NO0RysPrUe1yCY4fN7iX'; // hbkarabey@gmail.com

async function runTest() {
  try {
    console.log('🚀 Starting simple credit system test...');
    console.log(`🧪 Using test user ID: ${TEST_USER_ID}\n`);

    // 1. Clean up any existing test data
    console.log('🧹 Cleaning up test data...');
    await db`DELETE FROM user_balances WHERE user_id = ${TEST_USER_ID}`.catch(() => {});
    await db`DELETE FROM credit_transactions WHERE user_id = ${TEST_USER_ID}`.catch(() => {});
    console.log('✅ Cleanup complete\n');

    // 2. Test initial balance
    console.log('💰 Checking initial balance...');
    const [initialBalance] = await db`
      SELECT balance FROM user_balances WHERE user_id = ${TEST_USER_ID}
    `;
    
    const currentBalance = initialBalance?.balance || 0;
    console.log(`- Current balance: ${currentBalance} credits`);
    console.log('✅ Expected: 0 credits\n');

    // 3. Test earning credits
    console.log('🔄 Testing credit earning...');
    const creditAmount = 100;
    const transactionId = uuidv4();
    
    // Insert transaction
    await db`
      INSERT INTO credit_transactions (
        id, user_id, type, amount, reason, metadata, created_at, updated_at
      ) VALUES (
        ${transactionId},
        ${TEST_USER_ID},
        'earn',
        ${creditAmount},
        'test-earn',
        '{}',
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    
    // Update balance
    await db`
      INSERT INTO user_balances (user_id, balance, updated_at)
      VALUES (${TEST_USER_ID}, ${creditAmount}, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = user_balances.balance + ${creditAmount},
        updated_at = NOW()
      RETURNING *
    `;
    
    console.log(`✅ Added ${creditAmount} credits`);
    
    // 4. Verify new balance
    const [updatedBalance] = await db`
      SELECT balance FROM user_balances WHERE user_id = ${TEST_USER_ID}
    `;
    
    console.log(`📊 New balance: ${updatedBalance?.balance || 0} credits`);
    console.log('✅ Expected: 100 credits\n');
    
    // 5. Test transaction history
    console.log('📜 Checking transaction history...');
    const transactions = await db`
      SELECT * FROM credit_transactions 
      WHERE user_id = ${TEST_USER_ID}
      ORDER BY created_at DESC
    `;
    
    console.log(`📊 Found ${transactions.length} transactions:`);
    transactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. ${tx.type.toUpperCase()} ${tx.amount} credits - ${tx.reason}`);
    });
    
    console.log('\n🎉 Simple credit system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

runTest();
