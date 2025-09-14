import type { CreditTransaction } from '@/db/schema';

export type TransactionMetadata = Record<string, unknown>;

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
  balance: number;
  updatedAt: Date | null;
}

export interface BalanceWithDetails extends UserBalance {
  lastUpdated: string | null;
  currency: string;
}
