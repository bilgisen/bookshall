'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { CreditTransaction } from '@/types/credits';

interface PaginatedTransactions {
  transactions: CreditTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const DEFAULT_PAGE_SIZE = 20;

export function useTransactions(pageSize = DEFAULT_PAGE_SIZE) {
  const effectiveSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 0;
  return useInfiniteQuery<PaginatedTransactions, Error>({
    queryKey: ['credits', 'transactions'],
    queryFn: async ({ pageParam = 0 }) => {
      if (effectiveSize === 0) {
        return {
          transactions: [],
          pagination: { total: 0, limit: 0, offset: 0 },
        };
      }
      const offset = Number(pageParam) * effectiveSize;
      const response = await fetch(
        `/api/credits/transactions?limit=${effectiveSize}&offset=${offset}`, {
          credentials: 'include' // This ensures cookies are sent with the request
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch transactions');
      }
      
      const data = await response.json();
      return {
        transactions: data.transactions || [],
        pagination: data.pagination || {
          total: 0,
          limit: effectiveSize,
          offset: offset
        }
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const { pagination } = lastPage;
      const loadedCount = allPages.flatMap(p => p.transactions).length;
      const hasMore = pagination.total > loadedCount;
      return hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: effectiveSize > 0,
  });
}
