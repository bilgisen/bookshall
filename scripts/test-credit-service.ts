import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { creditTransactions } from '../db/schema';
import { testDb, setupTestDatabase, teardownTestDatabase } from '../lib/test-db';
import TestCreditService from '../lib/services/credit/test-credit-service';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function testCreditService() {
  try {
    // Initialize test database
    await setupTestDatabase();
    
    // Clean up any existing test data
    await testDb.delete(creditTransactions).where(eq(creditTransactions.userId, TEST_USER_ID));

    // Test 1: Initial balance should be 0
    console.log('1. Testing initial balance...');
    const initialBalance = await TestCreditService.getBalance(TEST_USER_ID);
    console.log(`✓ Initial balance: ${initialBalance.balance}`);
    
    // Test 2: Earn credits
    console.log('\n2. Testing earning credits...');
    const earnResult = await TestCreditService.earnCredits(TEST_USER_ID, 100, 'Test credit');
    if (!earnResult.success) {
      throw new Error(`❌ Failed to earn credits: ${earnResult.error}`);
    }
    const afterEarn = await TestCreditService.getBalance(TEST_USER_ID);
    console.log(`✓ Earned 100 credits. New balance: ${afterEarn.balance}`);
    
    // Test 3: Spend credits
    console.log('\n3. Testing spending credits...');
    const spendResult = await TestCreditService.spendCredits(TEST_USER_ID, 50, 'Test spend');
    if (!spendResult.success) {
      throw new Error(`❌ Failed to spend credits: ${spendResult.error}`);
    }
    const afterSpend = await TestCreditService.getBalance(TEST_USER_ID);
    console.log(`✓ Spent 50 credits. New balance: ${afterSpend.balance}`);
    
    // Test 4: Test insufficient credits
    console.log('\n4. Testing insufficient credits...');
    const overspendResult = await TestCreditService.spendCredits(TEST_USER_ID, 1000, 'Overspend test');
    if (overspendResult.success) {
      console.error('❌ Should not be able to overspend');
      process.exit(1);
    } else {
      console.log('✓ Correctly prevented overspending');
    }
    
    // Test 5: Transaction history
    console.log('\n5. Testing transaction history...');
    const history = await TestCreditService.getTransactionHistory(TEST_USER_ID);
    console.log(`✓ Found ${history.transactions.length} transactions`);
    
    // Test 6: Credit summary
    console.log('\n6. Testing credit summary...');
    const summary = await TestCreditService.getCreditSummary(TEST_USER_ID);
    console.log(`✓ Summary - Earned: ${summary.earned}, Spent: ${summary.spent}`);
    
    // Additional validation
    if (summary.earned !== 100 || summary.spent !== 50) {
      throw new Error(`❌ Invalid summary: expected earned=100, spent=50, got earned=${summary.earned}, spent=${summary.spent}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during tests:', error);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await testDb.delete(creditTransactions).where(eq(creditTransactions.userId, TEST_USER_ID));
      await teardownTestDatabase();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
  }
}

// Run the tests
testCreditService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
