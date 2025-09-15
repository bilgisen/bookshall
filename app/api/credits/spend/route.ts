import { NextResponse, type NextRequest } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

const spendSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().default(''),
  metadata: z.any().transform((val) => {
    // Ensure metadata only contains string, number, boolean, or null values
    if (typeof val !== 'object' || val === null) return {};
    
    const result: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(val)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        result[key] = value;
      }
    }
    return result;
  }).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    const sessionRes = await auth.api.getSession({ headers: await nextHeaders() });
    const userId = sessionRes?.session?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 as number }
      );
    }
    
    const body = await request.json();
    const validation = spendSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body',
          code: 'INVALID_REQUEST',
          details: validation.error.format() 
        },
        { status: 400 as number }
      );
    }

    const { amount, reason, metadata } = validation.data;
    const result = await CreditService.spendCredits(String(userId), amount, reason, metadata);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to spend credits',
          code: result.code || 'TRANSACTION_FAILED',
          details: result.details
        },
        { status: result.code === 'INSUFFICIENT_CREDITS' ? 402 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: result.balance,
        transaction: result.transaction,
        userId: String(userId),
      }
    });
  } catch (error) {
    console.error('Error spending credits:', error);
    const err = handleServiceError(error, 'Failed to process credit transaction') as unknown as { message: string; name: string; code?: string; details?: unknown };
    
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

export const dynamic = 'force-dynamic';
