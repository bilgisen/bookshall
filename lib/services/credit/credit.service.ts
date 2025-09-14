import { db } from '@/lib/db';
import {
  getUserBalance,
  updateUserBalance,
  createTransaction,
  getTransactionHistory as getTransactionHistoryRepo,
  getCreditSummary as getCreditSummaryRepo
} from './credit.repository';
import {
  validateAmount,
  ensureSufficientCredits,
  DEFAULT_LIMIT
} from './credit.utils';
import type {
  CreditOperationResult,
  TransactionHistoryResult,
  CreditSummary,
  BalanceWithDetails,
  TransactionMetadata
} from './credit.types';
import { InsufficientCreditsError, InvalidAmountError } from './credit.errors';

/**
 * Service for handling credit-related operations
 */
class CreditService {
  /**
   * Get user's current balance
   */
  static async getBalance(userId: string) {
    console.log(`[CreditService] Getting balance for user: ${userId}`);
    try {
      const result = await getUserBalance(db, userId);
      console.log(`[CreditService] Retrieved balance for user ${userId}:`, result);
      return result.balance;
    } catch (error) {
      console.error(`[CreditService] Error getting balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's balance with additional details
   */
  static async getBalanceWithDetails(userId: string): Promise<BalanceWithDetails> {
    console.log(`[CreditService] === Starting getBalanceWithDetails for user: ${userId} ===`);
    
    try {
      console.log(`[CreditService] Calling getUserBalance for user: ${userId}`);
      const startTime = Date.now();
      
      const result = await getUserBalance(db, userId);
      
      console.log(`[CreditService] getUserBalance completed in ${Date.now() - startTime}ms`);
      console.log(`[CreditService] Raw result from getUserBalance:`, JSON.stringify(result, null, 2));
      
      if (!result) {
        throw new Error('getUserBalance returned undefined or null');
      }
      
      // Log the raw values before creating the balanceDetails object
      console.log(`[CreditService] Raw balance value: ${result.balance}, Type: ${typeof result.balance}`);
      console.log(`[CreditService] Raw updatedAt value: ${result.updatedAt}, Type: ${typeof result.updatedAt}`);
      
      // Explicitly type the return object to match BalanceWithDetails
      const balanceDetails: BalanceWithDetails = {
        userId,
        balance: result.balance,
        lastUpdated: result.updatedAt?.toISOString() || null,
        currency: 'credits' as const
      };
      
      console.log(`[CreditService] Constructed balance details:`, JSON.stringify(balanceDetails, null, 2));
      console.log(`[CreditService] Balance details type: ${typeof balanceDetails.balance}`);
      
      return balanceDetails;
    } catch (error) {
      console.error(`[CreditService] Error getting balance with details for user ${userId}:`, error);
      throw error;
    }
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
      
      return await db.transaction(async (tx) => {
        const balance = await updateUserBalance(tx, userId, amount);
        await createTransaction(tx, {
          userId,
          amount,
          type: 'earn',
          reason,
          metadata: JSON.stringify(metadata)
        });
        return { success: true, balance };
      });
    } catch (error) {
      console.error('Error in earnCredits:', error);
      if (error instanceof InvalidAmountError) {
        return { 
          success: false, 
          error: error.message,
          code: 'INVALID_AMOUNT'
        };
      }
      return { 
        success: false, 
        error: 'Failed to earn credits',
        code: 'TRANSACTION_FAILED'
      };
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
      
      return await db.transaction(async (tx) => {
        const currentBalance = (await getUserBalance(tx, userId)).balance;
        ensureSufficientCredits(currentBalance, amount);
        
        const newBalance = await updateUserBalance(tx, userId, -amount);
        await createTransaction(tx, {
          userId,
          amount,
          type: 'spend',
          reason,
          metadata: JSON.stringify(metadata)
        });
        return { success: true, balance: newBalance };
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError || error instanceof InvalidAmountError) {
        return {
          success: false,
          error: error.message,
          code: error instanceof InsufficientCreditsError ? 'INSUFFICIENT_CREDITS' : 'INVALID_AMOUNT'
        };
      }
      console.error('Error in spendCredits:', error);
      return { 
        success: false, 
        error: 'Failed to spend credits',
        code: 'TRANSACTION_FAILED'
      };
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
    const result = await getTransactionHistoryRepo(db, userId, limit, offset, startDate, endDate);
    
    // Ensure we have a valid result with transactions and pagination
    const transactions = Array.isArray(result?.transactions) ? result.transactions : [];
    const total = typeof result?.total === 'number' ? result.total : 0;
    
    return {
      transactions,
      pagination: {
        total,
        limit: Math.max(0, limit),
        offset: Math.max(0, offset),
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Get user's credit summary (total earned and spent)
   */
  static async getCreditSummary(userId: string): Promise<CreditSummary> {
    const { earned, spent } = await getCreditSummaryRepo(db, userId);
    const { balance } = await getUserBalance(db, userId);
    
    return {
      earned,
      spent,
      available: balance,
      currency: 'credits'
    };
  }
}

export { CreditService };
