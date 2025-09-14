'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

// Get user's balance with caching
export const getBalance = unstable_cache(
  async (userId: string) => {
    return CreditService.getBalanceWithDetails(userId);
  },
  ['get-credits-balance'],
  { tags: ['credits'] }
);

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
    
    console.log('[getCurrentUserBalance] Session result:', {
      hasSession: !!result?.session,
      userId: result?.session?.userId,
      sessionKeys: result?.session ? Object.keys(result.session) : []
    });
    
    if (!result?.session?.userId) {
      console.error('[getCurrentUserBalance] No user session found or missing userId');
      throw new Error('Unauthorized');
    }
    
    const userId = result.session.userId;
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
  
  if (!result?.session?.userId) {
    throw new Error('Unauthorized');
  }
  
  const creditResult = await CreditService.earnCredits(
    result.session.userId,
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
  
  if (!result?.session?.userId) {
    throw new Error('Unauthorized');
  }
  
  const creditResult = await CreditService.spendCredits(
    result.session.userId,
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
  });
  
  if (!result?.session?.userId) {
    throw new Error('Unauthorized');
  }
  
  return CreditService.getTransactionHistory(
    result.session.userId,
    limit,
    offset
  );
}

// Get credit summary
export async function getCreditSummary() {
  const result = await auth.api.getSession({
    headers: await headers()
  });
  
  if (!result?.session?.userId) {
    throw new Error('Unauthorized');
  }
  
  return CreditService.getCreditSummary(result.session.userId);
}
