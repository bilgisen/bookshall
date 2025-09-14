import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
import { userBalances, creditTransactions } from '@/db/schema';
import { db } from '@/lib/db';
import type { CreditTransaction } from '@/db/schema';
import type { UserBalance } from './credit.types';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { TablesRelationalConfig } from 'drizzle-orm/relations';

// Export types for use in other files
export type DbType = PostgresJsDatabase<typeof import('@/db/schema')>;
export type TxType = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof import('@/db/schema'),
  TablesRelationalConfig
>;
import { 
  handleDbError, 
  DEFAULT_BALANCE,
  DEFAULT_LIMIT,
  MAX_LIMIT
} from './credit.utils';

// User Balance Operations
export async function getUserBalance(
  dbOrTx: DbType | TxType,
  userId: string
): Promise<UserBalance> {
  console.log(`[getUserBalance] Getting balance for user: ${userId}`);
  try {
    // Log the database connection details for debugging
    console.log(`[getUserBalance] Database connection type: ${dbOrTx === db ? 'Direct DB' : 'Transaction'}`);
    
    // First try to get existing balance
    console.log(`[getUserBalance] Executing query: SELECT balance, updated_at FROM user_balances WHERE user_id = '${userId}'`);
    
    const result = await dbOrTx
      .select({
        balance: userBalances.balance,
        updatedAt: userBalances.updatedAt
      })
      .from(userBalances)
      .where(eq(userBalances.userId, userId));
    
    console.log(`[getUserBalance] Raw query result:`, JSON.stringify(result, null, 2));
    
    // If balance exists, return it
    if (result.length > 0) {
      const balanceRecord = result[0];
      console.log(`[getUserBalance] Found existing balance for user ${userId}:`, balanceRecord);
      
      // Log additional debug info
      console.log(`[getUserBalance] Balance value: ${balanceRecord.balance}, Type: ${typeof balanceRecord.balance}`);
      console.log(`[getUserBalance] Last updated: ${balanceRecord.updatedAt}`);
      
      return balanceRecord;
    }
    
    // If no balance exists, create a new one with default balance
    console.log(`[getUserBalance] No balance record found for user ${userId}, creating new one with default balance: ${DEFAULT_BALANCE}`);
    try {
      const [newBalance] = await dbOrTx
        .insert(userBalances)
        .values({
          userId,
          balance: DEFAULT_BALANCE,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({
          balance: userBalances.balance,
          updatedAt: userBalances.updatedAt
        });
      
      console.log(`[getUserBalance] Created new balance record for user ${userId}:`, newBalance);
      return newBalance || { balance: DEFAULT_BALANCE, updatedAt: new Date() };
    } catch (insertError) {
      console.error(`[getUserBalance] Error creating new balance record for user ${userId}:`, insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error in getUserBalance:', error);
    return handleDbError(error, 'getUserBalance');
  }
}

export async function updateUserBalance(
  dbOrTx: DbType | TxType,
  userId: string, 
  amount: number
) {
  try {
    const now = new Date();
    
    // Try to update existing balance
    const updatedBalance = await dbOrTx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${amount}`,
        updatedAt: now
      })
      .where(eq(userBalances.userId, userId))
      .returning({ balance: userBalances.balance });
    
    // If no rows updated, insert new balance
    if (updatedBalance.length === 0) {
      const newBalance = await dbOrTx
        .insert(userBalances)
        .values({
          userId,
          balance: amount,
          createdAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [userBalances.userId], // Changed to array
          set: {
            balance: sql`${userBalances.balance} + ${amount}`,
            updatedAt: now
          }
        })
        .returning({ 
          balance: userBalances.balance 
        });
      
      return newBalance[0].balance;
    }
    
    return updatedBalance[0].balance;
  } catch (error) {
    return handleDbError(error, 'updateUserBalance');
  }
}

// Transaction Operations
export async function createTransaction(
  dbOrTx: DbType | TxType,
  transaction: Omit<CreditTransaction, 'id' | 'createdAt' | 'updatedAt'>
) {
  try {
    const result = await dbOrTx
      .insert(creditTransactions)
      .values({
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        reason: creditTransactions.reason,
        metadata: creditTransactions.metadata,
        createdAt: creditTransactions.createdAt
      });
    
    return result[0];
  } catch (error) {
    return handleDbError(error, 'createTransaction');
  }
}

export async function getTransactionHistory(
  dbOrTx: DbType | TxType,
  userId: string,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0,
  startDate?: Date,
  endDate?: Date
): Promise<{ transactions: CreditTransaction[]; total: number }> {
  try {
    // Build conditions
    const conditions = [eq(creditTransactions.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(creditTransactions.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(creditTransactions.createdAt, endDate));
    }
    
    // Get total count
    const countResult = await dbOrTx
      .select({ count: sql`count(*)::int` })
      .from(creditTransactions)
      .where(and(...conditions));
    
    const total = countResult[0]?.count || 0;
    
    // Get paginated results
    const transactions = await dbOrTx
      .select()
      .from(creditTransactions)
      .where(and(...conditions))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(Math.min(limit, MAX_LIMIT))
      .offset(offset);
    
    return { transactions, total };
  } catch (error) {
    console.error('Error in getTransactionHistory:', error);
    // Return empty result in case of error
    return { transactions: [], total: 0 };
  }
}

export async function getCreditSummary(
  dbOrTx: DbType | TxType,
  userId: string
): Promise<{ earned: number; spent: number }> {
  try {
    const [earnedResult, spentResult] = await Promise.all([
      dbOrTx
        .select({ total: sql`COALESCE(SUM(amount), 0)` })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, 'earn' as const)
          )
        ),
      dbOrTx
        .select({ total: sql`COALESCE(SUM(amount), 0)` })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, 'spend' as const)
          )
        )
    ]);

    return {
      earned: Number(earnedResult[0]?.total) || 0,
      spent: Number(spentResult[0]?.total) || 0
    };
  } catch (error) {
    console.error('Error in getCreditSummary:', error);
    // Return default values in case of error
    return { earned: 0, spent: 0 };
  }
}
