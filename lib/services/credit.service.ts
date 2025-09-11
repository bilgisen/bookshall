import { db } from '@/lib/db';
import { creditTransactions, type CreditTransaction } from '@/db/schema/credit';
import { and, eq, sql, gte, lte, desc, count, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper function to handle database errors
function handleDbError(error: unknown, defaultMessage: string): never {
  console.error('Database error:', error);
  throw new Error(defaultMessage);
}

export interface TransactionHistoryResult {
  transactions: CreditTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CreditSummary {
  earned: number;
  spent: number;
}

export class CreditService {
  /**
   * Get user's current credit balance
   */
  static async getBalance(userId: string): Promise<number> {
    try {
      const result = await db
        .select({
          amount: sql<number>`COALESCE(SUM(
            CASE 
              WHEN ${creditTransactions.type} = 'earn' THEN ${creditTransactions.amount}
              WHEN ${creditTransactions.type} = 'spend' THEN -${creditTransactions.amount}
              ELSE 0 
            END
          ), 0)`
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId));
      
      return result[0]?.amount || 0;
    } catch (error) {
      return handleDbError(error, 'Failed to get balance');
    }
  }

  /**
   * Get user's transaction history with pagination
   */
  static async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionHistoryResult> {
    try {
      // Base condition
      const conditions = [eq(creditTransactions.userId, userId)];
      
      // Add date filters if provided
      if (startDate) {
        conditions.push(gte(creditTransactions.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(creditTransactions.createdAt, endDate));
      }
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(creditTransactions)
        .where(and(...conditions));
      
      const total = totalResult[0]?.count || 0;
      
      // Get paginated transactions
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(and(...conditions))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)
        .offset(offset);
      
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
      return handleDbError(error, 'Failed to get transaction history');
    }
  }

  /**
   * Get user's credit summary (total earned and spent)
   */
  static async getCreditSummary(userId: string): Promise<CreditSummary> {
    try {
      const result = await db
        .select({
          type: creditTransactions.type,
          total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            inArray(creditTransactions.type, ['earn', 'spend'])
          )
        )
        .groupBy(creditTransactions.type);
      
      const summary: CreditSummary = { earned: 0, spent: 0 };
      
      result.forEach(row => {
        if (row.type === 'earn') {
          summary.earned = row.total;
        } else if (row.type === 'spend') {
          summary.spent = row.total;
        }
      });
      
      return summary;
    } catch (error) {
      return handleDbError(error, 'Failed to get credit summary');
    }
  }

  /**
   * Add a credit transaction
   */
  private static async addTransaction(
    userId: string,
    type: 'earn' | 'spend',
    amount: number,
    reason?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<CreditTransaction> {
    try {
      const [transaction] = await db
        .insert(creditTransactions)
        .values({
          id: uuidv4(),
          userId,
          type,
          amount,
          reason,
          metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      if (!transaction) {
        throw new Error('Failed to create credit transaction');
      }
      
      return transaction;
    } catch (error) {
      return handleDbError(error, 'Failed to add transaction');
    }
  }

  /**
   * Add credits to user's account
   */
  static async earnCredits(
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      return await this.addTransaction(userId, 'earn', amount, reason, metadata);
    } catch (error) {
      return handleDbError(error, 'Failed to earn credits');
    }
  }

  /**
   * Deduct credits from user's account
   */
  static async spendCredits(
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      const currentBalance = await this.getBalance(userId);
      
      if (currentBalance < amount) {
        return false; // Insufficient credits
      }
      
      await this.addTransaction(userId, 'spend', amount, reason, metadata);
      return true;
    } catch (error) {
      return handleDbError(error, 'Failed to spend credits');
    }
  }
}