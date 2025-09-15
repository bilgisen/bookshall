// lib/services/credit/credit.types.ts
import type { CreditTransaction as DBCreditTransaction } from '@/db/schema';

export type TransactionMetadata = {
  [key: string]: unknown;
};

export interface CreditTransaction extends Omit<DBCreditTransaction, 'metadata'> {
  id: string;
  userId: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string | null;
  metadata: TransactionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type CreditOperationResult = {
  success: boolean;
  transaction?: CreditTransaction;
  error?: string;
  code?: 'INSUFFICIENT_CREDITS' | 'INVALID_AMOUNT' | 'TRANSACTION_FAILED';
  balance?: number;
  details?: string;
  oldBalance?: number;
  newBalance?: number;
  wasAdjusted?: boolean;
};

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
  available: number;
  currency: 'credits';
}

export interface UserBalance {
  userId: string;
  balance: number;
  updatedAt: Date;
}

export interface BalanceWithDetails extends UserBalance {
  currency: 'credits';
  summary: CreditSummary;
}


