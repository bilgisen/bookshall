'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserBalance, getTransactionHistory, earnCredits, spendCredits } from '@/lib/actions/credits';
import { toast } from 'sonner';

interface BalanceWithDetails {
  userId: string;
  balance: number;
  lastUpdated: string | null;
  currency: string;
}

type CreditBalance = BalanceWithDetails & {
  updatedAt: string;
};

type CreditTransaction = {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

type TransactionHistory = {
  transactions: CreditTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

interface CreditOperationResult {
  success: boolean;
  balance: number;
  transaction?: {
    id: string;
    amount: number;
    type: 'earn' | 'spend';
    reason: string | null;
    metadata: unknown;
    createdAt: Date | string;
    updatedAt: Date | string;
    userId: string;
  };
  error?: string;
  code?: string;
}

interface UseCreditsOptions {
  limit?: number;
  refetchInterval?: number;
}

export function useCredits({ 
  limit = 5, 
  refetchInterval 
}: UseCreditsOptions = {}) {
  const queryClient = useQueryClient();
  
  // Get user's balance with automatic refetching
  const { 
    data: balance, 
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance 
  } = useQuery<CreditBalance>({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      console.log('Fetching balance...');
      try {
        const balance = await getCurrentUserBalance();
        console.log('Raw balance from API:', balance);
        
        const result = {
          ...balance,
          updatedAt: balance.lastUpdated || new Date().toISOString()
        };
        
        console.log('Processed balance result:', result);
        return result;
      } catch (error) {
        console.error('Error in balance query:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      console.log('Balance query successful:', data);
    },
    onError: (error) => {
      console.error('Balance query error:', error);
    }
  });

  // Get transaction history with pagination
  const { 
    data: transactionsData, 
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions
  } = useQuery<TransactionHistory>({
    queryKey: ['credits', 'transactions', limit],
    queryFn: async () => {
      const result = await getTransactionHistory(limit);
      return {
        transactions: result.transactions.map(tx => {
          // Ensure all required fields are present
          const transaction: CreditTransaction = {
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            reason: tx.reason ?? null,
            metadata: tx.metadata ?? {},
            createdAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt),
            updatedAt: tx.updatedAt instanceof Date ? tx.updatedAt : new Date(tx.updatedAt),
            userId: tx.userId
          };
          return transaction;
        }),
        pagination: result.pagination
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Unified credit mutation with optimistic updates
  const creditMutation = useMutation<
    CreditOperationResult,
    Error,
    { amount: number; type: 'earn' | 'spend'; reason?: string; metadata?: Record<string, unknown> }
  >({
    mutationFn: async ({ amount, type, reason, metadata }) => {
      if (type === 'earn') {
        return earnCredits(amount, reason, metadata);
      } else {
        return spendCredits(amount, reason, metadata);
      }
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      
      // Snapshot the previous values
      const previousBalance = queryClient.getQueryData<CreditBalance>(['credits', 'balance']);
      const previousTransactions = queryClient.getQueryData<TransactionHistory>(['credits', 'transactions', limit]);
      
      // Optimistically update the balance
      if (previousBalance) {
        const newBalance = variables.type === 'earn'
          ? (previousBalance.balance || 0) + variables.amount
          : (previousBalance.balance || 0) - variables.amount;
          
        queryClient.setQueryData<CreditBalance>(['credits', 'balance'], {
          ...previousBalance,
          balance: newBalance,
        });
      }
      
      // Optimistically update the transaction list
      if (previousTransactions) {
        const now = new Date();
        const newTransaction: CreditTransaction = {
          id: `temp-${Date.now()}`,
          amount: variables.amount,
          type: variables.type,
          reason: variables.reason || null,
          metadata: variables.metadata || {},
          createdAt: now,
          updatedAt: now,
          userId: previousBalance?.userId || 'unknown',
        };
        
        queryClient.setQueryData<TransactionHistory>(['credits', 'transactions', limit], {
          ...previousTransactions,
          transactions: [newTransaction, ...previousTransactions.transactions],
          pagination: {
            ...previousTransactions.pagination,
            total: previousTransactions.pagination.total + 1,
          },
        });
      }
      
      return { previousBalance, previousTransactions };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Update the balance
        queryClient.setQueryData<CreditBalance>(['credits', 'balance'], (old) => {
          if (!old) return old;
          return {
            ...old,
            balance: data.balance,
            lastUpdated: new Date().toISOString(),
          };
        });

        // Update the transaction list if there's a transaction
        if (data.transaction) {
          queryClient.setQueryData<TransactionHistory>(
            ['credits', 'transactions', limit],
            (old) => {
              if (!old) return old;
              
              // Remove the temporary transaction if it exists
              const transactions = old.transactions.filter(
                (tx) => !tx.id.startsWith('temp-')
              );
              
              // Create a properly typed transaction
              const tx = data.transaction!;
              const newTransaction: CreditTransaction = {
                id: tx.id,
                amount: tx.amount,
                type: tx.type,
                reason: tx.reason ?? null,
                metadata: tx.metadata ?? {},
                createdAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt),
                updatedAt: tx.updatedAt instanceof Date ? tx.updatedAt : new Date(tx.updatedAt),
                userId: tx.userId || 'unknown',
              };
              
              return {
                ...old,
                transactions: [newTransaction, ...transactions],
                pagination: {
                  ...old.pagination,
                  total: old.pagination.total + 1,
                },
              };
            }
          );
        }
      }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBalance) {
        queryClient.setQueryData(['credits', 'balance'], context.previousBalance);
      }
      if (context?.previousTransactions) {
        queryClient.setQueryData(['credits', 'transactions', limit], context.previousTransactions);
      }
      
      toast.error(`Failed to ${variables.type} credits: ${error.message}`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
  
  // Helper functions for specific operations
  const earn = (amount: number, reason?: string, metadata?: Record<string, unknown>) => 
    creditMutation.mutateAsync({ amount, type: 'earn', reason, metadata });
    
  const spend = (amount: number, reason?: string, metadata?: Record<string, unknown>) => 
    creditMutation.mutateAsync({ amount, type: 'spend', reason, metadata });

  // Refresh functions
  const refresh = () => {
    refetchBalance();
    refetchTransactions();
  };

  return {
    // Balance
    balance: balance?.balance || 0,
    isLoading: isLoadingBalance || isLoadingTransactions,
    isLoadingBalance,
    balanceError,
    
    // Transactions
    transactions: transactionsData?.transactions || [],
    transactionsData,
    isLoadingTransactions,
    transactionsError,
    
    // Mutations
    earn,
    spend,
    isMutating: creditMutation.isPending,
    error: creditMutation.error,
    
    // Refresh functions
    refresh,
    refreshBalance: refetchBalance,
    refreshTransactions: refetchTransactions,
  };
}

export default useCredits;
