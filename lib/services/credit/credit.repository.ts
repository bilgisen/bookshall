// lib/services/credit/credit.repository.ts
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '@/db/drizzle';
import type { Database, DbTransaction } from '@/db/drizzle';
import * as schema from '@/db/schema';
import type { CreditTransaction, TransactionMetadata } from './credit.types';
import type { UserBalance } from './credit.types';
import { isUniqueConstraintError } from './credit.utils';

// Get tables from schema
const { creditTransactions, userBalances } = schema;

// Export types for use in other files
export type DbType = Database;
export type TxType = DbTransaction;
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
  const logPrefix = `[getUserBalance:${userId}]`;
  console.log(`${logPrefix} Starting balance check`);
  
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      const error = new Error(`Invalid user ID: ${userId}`);
      console.error(logPrefix, 'Invalid user ID:', userId);
      throw error;
    }

    // Log database connection type for debugging
    const connectionType = dbOrTx === db ? 'Direct DB' : 'Transaction';
    console.log(`${logPrefix} Using connection: ${connectionType}`);
    
    // Try to get existing balance
    console.log(`${logPrefix} Querying user_balances table`);
    const result = await dbOrTx
      .select({
        balance: userBalances.balance,
        updatedAt: userBalances.updatedAt
      })
      .from(userBalances)
      .where(eq(userBalances.userId, userId))
      .limit(1);
    
    console.log(`${logPrefix} Query result:`, JSON.stringify(result, null, 2));
    
    // If balance exists, validate and return it
    if (result.length > 0) {
      const balanceRecord = result[0];
      const balanceValue = balanceRecord.balance;
      const updatedAt = balanceRecord.updatedAt;
      
      // Validate balance value
      if (typeof balanceValue !== 'number' || isNaN(balanceValue) || balanceValue < 0) {
        console.error(`${logPrefix} Invalid balance value:`, balanceValue);
        // Attempt to fix invalid balance
        await dbOrTx
          .update(userBalances)
          .set({
            balance: DEFAULT_BALANCE,
            updatedAt: new Date()
          })
          .where(eq(userBalances.userId, userId));
        
        console.log(`${logPrefix} Reset invalid balance to default (${DEFAULT_BALANCE})`);
        return { 
          userId,
          balance: DEFAULT_BALANCE, 
          updatedAt: new Date() 
        };
      }
      
      console.log(`${logPrefix} Valid balance found:`, { balance: balanceValue, updatedAt });
      return { 
        userId,
        balance: balanceValue, 
        updatedAt: updatedAt || new Date() 
      };
    }
    
    // If no balance exists, create a new one with default balance
    console.log(`${logPrefix} No balance record found, creating new one`);
    
    const newBalance = {
      userId,
      balance: DEFAULT_BALANCE,
      updatedAt: new Date()
    };
    
    try {
      await dbOrTx
        .insert(userBalances)
        .values({
          userId,
          balance: DEFAULT_BALANCE,
          createdAt: newBalance.updatedAt,
          updatedAt: newBalance.updatedAt
        });
      
      console.log(`${logPrefix} Created new balance record`);
      return newBalance;
    } catch (insertError) {
      // Handle race condition where balance might have been created by another request
      if (isUniqueConstraintError(insertError)) {
        console.log(`${logPrefix} Race condition detected, fetching existing balance`);
        const [existing] = await dbOrTx
          .select({
            balance: userBalances.balance,
            updatedAt: userBalances.updatedAt
          })
          .from(userBalances)
          .where(eq(userBalances.userId, userId));
          
        if (existing) {
          console.log(`${logPrefix} Retrieved balance after race condition:`, existing);
          return {
            userId,
            balance: existing.balance,
            updatedAt: existing.updatedAt
          };
        }
      }
      
      console.error(`${logPrefix} Failed to create balance record:`, insertError);
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
): Promise<UserBalance> {
  try {
    const [updated] = await dbOrTx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(userBalances.userId, userId))
      .returning({ 
        balance: userBalances.balance,
        updatedAt: userBalances.updatedAt
      });

    if (!updated) {
      throw new Error('Failed to update user balance');
    }

    // Ensure we return a complete UserBalance object
    return {
      userId,
      balance: updated.balance,
      updatedAt: updated.updatedAt || new Date()
    } as UserBalance;
  } catch (error) {
    console.error('Error in updateUserBalance:', error);
    // Return a default UserBalance with the provided userId
    return {
      userId,
      balance: 0,
      updatedAt: new Date()
    } as UserBalance;
  }
}

