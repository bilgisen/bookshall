import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';

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
    const session = await auth.handler(request);
    if (!session.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await session.json();
    const body = await request.json();
    const validation = spendSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { amount, reason, metadata } = validation.data;
    const result = await CreditService.spendCredits(
      user.id,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to spend credits',
          code: result.error === 'Insufficient balance' ? 'INSUFFICIENT_BALANCE' : 'TRANSACTION_FAILED'
        },
        { 
          status: result.error === 'Insufficient balance' ? 402 : 400 
        }
      );
    }

    return NextResponse.json({
      success: true,
      balance: await CreditService.getBalance(userId),
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('Error spending credits:', error);
    return NextResponse.json(
      { error: 'Failed to process credit transaction' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
