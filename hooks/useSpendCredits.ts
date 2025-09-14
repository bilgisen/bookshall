'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditBalance, CreditTransactionResponse } from '@/types/credits';

interface SpendCreditsOptions {
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (data: CreditTransactionResponse) => void;
  onError?: (error: Error) => void;
}

export function useSpendCredits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount, reason, metadata }: Omit<SpendCreditsOptions, 'onSuccess' | 'onError'>) => {
      const response = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason, metadata }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to spend credits');
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });

      // Snapshot the previous value
      const previousBalance = queryClient.getQueryData<CreditBalance>(['credits', 'balance']);

      // Optimistically update the balance
      queryClient.setQueryData<CreditBalance>(['credits', 'balance'], (old) => {
        const currentBalance = old?.balance || 0;
        if (currentBalance < variables.amount) {
          throw new Error('Insufficient balance');
        }
        return {
          ...(old || { balance: 0, updatedAt: new Date().toISOString() }),
          balance: currentBalance - variables.amount,
        };
      });

      return { previousBalance };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBalance) {
        queryClient.setQueryData(['credits', 'balance'], context.previousBalance);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['credits', 'transactions'] });
    },
  });
}
