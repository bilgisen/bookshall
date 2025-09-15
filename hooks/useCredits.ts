'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditService } from '@/lib/services/credit/credit.service';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';
import type { 
  TransactionHistoryResult,
  TransactionMetadata,
  BalanceWithDetails,
  CreditOperationResult
} from '@/lib/services/credit/credit.types';

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
    data: balanceData, 
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery<BalanceWithDetails>({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      try {
        const { session } = await auth();
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        return CreditService.getBalanceWithDetails(session.user.id);
      } catch (error) {
        console.error('Error fetching balance:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Get transaction history
  const {
    data: transactionsData = { transactions: [], pagination: { total: 0, limit, offset: 0, hasMore: false } },
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<TransactionHistoryResult>({
    queryKey: ['credits', 'transactions', { limit }],
    queryFn: async () => {
      try {
        const { session } = await auth();
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        return CreditService.getTransactionHistory(
          session.user.id,
          limit,
          0
        );
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Earn credits mutation
  const earnMutation = useMutation<CreditOperationResult, Error, { 
    amount: number; 
    reason: string; 
    metadata?: TransactionMetadata;
  }>({
    mutationFn: async ({ amount, reason, metadata = {} }) => {
      try {
        const { session } = await auth();
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        
        return CreditService.earnCredits(
          session.user.id,
          amount,
          reason,
          metadata
        );
      } catch (error) {
        console.error('Error earning credits:', error);
        throw error;
      }
    },
    onMutate: async ({ amount }) => {
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      
      const previousBalance = queryClient.getQueryData<{ balance: number }>(['credits', 'balance']);
      
      if (previousBalance) {
        queryClient.setQueryData<{ balance: number }>(
          ['credits', 'balance'],
          (old) => ({
            ...(old || { balance: 0 }),
            balance: (old?.balance || 0) + amount,
          })
        );
      }
      
      return { previousBalance };
    },
    onError: (error, variables, context) => {
      if (context?.previousBalance) {
        queryClient.setQueryData<{ balance: number }>(
          ['credits', 'balance'], 
          context.previousBalance
        );
      }
      toast.error(`Failed to earn credits: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['credits', 'transactions'] });
    },
  });

  // Spend credits mutation
  const spendMutation = useMutation<CreditOperationResult, Error, { 
    amount: number; 
    reason: string; 
    metadata?: TransactionMetadata;
  }>({
    mutationFn: async ({ amount, reason, metadata = {} }) => {
      try {
        const { session } = await auth();
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        
        return CreditService.spendCredits(
          session.user.id,
          amount,
          reason,
          metadata
        );
      } catch (error) {
        console.error('Error spending credits:', error);
        throw error;
      }
    },
    onMutate: async ({ amount }) => {
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      
      const previousBalance = queryClient.getQueryData<{ balance: number }>(['credits', 'balance']);
      const currentBalance = previousBalance?.balance || 0;
      
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      if (previousBalance) {
        queryClient.setQueryData<{ balance: number }>(
          ['credits', 'balance'],
          (old) => ({
            ...(old || { balance: 0 }),
            balance: (old?.balance || 0) - amount,
          })
        );
      }
      
      return { previousBalance };
    },
    onError: (error, variables, context) => {
      if (context?.previousBalance) {
        queryClient.setQueryData<{ balance: number }>(
          ['credits', 'balance'], 
          context.previousBalance
        );
      }
      toast.error(`Failed to spend credits: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['credits', 'transactions'] });
    },
  });

  // Helper function to invalidate all credit-related queries
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ 
        queryKey: ['credits'],
        refetchType: 'active'
      }),
      queryClient.invalidateQueries({
        queryKey: ['credits', 'balance'],
        refetchType: 'active'
      }),
      queryClient.invalidateQueries({
        queryKey: ['credits', 'transactions'],
        refetchType: 'active'
      })
    ]);
  };

  return {
    // Balance
    balance: balanceData?.balance || 0,
    balanceData,
    isLoadingBalance,
    balanceError,
    refetchBalance,
    
    // Transactions
    transactions: transactionsData?.transactions || [],
    totalTransactions: transactionsData?.pagination?.total || 0,
    isLoadingTransactions,
    transactionsError,
    refetchTransactions,
    
    // Mutations
    earnCredits: earnMutation.mutateAsync,
    isEarning: earnMutation.isPending,
    spendCredits: spendMutation.mutateAsync,
    isSpending: spendMutation.isPending,
    
    // Helper functions
    hasSufficientCredits: (amount: number) => {
      return (balanceData?.balance || 0) >= amount;
    },
    
    // Utility functions
    invalidate,
    refetchAll: async () => {
      await Promise.all([
        refetchBalance(),
        refetchTransactions(),
      ]);
    },
  };
}

export default useCredits;
