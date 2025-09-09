'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditAction } from '@/lib/config/credits';

const API_BASE = '/api/credits';

type CreditOperation = {
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
};

export function useCredits(userId?: string) {
  const queryClient = useQueryClient();
  
  // Get user's credit balance and transaction history
  const {
    data: creditData,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['credits', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`${API_BASE}/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Mutation to earn credits
  const earnCredits = useMutation({
    mutationFn: async ({ amount, reason, metadata = {} }: CreditOperation) => {
      if (!userId) throw new Error('User ID is required');
      
      const response = await fetch(`${API_BASE}/${userId}/earn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason, metadata }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to earn credits');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch credit data
      queryClient.invalidateQueries({ queryKey: ['credits', userId] });
    },
  });

  // Mutation to spend credits
  const spendCredits = useMutation({
    mutationFn: async ({ amount, reason, metadata = {} }: CreditOperation) => {
      if (!userId) throw new Error('User ID is required');
      
      const response = await fetch(`${API_BASE}/${userId}/spend`, {
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
    onSuccess: () => {
      // Invalidate and refetch credit data
      queryClient.invalidateQueries({ queryKey: ['credits', userId] });
    },
  });

  // Helper function to perform credit operations with type safety
  const performCreditAction = async (
    action: CreditAction,
    customAmount?: number,
    metadata: Record<string, unknown> = {}
  ) => {
    const creditValue = getCreditValue(action, customAmount);
    
    if (creditValue > 0) {
      // Earning credits
      return await earnCredits.mutateAsync({
        amount: creditValue,
        reason: action,
        metadata,
      });
    } else if (creditValue < 0) {
      // Spending credits
      return await spendCredits.mutateAsync({
        amount: Math.abs(creditValue),
        reason: action,
        metadata,
      });
    }
    
    return null;
  };

  return {
    // Data
    balance: creditData?.balance || 0,
    transactions: creditData?.transactions || [],
    summary: creditData?.summary || { earned: 0, spent: 0 },
    isLoading: isLoadingBalance,
    error: balanceError,
    
    // Actions
    earnCredits,
    spendCredits,
    performCreditAction,
    refetchBalance,
    
    // Derived state
    canAfford: (cost: number) => (creditData?.balance || 0) >= cost,
  };
}

// This is a simplified version - in a real app, you might want to import this
// from your credit configuration file
function getCreditValue(action: string, customAmount?: number): number {
  // This is a simplified version - in a real app, you would import this
  // from your credit configuration file
  if (customAmount !== undefined) return customAmount;
  
  // Default values for common actions
  const creditMap: Record<string, number> = {
    SIGN_UP_BONUS: 100,
    PUBLISH_BOOK: -100,
    PUBLISH_CHAPTER: -10,
    USE_AI_ASSISTANT: -5,
    DAILY_LOGIN: 5,
  };
  
  return creditMap[action] || 0;
}
