'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditService } from '@/lib/services/credit/credit.service';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';
import type { 
  TransactionHistoryResult,
  TransactionMetadata,
  CreditOperationResult,
  BalanceWithDetails
} from '@/lib/services/credit/credit.types';

interface UseCreditTransactionsOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export function useCreditTransactions({
  limit = 10,
  offset = 0,
  enabled = true,
  startDate,
  endDate,
}: UseCreditTransactionsOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = ['credits', 'transactions', { limit, offset, startDate, endDate }];

  // Get transaction history
  const {
    data = { transactions: [], pagination: { total: 0, limit, offset, hasMore: false } },
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<TransactionHistoryResult>({
    queryKey,
    queryFn: async () => {
      try {
        const authResult = await auth();
        const session = authResult?.session;
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        return CreditService.getTransactionHistory(
          session.user.id,
          limit,
          offset
        );
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    retry: 2,
  });

  // Unified credit mutation with optimistic updates
  const creditMutation = useMutation<CreditOperationResult, Error, {
    type: 'earn' | 'spend';
    amount: number;
    reason: string;
    metadata?: TransactionMetadata;
  }>({
    mutationFn: async ({ type, amount, reason, metadata = {} }) => {
      try {
        const authResult = await auth();
        const session = authResult?.session;
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        
        if (type === 'earn') {
          return CreditService.earnCredits(
            session.user.id,
            amount,
            reason,
            metadata
          );
        } else {
          return CreditService.spendCredits(
            session.user.id,
            amount,
            reason,
            metadata
          );
        }
      } catch (error) {
        console.error(`Error in credit ${type} operation:`, error);
        throw error;
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous values
      const previousBalance = queryClient.getQueryData<BalanceWithDetails>([
        'credits',
        'balance'
      ]);
      const previousTransactions = queryClient.getQueryData<TransactionHistoryResult>(queryKey);

      // Optimistically update the balance
      if (previousBalance) {
        const newBalance = variables.type === 'earn'
          ? (previousBalance.balance || 0) + variables.amount
          : (previousBalance.balance || 0) - variables.amount;

        queryClient.setQueryData<BalanceWithDetails>(
          ['credits', 'balance'],
          { 
            ...previousBalance,
            balance: newBalance 
          }
        );
      }

      // Optimistically add to transaction list
      if (previousTransactions) {
        const newTransaction = {
          id: `temp-${Date.now()}`,
          userId: '', // Will be filled in on success
          amount: variables.amount,
          type: variables.type as 'earn' | 'spend',
          reason: variables.reason,
          metadata: variables.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        queryClient.setQueryData<TransactionHistoryResult>(
          queryKey,
          {
            transactions: [newTransaction, ...previousTransactions.transactions],
            pagination: {
              ...previousTransactions.pagination,
              total: previousTransactions.pagination.total + 1,
            },
          }
        );
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
      queryClient.invalidateQueries({ 
        queryKey: ['credits'],
        refetchType: 'active'
      });
    },
  });

  // Directly use creditMutation.mutateAsync for specific operations
  // Example: creditMutation.mutateAsync({ type: 'earn', amount, reason, metadata })

  return {
    transactions: data.transactions,
    pagination: data.pagination,
    isLoading,
    isRefetching,
    error: error as Error | null,
    isError: !!error,
    refetch,
    creditMutation,
    invalidate: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['credits', 'transactions'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['credits', 'balance'],
          refetchType: 'active',
        }),
      ]);
    },
  };
}

export default useCreditTransactions;
