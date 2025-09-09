import { db } from '../lib/db';
import { CreditService } from '../lib/services/credit.service';
import { sql } from 'drizzle-orm';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function testCreditService() {
  try {
    // Clean up any existing test data
    await db.execute(sql`DELETE FROM credit_transactions WHERE user_id = ${TEST_USER_ID}`);

    console.log('1. Testing initial balance...');
    let balance = await CreditService.getBalance(TEST_USER_ID);
    console.log(`Initial balance: ${balance}`);
    
    console.log('\n2. Testing earning credits...');
    await CreditService.earnCredits(TEST_USER_ID, 100, 'Test credit');
    balance = await CreditService.getBalance(TEST_USER_ID);
    console.log(`Balance after earning: ${balance}`);
    
    console.log('\n3. Testing spending credits...');
    const success = await CreditService.spendCredits(TEST_USER_ID, 50, 'Test spend');
    balance = await CreditService.getBalance(TEST_USER_ID);
    console.log(`Spend successful: ${success}, New balance: ${balance}`);
    
    console.log('\n4. Testing overspending...');
    const overspend = await CreditService.spendCredits(TEST_USER_ID, 100, 'Overspend test');
    balance = await CreditService.getBalance(TEST_USER_ID);
    console.log(`Overspend successful: ${overspend}, Balance should be unchanged: ${balance}`);
    
    console.log('\n5. Testing transaction history...');
    const history = await CreditService.getTransactionHistory(TEST_USER_ID);
    console.log(`Total transactions: ${history.pagination.total}`);
    
    console.log('\n6. Testing credit summary...');
    const summary = await CreditService.getCreditSummary(TEST_USER_ID);
    console.log(`Total earned: ${summary.earned}, Total spent: ${summary.spent}`);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  } finally {
    // Clean up
    await client.execute('DELETE FROM credit_transactions WHERE user_id = ?', [TEST_USER_ID]);
    process.exit(0);
  }
}

testCreditService();
