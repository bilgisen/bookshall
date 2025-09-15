import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { CreditService } from '@/lib/services/credit';
import { handleServiceError } from '@/lib/services/credit/credit.utils';
import { db } from '@/db/drizzle';
import { getTransactionById } from '@/lib/services/credit/credit.repository';

export const dynamic = 'force-dynamic';

const refundSchema = z.object({
  transactionId: z.string().uuid(),
  reason: z.string().optional().default('Refund'),
});

type SessionRes = { session?: { userId?: string } };

export async function POST(request: NextRequest) {
  try {
    const sessionRes = (await auth.api.getSession({ headers: request.headers })) as unknown as SessionRes;
    const userId = sessionRes.session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 as number }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parsed.error.format(),
        },
        { status: 400 as number }
      );
    }

    const { transactionId, reason } = parsed.data;

    // Ensure the transaction belongs to the authenticated user before refunding
    const original = await getTransactionById(db, transactionId);
    if (!original) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found',
          code: 'NOT_FOUND',
        },
        { status: 404 as number }
      );
    }
    if (String(original.userId) !== String(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN',
        },
        { status: 403 as number }
      );
    }

    const result = await CreditService.refundTransaction(transactionId, reason);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to process refund',
          code: result.code || 'REFUND_FAILED',
          details: result.details || {},
        },
        { status: 400 as number }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction: result.transaction,
        balance: result.balance,
        userId,
      },
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    const err = handleServiceError(error, 'Failed to process refund') as unknown as {
      message: string;
      code?: string;
      details?: unknown;
    };
    return NextResponse.json(
      { success: false, error: err.message, code: err.code || 'UNKNOWN_ERROR', details: err.details },
      { status: 500 as number }
    );
  }
}
