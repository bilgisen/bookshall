import { testDb } from '@/lib/test-db';
import { getUserBalance, updateUserBalance, createTransaction, getTransactionHistory as getTransactionHistoryRepo, getCreditSummary as getCreditSummaryRepo } from './credit.repository';
import { validateAmount, ensureSufficientCredits, DEFAULT_LIMIT } from './credit.utils';
import type { CreditOperationResult, TransactionHistoryResult, CreditSummary, BalanceWithDetails, TransactionMetadata } from './credit.types';
import { InsufficientCreditsError, InvalidAmountError } from './credit.errors';

/**
 * Test wrapper for CreditService that uses the test database
 */
class TestCreditService {
  /**
   * Get user's current balance
   */
  static async getBalance(userId: string) {
    return getUserBalance(testDb, userId);
  }

  /**
   * Add credits to a user's account
   */
  static async earnCredits(
    userId: string,
    amount: number,
    reason = 'system-credit',
    metadata: TransactionMetadata = {}
  ): Promise<CreditOperationResult> {
    try {
      validateAmount(amount);
      
      const result = await testDb.transaction(async (tx) => {
        const balance = await updateUserBalance(tx, userId, amount);
        await createTransaction(tx, {
          userId,
          amount,
          type: 'credit',
          reason,
          metadata: JSON.stringify(metadata),
          balanceAfter: balance
        });
        
        return { success: true, balance };
      });
      
      return result;
    } catch (error) {
      if (error instanceof InvalidAmountError) {
        return { success: false, error: error.message, code: 'INVALID_AMOUNT' };
      }
      console.error('Error in earnCredits:', error);
      return { success: false, error: 'Failed to earn credits' };
    }
  }

  /**
   * Spend credits from a user's account
   */
  static async spendCredits(
    userId: string,
    amount: number,
    reason = 'system-spend',
    metadata: TransactionMetadata = {}
  ): Promise<CreditOperationResult> {
    try {
      validateAmount(amount);
      
      const result = await testDb.transaction(async (tx) => {
        // Check balance first
        const balance = await getUserBalance(tx, userId);
        ensureSufficientCredits(balance, amount);
        
        // Update balance and create transaction
        const newBalance = await updateUserBalance(tx, userId, -amount);
        await createTransaction(tx, {
          userId,
          amount: -amount,
          type: 'debit',
          reason,
          metadata: JSON.stringify(metadata),
          balanceAfter: newBalance
        });
        
        return { success: true, balance: newBalance };
      });
      
      return result;
    } catch (error) {
      if (error instanceof InvalidAmountError) {
        return { success: false, error: error.message, code: 'INVALID_AMOUNT' };
      }
      if (error instanceof InsufficientCreditsError) {
        return { success: false, error: error.message, code: 'INSUFFICIENT_CREDITS' };
      }
      console.error('Error in spendCredits:', error);
      return { success: false, error: 'Failed to spend credits' };
    }
  }

  /**
   * Get a user's transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = DEFAULT_LIMIT,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionHistoryResult> {
    return getTransactionHistoryRepo(testDb, userId, limit, offset, startDate, endDate);
  }

  /**
   * Get user's credit summary (total earned and spent)
   */
  static async getCreditSummary(userId: string): Promise<CreditSummary> {
    return getCreditSummaryRepo(testDb, userId);
  }
}

export default TestCreditService;
