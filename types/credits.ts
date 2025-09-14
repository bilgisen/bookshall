export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditBalance {
  balance: number;
  updatedAt: string;
}

export interface CreditTransactionResponse {
  success: boolean;
  balance: number;
  transaction: CreditTransaction;
}
