'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserBalance, getTransactionHistory, earnCredits, spendCredits } from '@/lib/actions/credits';
import { toast } from 'sonner';

export function useCredits(limit = 5) {
  const queryClient = useQueryClient();
  
  // Define the balance response type
  type BalanceResponse = { balance: number } | number;
  
  // Get user's balance
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery<BalanceResponse>({
    queryKey: ['credits', 'balance'],
    queryFn: getCurrentUserBalance as () => Promise<BalanceResponse>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Get the numeric balance value
  const balance = typeof balanceData === 'object' && balanceData !== null && 'balance' in balanceData 
    ? balanceData.balance 
    : (balanceData as number) || 0;

  // Define transaction type based on schema
  interface Transaction {
    id: string;
    userId: string;
    type: 'earn' | 'spend';
    amount: number;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  }

  // Define transaction history response type
  interface TransactionHistoryResponse {
    transactions: Transaction[];
    total: number;
  }

  // Get transaction history
  const { 
    data: transactionData, 
    isLoading: isLoadingTransactions 
  } = useQuery<TransactionHistoryResponse>({
    queryKey: ['credits', 'transactions', limit],
    queryFn: () => getTransactionHistory(limit) as unknown as Promise<TransactionHistoryResponse>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract transactions from the response
  const transactions = transactionData?.transactions || [];

  // Define the balance types
  type BalanceData = { balance: number } | number;
  
  // Define the mutation context type
  interface MutationContext {
    previousBalance?: BalanceData;
  }

  // Earn credits mutation with optimistic updates
  const earnCreditsMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason?: string }) => {
      return earnCredits(amount, reason);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      
      // Snapshot the previous value
      const previousBalance = queryClient.getQueryData<BalanceData>(['credits', 'balance']);
      
      // Optimistically update the balance
      if (previousBalance) {
        const currentBalance = typeof previousBalance === 'number' 
          ? previousBalance 
          : previousBalance.balance || 0;
          
        const newBalance = {
          ...(typeof previousBalance === 'object' ? previousBalance : { balance: previousBalance }),
          balance: currentBalance + variables.amount
        };
        
        queryClient.setQueryData<BalanceData>(['credits', 'balance'], newBalance);
      }
      
      return { previousBalance };
    },
    onError: (err: Error, variables: { amount: number; reason?: string }, context?: MutationContext) => {
      // Rollback on error
      if (context?.previousBalance !== undefined) {
        queryClient.setQueryData<BalanceData>(['credits', 'balance'], context.previousBalance);
      }
      toast.error('Failed to add credits');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });

  // Spend credits mutation with optimistic updates
  const spendCreditsMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason?: string }) => {
      return spendCredits(amount, reason);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });
      
      // Snapshot the previous value
      const previousBalance = queryClient.getQueryData<BalanceData>(['credits', 'balance']);
      
      // Optimistically update the balance
      if (previousBalance) {
        const currentBalance = typeof previousBalance === 'number' 
          ? previousBalance 
          : previousBalance.balance || 0;
          
        const newBalanceValue = Math.max(0, currentBalance - variables.amount);
        const newBalance = {
          ...(typeof previousBalance === 'object' ? previousBalance : { balance: previousBalance }),
          balance: newBalanceValue
        };
        
        queryClient.setQueryData<BalanceData>(['credits', 'balance'], newBalance);
      }
      
      return { previousBalance };
    },
    onError: (err: Error, variables: { amount: number; reason?: string }, context?: MutationContext) => {
      // Rollback on error
      if (context?.previousBalance !== undefined) {
        queryClient.setQueryData<BalanceData>(['credits', 'balance'], context.previousBalance);
      }
      toast.error('Failed to spend credits');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });

  return {
    // Balance
    balance: typeof balance === 'number' ? balance : (balance as { balance: number })?.balance || 0,
    isLoadingBalance,
    
    // Transactions
    transactions: transactions || [],
    isLoadingTransactions,
    
    // Mutations
    earnCredits: earnCreditsMutation.mutateAsync,
    isEarning: earnCreditsMutation.isPending,
    
    spendCredits: spendCreditsMutation.mutateAsync,
    isSpending: spendCreditsMutation.isPending,
    
    // Refresh function
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
  };
}