// Transaction Operations
export async function createTransaction(
  dbOrTx: DbType | TxType,
  transaction: Omit<CreditTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CreditTransaction> {
  try {
    // Ensure metadata is properly typed and has an index signature
    const metadata: TransactionMetadata = transaction.metadata ? 
      { ...transaction.metadata } as TransactionMetadata : 
      {} as TransactionMetadata;
    
    // Create a new transaction with all required fields
    const newTransaction = {
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type,
      reason: transaction.reason || null,
      metadata,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [result] = await dbOrTx
      .insert(creditTransactions)
      .values(newTransaction)
      .returning();

    // Ensure the returned transaction has proper typing
    return {
      id: result.id,
      userId: result.userId,
      amount: result.amount,
      type: result.type as 'earn' | 'spend',
      reason: result.reason,
      metadata: (result.metadata || {}) as TransactionMetadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt || result.createdAt || new Date()
    } as CreditTransaction;
  } catch (error) {
    return handleDbError<CreditTransaction>(error, 'createTransaction');
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
    // Validate and adjust limit
    const adjustedLimit = Math.min(limit, MAX_LIMIT);
    
    // Build the base query with explicit field selection for better type safety
    const query = dbOrTx
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        reason: creditTransactions.reason,
        metadata: creditTransactions.metadata,
        createdAt: creditTransactions.createdAt,
        updatedAt: creditTransactions.updatedAt
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          startDate ? gte(creditTransactions.createdAt, startDate) : undefined,
          endDate ? lte(creditTransactions.createdAt, endDate) : undefined
        )
      )
      .orderBy(desc(creditTransactions.createdAt))
      .limit(adjustedLimit)
      .offset(offset);

    // Get total count for pagination
    const countQuery = dbOrTx
      .select({ count: sql<number>`count(*)` })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          startDate ? gte(creditTransactions.createdAt, startDate) : undefined,
          endDate ? lte(creditTransactions.createdAt, endDate) : undefined
        )
      )
      .then((res) => Number(res[0]?.count ?? 0));

    const [transactions, total] = await Promise.all([query, countQuery]);

    // Ensure all transactions have proper typing with explicit type assertion
    const typedTransactions: CreditTransaction[] = transactions.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      amount: tx.amount,
      type: tx.type as 'earn' | 'spend',
      reason: tx.reason,
      metadata: (tx.metadata || {}) as TransactionMetadata, // Explicitly type metadata
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt || tx.createdAt || new Date()
    } as CreditTransaction));
    
    return {
      transactions: typedTransactions,
      total
    };
  } catch (error) {
    console.error('Error in getTransactionHistory:', error);
    console.error('Error in getTransactionHistory:', error);
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
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            sql`${creditTransactions.amount} > 0`
          )
        ),
      dbOrTx
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            sql`${creditTransactions.amount} < 0`
          )
        )
    ]);

    return {
      earned: Number(earnedResult[0]?.total) || 0,
      spent: Math.abs(Number(spentResult[0]?.total)) || 0
    };
  } catch (error) {
    console.error('Error in getCreditSummary:', error);
    console.error('Error in getCreditSummary:', error);
    return { earned: 0, spent: 0 };
  }
}

// ... (rest of the code remains the same)

// Fetch a single transaction by ID
export async function getTransactionById(
  dbOrTx: DbType | TxType,
  id: string
): Promise<CreditTransaction | null> {
  try {
    const [tx] = await dbOrTx
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        reason: creditTransactions.reason,
        metadata: creditTransactions.metadata,
        createdAt: creditTransactions.createdAt,
        updatedAt: creditTransactions.updatedAt,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.id, id))
      .limit(1);

    if (!tx) return null;

    return {
      id: tx.id,
      userId: tx.userId,
      amount: tx.amount,
      type: tx.type as 'earn' | 'spend',
      reason: tx.reason,
      metadata: (tx.metadata || {}) as TransactionMetadata,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt || tx.createdAt || new Date(),
    } as CreditTransaction;
  } catch (error) {
    console.error('Error in getTransactionById:', error);
    return null;
  }
}
