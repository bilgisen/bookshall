'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CreditBalance } from '@/types/credits';

interface ErrorResponse {
  message?: string;
  [key: string]: unknown;
}

type UseBalanceOptions = Omit<UseQueryOptions<CreditBalance, Error>, 'queryKey' | 'queryFn'>;

export function useBalance(options?: UseBalanceOptions) {
  return useQuery<CreditBalance, Error>({
    queryKey: ['credits', 'balance'],
    queryFn: async (): Promise<CreditBalance> => {
      try {
        console.log('Fetching balance from /api/credits/balance');
        const response = await fetch('/api/credits/balance', {
          credentials: 'include',
          headers: {
            'x-debug': 'true'
          }
        });
        
        console.log('Balance API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from balance API:', errorText);
          let errorMessage = 'Failed to fetch balance';
          
          try {
            const errorData: ErrorResponse = errorText ? JSON.parse(errorText) : {};
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          
          throw new Error(errorMessage);
        }
        
        const responseText = await response.text();
        console.log('Balance API response text:', responseText);
        
        try {
          const raw = responseText ? (JSON.parse(responseText) as unknown) : {};
          console.log('Parsed balance data:', raw);

          // Type guards
          const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
          const hasNumber = (v: unknown, key: string): v is Record<string, unknown> => isRecord(v) && typeof v[key] === 'number';
          const pickUpdatedAt = (v: unknown): string => {
            if (isRecord(v) && typeof v.updatedAt === 'string') return v.updatedAt;
            return new Date().toISOString();
          };

          // Preferred shape: { success: true, data: { balance: number | { balance:number }, updatedAt? } }
          if (isRecord(raw) && 'data' in raw && isRecord((raw as Record<string, unknown>).data)) {
            const inner = (raw as Record<string, unknown>).data as Record<string, unknown>;
            if (typeof inner.balance === 'number') {
              return { balance: inner.balance as number, updatedAt: pickUpdatedAt(inner) };
            }
            if (isRecord(inner.balance) && typeof (inner.balance as Record<string, unknown>).balance === 'number') {
              const b = (inner.balance as Record<string, unknown>).balance as number;
              const ts = isRecord(inner.balance) ? (inner.balance as Record<string, unknown>).updatedAt : undefined;
              return { balance: b, updatedAt: typeof ts === 'string' ? ts : new Date().toISOString() };
            }
          }

          // Backward-compat: { balance: { balance:number } } or { balance:number }
          if (isRecord(raw) && isRecord(raw.balance) && typeof raw.balance.balance === 'number') {
            const b = raw.balance.balance as number;
            const ts = (raw.balance as Record<string, unknown>).updatedAt;
            return { balance: b, updatedAt: typeof ts === 'string' ? ts : new Date().toISOString() };
          }
          if (isRecord(raw) && typeof raw.balance === 'number') {
            return { balance: raw.balance as number, updatedAt: pickUpdatedAt(raw) };
          }

          // Default fallback
          return { balance: 0, updatedAt: new Date().toISOString() };
        } catch (e) {
          console.error('Failed to parse balance response:', e);
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Error in useBalance queryFn:', error);
        throw error;
      }
    },
    staleTime: 0, // always stale to reflect latest balance after actions
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    ...options
  });
}
