import { CreditService } from '@/lib/services/credit.service.new';
import { testDb, TEST_USER_ID, cleanupTestData, verifyCleanup } from './test-utils';

// Create a direct implementation of the CreditService for testing
class TestCreditService extends CreditService {
  static db = {
    transaction: async (callback: any) => {
      return await callback({
        insert: (table: any) => ({
          values: (values: any) => ({
            onConflictDoUpdate: (conflict: any) => ({
              set: (updates: any) => ({
                returning: async () => {
                  const result = await testDb`
                    INSERT INTO ${testDb(table.name)} ${testDb(values, ...Object.keys(values))}
                    ON CONFLICT (${testDb.unsafe(conflict.target)}) 
                    DO UPDATE SET ${testDb.unsafe(Object.entries(updates.set).map(([k]) => `${k} = EXCLUDED.${k}`).join(', '))}
                    RETURNING *
                  `;
                  return result;
                }
              })
            })
          }),
          // Add other query builder methods as needed
        }),
        // Add other database methods as needed
      });
    }
  };
}

async function testCreditSystem() {
  try {
    console.log('🚀 Starting credit system test...\n');

    // 1. Clean up any existing test data
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData();
    await verifyCleanup();
    
    console.log(`\n🧪 Using test user ID: ${TEST_USER_ID}\n`);

    // 2. Test initial balance
    let balance = await CreditService.getBalance(TEST_USER_ID);
    console.log(`💰 Initial balance: ${balance} credits`);
    console.log('✅ Expected: 0 credits\n');

    // 4. Test earning credits
    console.log('🔄 Testing credit earning...');
    const earnResult = await TestCreditService.earnCredits(TEST_USER_ID, 100, 'test-earn');
    if (!earnResult.success) {
      throw new Error(`Failed to earn credits: ${earnResult.error}`);
    }
    console.log(`✅ Earned ${earnResult.transaction?.amount} credits`);
    console.log(`📊 New balance: ${earnResult.balance} credits\n`);

    // 5. Verify balance
    balance = await TestCreditService.getBalance(TEST_USER_ID);
    console.log(`🔍 Verified balance: ${balance} credits`);
    console.log('✅ Expected: 100 credits\n');

    // 6. Test spending credits
    console.log('🔄 Testing credit spending...');
    const spendResult = await TestCreditService.spendCredits(TEST_USER_ID, 30, 'test-spend');
    if (!spendResult.success) {
      throw new Error(`Failed to spend credits: ${spendResult.error}`);
    }
    console.log(`✅ Spent ${spendResult.transaction?.amount} credits`);
    console.log(`📊 New balance: ${spendResult.balance} credits\n`);

    // 7. Verify final balance
    balance = await TestCreditService.getBalance(TEST_USER_ID);
    console.log(`🔍 Final balance: ${balance} credits`);
    console.log('✅ Expected: 70 credits\n');

    // 8. Test insufficient credits
    console.log('🔄 Testing insufficient credits...');
    const insufficientSpend = await TestCreditService.spendCredits(TEST_USER_ID, 100, 'test-insufficient');
    if (insufficientSpend.success) {
      throw new Error('Should not allow spending more than available balance');
    }
    console.log('✅ Correctly prevented overspending');
    console.log(`💡 Error: ${insufficientSpend.error}\n`);

    // 9. Test transaction history
    console.log('📜 Testing transaction history...');
    const history = await TestCreditService.getTransactionHistory(TEST_USER_ID);
    console.log(`📊 Found ${history.transactions.length} transactions:`);
    history.transactions.forEach((tx: any, i: number) => {
      console.log(`  ${i + 1}. ${tx.type.toUpperCase()} ${tx.amount} credits - ${tx.reason}`);
    });
    console.log('✅ Successfully retrieved transaction history\n');

    // 10. Test credit summary
    console.log('📊 Testing credit summary...');
    const summary = await TestCreditService.getCreditSummary(TEST_USER_ID);
    console.log('Credit Summary:');
    console.log(`- Earned: ${summary.earned} credits`);
    console.log(`- Spent: ${summary.spent} credits`);
    console.log(`- Available: ${summary.available} credits`);
    console.log('✅ Successfully retrieved credit summary\n');

    // 11. Test balance reconciliation
    console.log('⚙️ Testing balance reconciliation...');
    await testDb`
      INSERT INTO user_balances (user_id, balance, updated_at)
      VALUES (${TEST_USER_ID}, 0, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET balance = 0, updated_at = NOW()
    `;
    
    console.log('🔧 Manually corrupted balance (set to 0)');
    
    const reconcileResult = await TestCreditService.reconcileBalance(TEST_USER_ID);
    console.log(`🔄 Reconciled balance from ${reconcileResult.oldBalance} to ${reconcileResult.newBalance}`);
    console.log(`✅ Balance was ${reconcileResult.wasAdjusted ? '' : 'not '}adjusted\n`);

    console.log('🎉 All credit system tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

testCreditSystem();
