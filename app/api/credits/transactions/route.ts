import { NextResponse, type NextRequest } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

const transactionSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    type SessionRes = { session?: { userId?: string } };
    const sessionRes = (await auth.api.getSession({ headers: await nextHeaders() })) as unknown as SessionRes;
    const userId = sessionRes.session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 as number }
      );
    }

    const { searchParams } = new URL(request.url);
    // If limit is 0 or missing, return empty result gracefully
    const rawLimit = Number(searchParams.get('limit') ?? '0');
    const rawOffset = Number(searchParams.get('offset') ?? '0');
    if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: { total: 0, limit: 0, offset: 0 },
      });
    }
    const params = transactionSchema.parse({
      limit: rawLimit,
      offset: rawOffset,
    });

    const result = await CreditService.getTransactionHistory({
      userId: String(userId),
      limit: params.limit,
      offset: params.offset
    });

    return NextResponse.json({
      success: true,
      transactions: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
          details: error.issues 
        },
        { status: 400 as number }
      );
    }
    
    const serviceError = handleServiceError(error, 'Failed to fetch transactions') as unknown as { message: string; code?: string; details?: unknown; name: string };
    return NextResponse.json(
      { 
        success: false,
        error: serviceError.message,
        code: serviceError.code || 'UNKNOWN_ERROR',
        details: serviceError.details
      },
      { status: 500 as number }
    );
  }
}

export const dynamic = 'force-dynamic';
