import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import type { CreditSummary, TransactionHistoryResult } from '@/lib/services/credit/credit.types';
import { getSessionUser } from '@/lib/auth/session-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    // Get the authenticated user
    const { user, errorResponse } = await getSessionUser(request);
    if (!user || errorResponse) {
      return errorResponse || new NextResponse('Unauthorized', { status: 401 });
    }
    
    const currentUserId = user.id;
    const userRole = user.role;

    // Verify the user is authenticated and can access this data
    if (!currentUserId || (currentUserId !== userId && userRole !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for pagination and date filtering
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get balance, transaction history, and summary in parallel
    const [balance, history, summary] = await Promise.all([
      CreditService.getBalance(userId).catch(() => 0),
      CreditService.getTransactionHistory(userId, limit, offset)
        .catch((error) => {
          console.error('Error getting transaction history:', error);
          return {
            transactions: [],
            pagination: { total: 0, limit, offset, hasMore: false }
          };
        }) as Promise<TransactionHistoryResult>,
      CreditService.getCreditSummary(userId)
        .catch((error) => {
          console.error('Error getting credit summary:', error);
          return { earned: 0, spent: 0 } as CreditSummary;
        })
    ]);

    return NextResponse.json({
      balance,
      summary,
      transactions: history.transactions || [],
      pagination: {
        total: history.pagination?.total || 0,
        limit: history.pagination?.limit || limit,
        offset: history.pagination?.offset || offset,
        hasMore: history.pagination?.hasMore || false,
      },
    });
  } catch (error) {
    console.error('Error in credits API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}