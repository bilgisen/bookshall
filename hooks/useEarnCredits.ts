'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditService } from '@/lib/services/credit/credit.service';
import { auth } from '@/lib/auth';
import type { TransactionMetadata, CreditOperationResult } from '@/lib/services/credit/credit.types';
import { toast } from 'sonner';

interface EarnCreditsOptions {
  amount: number;
  reason: string;
  metadata?: TransactionMetadata;
  onSuccess?: (data: { success: boolean; balance: number }) => void;
  onError?: (error: Error) => void;
}

export function useEarnCredits() {
  const queryClient = useQueryClient();

  return useMutation<CreditOperationResult, Error, Omit<EarnCreditsOptions, 'onSuccess' | 'onError'>>({
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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['credits', 'balance'] });

      // Snapshot the previous value
      const previousBalance = queryClient.getQueryData<{ balance: number }>(['credits', 'balance']);

      // Optimistically update the balance
      queryClient.setQueryData<{ balance: number }>(
        ['credits', 'balance'], 
        (old) => ({
          ...(old || { balance: 0 }),
          balance: (old?.balance || 0) + variables.amount,
        })
      );

      return { previousBalance };
    },
    onSuccess: (data, variables) => {
      if (variables.onSuccess) {
        variables.onSuccess({ 
          success: data.success, 
          balance: data.balance 
        });
      }
      toast.success(`Successfully earned ${variables.amount} credits`);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBalance) {
        queryClient.setQueryData<{ balance: number }>(
          ['credits', 'balance'], 
          context.previousBalance
        );
      }
      
      // Call the onError callback if provided
      if (variables.onError) {
        variables.onError(error);
      }
      
      toast.error(`Failed to earn credits: ${error.message}`);
    },
    onSettled: () => {
      // Invalidate queries to refetch fresh data
      Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['credits', 'balance'],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({
          queryKey: ['credits', 'transactions'],
          refetchType: 'active'
        })
      ]);
    },
  });
}
