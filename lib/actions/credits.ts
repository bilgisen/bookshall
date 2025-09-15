'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

// The response from auth.api.getSession() includes both session and user data
type AuthSessionResponse = Awaited<ReturnType<typeof auth.api.getSession>>;

// Type guard to check if the response has a user
function hasUser(response: unknown): response is { user: { id: string } } {
  return (
    typeof response === 'object' && 
    response !== null && 
    'user' in response && 
    typeof (response as { user: unknown }).user === 'object' && 
    (response as { user: { id?: unknown } }).user?.id !== undefined
  );
}

// Get user's balance with caching (per-user cache key)
export async function getBalance(userId: string) {
  return unstable_cache(
    async () => CreditService.getBalanceWithDetails(userId),
    ['get-credits-balance', userId],
    { tags: ['credits'] }
  )();
}

// Helper function to get balance for the current user
export async function getCurrentUserBalance() {
  console.log('[getCurrentUserBalance] Getting current user session...');
  try {
    const requestHeaders = await headers();
    console.log('[getCurrentUserBalance] Request headers keys:', [...requestHeaders.keys()]);
    
    console.log('[getCurrentUserBalance] Calling auth.api.getSession()');
    const result = await auth.api.getSession({
      headers: requestHeaders
    });
    
    if (!hasUser(result)) {
      console.error('[getCurrentUserBalance] No valid user session found');
      throw new Error('Unauthorized');
    }
    
    console.log('[getCurrentUserBalance] Session result:', {
      hasSession: true,
      userId: result.user.id,
      sessionKeys: Object.keys(result)
    });
    
    const userId = result.user.id;
    console.log(`[getCurrentUserBalance] Getting balance for user: ${userId}`);
    
    try {
      const balance = await getBalance(userId);
      console.log(`[getCurrentUserBalance] Retrieved balance for user ${userId}:`, balance);
      return balance;
    } catch (error) {
      console.error(`[getCurrentUserBalance] Error getting balance for user ${userId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error('[getCurrentUserBalance] Unexpected error:', error);
    throw error;
  }
}

// Add credits to user's account
export async function earnCredits(amount: number, reason?: string, metadata?: Record<string, unknown>) {
  const result = await auth.api.getSession({
    headers: await headers()
  });
  
  if (!hasUser(result)) {
    throw new Error('Unauthorized - No valid user session');
  }
  
  const creditResult = await CreditService.earnCredits(
    result.user.id,
    amount,
    reason,
    metadata
  );
  
  if (creditResult.success) {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/credits');
    revalidateTag('credits');
  }
  
  return creditResult;
}

// Spend credits from user's account
export async function spendCredits(amount: number, reason?: string, metadata?: Record<string, unknown>) {
  const result = await auth.api.getSession({
    headers: await headers()
  });
  
  if (!hasUser(result)) {
    throw new Error('Unauthorized - No valid user session');
  }
  
  const creditResult = await CreditService.spendCredits(
    result.user.id,
    amount,
    reason,
    metadata
  );
  
  if (creditResult.success) {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/credits');
    revalidateTag('credits');
  }
  
  return creditResult;
}

// Get transaction history
export async function getTransactionHistory(limit = 10, offset = 0) {
  const result = await auth.api.getSession({
    headers: await headers()
  }) as AuthSessionResponse;
  
  if (!result?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  return CreditService.getTransactionHistory({
    userId: result.user.id,
    limit,
    offset
  });
}

// Get credit summary
export async function getCreditSummary() {
  const result = await auth.api.getSession({
    headers: await headers()
  }) as AuthSessionResponse;
  
  if (!result?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  return CreditService.getCreditSummary(result.user.id);
}
