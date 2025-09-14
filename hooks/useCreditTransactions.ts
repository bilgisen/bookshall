'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionHistory, earnCredits, spendCredits } from '@/lib/actions/credits';
import { toast } from 'sonner';

import type { CreditTransaction, TransactionHistoryResult } from '@/lib/services/credit/credit.types';

interface TransactionHistory extends Omit<TransactionHistoryResult, 'transactions'> {
  transactions: Array<CreditTransaction & {
    type: 'earn' | 'spend';
    metadata?: Record<string, unknown>;
  }>;
}

interface UseCreditTransactionsOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export function useCreditTransactions({
  limit = 10,
  offset = 0,
  enabled = true,
}: UseCreditTransactionsOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['credits', 'transactions', { limit, offset }];

  // Get transaction history
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<TransactionHistoryResult, Error, TransactionHistory>({
    queryKey,
    queryFn: () => getTransactionHistory(limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  // Unified credit mutation with optimistic updates
  const creditMutation = useMutation({
    mutationFn: async ({
      type,
      amount,
      reason,
      metadata,
    }: {
      type: 'earn' | 'spend';
      amount: number;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (type === 'earn') {
        return earnCredits(amount, reason, metadata);
      } else {
        return spendCredits(amount, reason, metadata);
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous values
      const previousBalance = queryClient.getQueryData<{ balance: number }>([
        'credits',
        'balance',
      ]);
      const previousTransactions = queryClient.getQueryData<TransactionHistory>(queryKey);

      // Optimistically update the balance
      if (previousBalance) {
        const newBalance =
          variables.type === 'earn'
            ? previousBalance.balance + variables.amount
            : previousBalance.balance - variables.amount;

        queryClient.setQueryData(['credits', 'balance'], {
          ...previousBalance,
          balance: newBalance,
        });
      }

      // Optimistically update the transaction list
      if (previousTransactions) {
        const newTransaction = {
          id: `temp-${Date.now()}`,
          userId: '', // Will be filled by the server
          amount: variables.amount,
          type: variables.type,
          reason: variables.reason,
          metadata: JSON.stringify(variables.metadata || {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CreditTransaction;

        queryClient.setQueryData<TransactionHistory>(queryKey, {
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
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBalance) {
        queryClient.setQueryData(['credits', 'balance'], context.previousBalance);
      }
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKey, context.previousTransactions);
      }
      toast.error(`Failed to ${variables.type} credits: ${error.message}`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });

  // Helper functions
  const earn = (amount: number, reason?: string, metadata?: Record<string, unknown>) =>
    creditMutation.mutateAsync({ type: 'earn', amount, reason, metadata });

  const spend = (amount: number, reason?: string, metadata?: Record<string, unknown>) =>
    creditMutation.mutateAsync({ type: 'spend', amount, reason, metadata });

  return {
    // Data
    transactions: data?.transactions ?? [],
    pagination: data?.pagination ?? {
      total: 0,
      limit,
      offset,
      hasMore: false,
    },
    isLoading,
    isRefetching,
    error,
    
    // Mutations
    earn,
    spend,
    isMutating: creditMutation.isPending,
    error: creditMutation.error,
    
    // Refresh functions
    refetch,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
    },
  };
}

export default useCreditTransactions;
