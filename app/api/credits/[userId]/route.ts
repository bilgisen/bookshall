import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { CreditService, type CreditSummary, type TransactionHistoryResult } from '@/lib/services/credit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await the params promise
    const { userId } = await params;
    
    // Get the session using the request headers
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    const session = response;

    // Verify the user is authenticated and can access this data
    if (!session?.user?.id || session.user.id !== userId) {
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
      CreditService.getBalance(userId).catch(() => 0), // Return 0 if there's an error
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
