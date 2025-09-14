'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserBalance } from '@/lib/actions/credits';

interface BalanceWithDetails {
  userId: string;
  balance: number;
  lastUpdated: string | null;
  currency: string;
}

type CreditBalance = BalanceWithDetails;

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
  } = useQuery<CreditBalance>({
    queryKey: ['credits', 'balance'],
    queryFn: getCurrentUserBalance,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    refetchOnWindowFocus: true,
    enabled,
  });

  return {
    ...(data || {
      userId: '',
      balance: 0,
      lastUpdated: null,
      currency: 'credits'
    }),
    balance: data?.balance ?? 0,
    currency: data?.currency ?? 'credits',
    lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated) : null,
    isLoading,
    isRefetching,
    error,
    refetch,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
    },
  };
}

export default useCreditBalance;
