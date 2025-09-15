'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditService } from '@/lib/services/credit/credit.service';
import { auth } from '@/lib/auth';
import type { BalanceWithDetails } from '@/lib/services/credit/credit.types';

interface UseCreditBalanceOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export function useCreditBalance({ 
  refetchInterval, 
  enabled = true 
}: UseCreditBalanceOptions = {}) {
  const queryClient = useQueryClient();
  
  const { 
    data, 
    isLoading,
    error,
    refetch,
    isRefetching,
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
    enabled,
    retry: 2,
  });

  return {
    userId: data?.userId || '',
    balance: data?.balance ?? 0,
    lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated) : null,
    currency: 'credits',
    isLoading,
    isRefetching,
    error: error as Error | null,
    isError: !!error,
    refetch,
    invalidate: () => {
      return queryClient.invalidateQueries({ 
        queryKey: ['credits', 'balance'],
        refetchType: 'active',
      });
    },
  };
}

export default useCreditBalance;
