import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get user session using better-auth
    type SessionRes = { session?: { userId?: string } };
    const sessionRes = (await auth.api.getSession({ headers: request.headers })) as unknown as SessionRes;
    const userId = sessionRes.session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 as number }
      );
    }
    
    // Get the user's balance
    const balance = await CreditService.getBalanceWithDetails(String(userId));
    
    // Return the balance in the response
    return NextResponse.json({
      success: true,
      data: balance
    });
    
  } catch (error) {
    console.error('Error getting balance:', error);
    const err = handleServiceError(error, 'Failed to get balance') as unknown as { message: string; code?: string; details?: unknown };
    
    return NextResponse.json(
      { 
        success: false,
        error: err.message,
        code: err.code || 'UNKNOWN_ERROR',
        details: err.details
      },
      { status: 500 as number }
    );
  }
}

// CORS preflight handler is now handled by middleware
