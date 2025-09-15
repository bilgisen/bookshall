// lib/services/credit/credit.service.ts
import { db } from '@/db/drizzle';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { 
  getUserBalance, 
  updateUserBalance, 
  createTransaction, 
  getTransactionHistory as getTransactionHistoryRepo,
  getCreditSummary as getCreditSummaryRepo
} from './credit.repository';
import type { 
  CreditOperationResult, 
  TransactionHistoryResult, 
  CreditSummary, 
  BalanceWithDetails,
  TransactionMetadata
} from './credit.types';
import { 
  validateAmount, 
  ensureSufficientCredits, 
  handleServiceError
} from './credit.utils';
import { QueryClient } from '@tanstack/react-query';

// Query keys for TanStack Query
export const creditQueryKeys = {
  all: ['credits'],
  balance: () => [...creditQueryKeys.all, 'balance'],
  transactions: (filters?: { limit?: number; offset?: number }) => 
    [...creditQueryKeys.all, 'transactions', ...(filters ? [filters] : [])],
  summary: () => [...creditQueryKeys.all, 'summary']
};

/**
 * Service for handling credit-related operations
 */
class CreditService {
  private static queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });

  /**
   * Get the authenticated user ID
   * @throws {Error} If user is not authenticated
   */
  private static async getAuthenticatedUserId(): Promise<string> {
    // Get request headers from Next.js and ask better-auth for the session
    const requestHeaders = await headers();
    type SessionRes = { session?: { userId?: string } ; user?: { id?: string } };
    const result = (await auth.api.getSession({ headers: requestHeaders })) as unknown as SessionRes;
    const userId = result?.session?.userId ?? result?.user?.id; // support either shape
    if (!userId) throw new Error('User not authenticated');
    return String(userId);
  }

  /**
   * Invalidate credit-related queries
   */
  static invalidateQueries() {
    return this.queryClient.invalidateQueries({ queryKey: creditQueryKeys.all });
  }

  /**
   * Get user's current balance
   * @param userId Optional user ID (defaults to authenticated user)
   */
  static async getBalance(userId?: string): Promise<number> {
    try {
      const uid = userId || await this.getAuthenticatedUserId();
      const balance = await getUserBalance(db, uid);
      return balance.balance;
    } catch (error) {
      throw handleServiceError(error, 'Failed to get balance');
    }
  }

  /**
   * Get user's credit summary
   * @param userId Optional user ID (defaults to authenticated user)
   */
  static async getCreditSummary(userId?: string): Promise<CreditSummary> {
    try {
      const uid = userId || await this.getAuthenticatedUserId();
      const { earned, spent } = await getCreditSummaryRepo(db, uid);
      const balance = await this.getBalance(uid);
      
      return {
        earned,
        spent,
        available: balance,
        currency: 'credits' as const
      };
    } catch (error) {
      throw handleServiceError(error, 'Failed to get credit summary');
    }
  }

  /**
   * Get user's balance with additional details
   * @param userId Optional user ID (defaults to authenticated user)
   */
  static async getBalanceWithDetails(userId?: string): Promise<BalanceWithDetails> {
    try {
      const uid = userId || await this.getAuthenticatedUserId();
      const [balance, summary] = await Promise.all([
        this.getBalance(uid),
        this.getCreditSummary(uid)
      ]);
      
      return {
        userId: uid,
        balance,
        updatedAt: new Date(),
        currency: 'credits' as const,
        summary
      };
    } catch (error) {
      throw handleServiceError(error, 'Failed to get balance details');
    }
  }

  /**
   * Get transaction history
   * @param options Query options
   */
  static async getTransactionHistory(
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
    } = {}
  ): Promise<TransactionHistoryResult> {
    try {
      const uid = options.userId || await this.getAuthenticatedUserId();
      const { limit = 10, offset = 0, startDate, endDate } = options;
      
      const { transactions, total } = await getTransactionHistoryRepo(
        db,
        uid,
        limit,
        offset,
        startDate,
        endDate
      );
      
      return {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total
        }
      };
    } catch (error) {
      throw handleServiceError(error, 'Failed to get transaction history');
    }
  }

  /**
   * Earn credits for a user
   * @param amount Amount of credits to earn
   * @param reason Reason for earning credits
   * @param metadata Additional metadata
   * @param userId Optional user ID (defaults to authenticated user)
   */
  static async earnCredits(
    a: string | number,
    b: number | string,
    c: string | TransactionMetadata = '',
    d: TransactionMetadata = {}
  ): Promise<CreditOperationResult> {
    try {
      // Support both signatures:
      // 1) earnCredits(userId, amount, reason, metadata)
      // 2) earnCredits(amount, reason, metadata, userId?) [legacy]
      let userId: string | undefined;
      let amount: number;
      let reason: string;
      let metadata: TransactionMetadata;

      if (typeof a === 'string' && typeof b === 'number') {
        userId = a;
        amount = b;
        reason = typeof c === 'string' ? c : '';
        metadata = (typeof c === 'object' ? c : d) || {};
      } else {
        // Legacy order: (amount, reason, metadata, userId?)
        amount = Number(a);
        reason = (typeof b === 'string' ? b : '') as string;
        metadata = (typeof c === 'object' ? (c as TransactionMetadata) : {}) || {};
        userId = typeof d === 'string' ? d : undefined;
      }

      const uid = userId || await this.getAuthenticatedUserId();
      validateAmount(amount);

      const result = await db.transaction(async (tx) => {
        // Update balance
        const newBalance = await updateUserBalance(tx, uid, amount);
        
        // Create transaction record with all required fields
        const transaction = await createTransaction(tx, {
          userId: uid,
          amount,
          type: 'earn',
          reason: reason || 'Credit earned',
          metadata: {
            ...metadata,
            balanceAfter: newBalance.balance
          }
        });

        return {
          transaction,
          balance: newBalance.balance
        };
      });

      // Invalidate relevant queries
      await this.invalidateQueries();

      return {
        success: true,
        transaction: result.transaction,
        balance: result.balance,
        oldBalance: result.balance - amount,
        newBalance: result.balance
      };
    } catch (error) {
      throw handleServiceError(error, 'Failed to earn credits');
    }
  }

  /**
   * Spend credits from a user's account
   * @param amount Amount of credits to spend
   * @param reason Reason for spending credits
   * @param metadata Additional metadata
   * @param userId Optional user ID (defaults to authenticated user)
   */
  static async spendCredits(
    a: string | number,
    b: number | string,
    c: string | TransactionMetadata = '',
    d: TransactionMetadata = {}
  ): Promise<CreditOperationResult> {
    try {
      // Support both signatures:
      // 1) spendCredits(userId, amount, reason, metadata)
      // 2) spendCredits(amount, reason, metadata, userId?) [legacy]
      let userId: string | undefined;
      let amount: number;
      let reason: string;
      let metadata: TransactionMetadata;

      if (typeof a === 'string' && typeof b === 'number') {
        userId = a;
        amount = b;
        reason = typeof c === 'string' ? c : '';
        metadata = (typeof c === 'object' ? c : d) || {};
      } else {
        // Legacy order: (amount, reason, metadata, userId?)
        amount = Number(a);
        reason = (typeof b === 'string' ? b : '') as string;
        metadata = (typeof c === 'object' ? (c as TransactionMetadata) : {}) || {};
        userId = typeof d === 'string' ? d : undefined;
      }

      const uid = userId || await this.getAuthenticatedUserId();
      validateAmount(amount);

      // Check current balance first
      const currentBalance = await this.getBalance(uid);
      ensureSufficientCredits(currentBalance, amount);

      const result = await db.transaction(async (tx) => {
        // Update balance (negative amount for spending)
        const newBalance = await updateUserBalance(tx, uid, -amount);
        
        // Create transaction record with all required fields
        const transaction = await createTransaction(tx, {
          userId: uid,
          amount: -amount, // store negative in the transaction for consistency
          type: 'spend',
          reason: reason || 'Credit spent',
          metadata: {
            ...metadata,
            balanceAfter: newBalance.balance
          }
        });

        return {
          transaction,
          balance: newBalance.balance
        };
      });

      // Invalidate relevant queries
      await this.invalidateQueries();

      return {
        success: true,
        transaction: result.transaction,
        balance: result.balance,
        oldBalance: result.balance + amount,
        newBalance: result.balance
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'InsufficientCreditsError') {
          return {
            success: false,
            error: 'Insufficient credits',
            code: 'INSUFFICIENT_CREDITS',
            details: error.message
          };
        }
      }
      throw handleServiceError(error, 'Failed to spend credits');
    }
  }

  /**
   * Refund a transaction
   * @param transactionId ID of the transaction to refund
   * @param reason Reason for the refund
   * @param metadata Additional metadata
   */
  static async refundTransaction(
    transactionId: string,
    reason = 'Refund'
  ): Promise<CreditOperationResult> {
    try {
      // Find original transaction
      const { getTransactionById } = await import('./credit.repository');
      const original = await getTransactionById(db, transactionId);
      if (!original) {
        return {
          success: false,
          error: 'Original transaction not found',
          code: 'TRANSACTION_FAILED',
          details: `Transaction ${transactionId} not found`,
        };
      }

      const uid = original.userId;
      const amountAbs = Math.abs(original.amount);
      const metaBase = {
        originalTransactionId: original.id,
        originalType: original.type,
        originalAmount: original.amount,
      } as TransactionMetadata;

      // If original was a spend (negative amount), we need to credit back (earn)
      if (original.amount < 0 || original.type === 'spend') {
        return this.earnCredits(
          uid,
          amountAbs,
          reason || `Refund for ${original.reason || original.id}`,
          { ...metaBase, refund: true }
        );
      }

      // If original was an earn (positive), we need to deduct (spend)
      return this.spendCredits(
        uid,
        amountAbs,
        reason || `Reversal for ${original.reason || original.id}`,
        { ...metaBase, reversal: true }
      );
    } catch (error) {
      throw handleServiceError(error, 'Failed to process refund');
    }
  }
}

export { CreditService };
