// Using Node's built-in test runner instead of vitest
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { client } from '../../lib/db';
import { CreditService } from '../credit.service';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreditService', () => {
  before(async () => {
    // Clean up any existing test data
    await client.unsafe('DELETE FROM credit_transactions WHERE user_id = $1', [TEST_USER_ID]);
  });

  after(async () => {
    // Clean up after tests
    await client.unsafe('DELETE FROM credit_transactions WHERE user_id = $1', [TEST_USER_ID]);
  });

  it('should have zero balance initially', async () => {
    const balance = await CreditService.getBalance(TEST_USER_ID);
    assert.strictEqual(balance, 0);
  });

  it('should earn credits', async () => {
    await CreditService.earnCredits(TEST_USER_ID, 100, 'Test credit');
    const balance = await CreditService.getBalance(TEST_USER_ID);
    assert.strictEqual(balance, 100);
  });

  it('should spend credits', async () => {
    const success = await CreditService.spendCredits(TEST_USER_ID, 50, 'Test spend');
    assert.strictEqual(success, true);
    
    const balance = await CreditService.getBalance(TEST_USER_ID);
    assert.strictEqual(balance, 50);
  });

  it('should not allow spending more than available', async () => {
    const success = await CreditService.spendCredits(TEST_USER_ID, 100, 'Overspend test');
    assert.strictEqual(success, false);
    
    const balance = await CreditService.getBalance(TEST_USER_ID);
    assert.strictEqual(balance, 50); // Balance should remain unchanged
  });

  it('should get transaction history', async () => {
    const history = await CreditService.getTransactionHistory(TEST_USER_ID);
    assert.ok(history.transactions.length > 0);
    assert.ok(history.pagination.total > 0);
    assert.strictEqual(history.transactions[0].userId, TEST_USER_ID);
  });

  it('should get credit summary', async () => {
    const summary = await CreditService.getCreditSummary(TEST_USER_ID);
    assert.strictEqual(summary.earned, 100);
    assert.strictEqual(summary.spent, 50);
  });
});
