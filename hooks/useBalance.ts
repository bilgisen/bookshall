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
          const data = responseText ? JSON.parse(responseText) : {};
          console.log('Parsed balance data:', data);
          
          // Extract the balance from the response
          if (data && typeof data.balance === 'object' && data.balance !== null) {
            // If balance is an object, extract the numeric value
            return {
              balance: Number(data.balance.balance) || 0,
              updatedAt: data.balance.updatedAt || new Date().toISOString()
            };
          } else if (typeof data.balance === 'number') {
            // If balance is already a number, return as is
            return {
              balance: data.balance,
              updatedAt: data.updatedAt || new Date().toISOString()
            };
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
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    ...options
  });
}
