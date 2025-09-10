import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit.service';
import type { NextRequest } from 'next/server';

// Define the request body type
interface SpendCreditsRequest {
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Await the params promise
  const { userId } = await params;
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    const session = response;
    
    const body: SpendCreditsRequest = await request.json();
    const { amount, reason, metadata = {} } = body;

    // Verify the user is authenticated and can spend credits
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    try {
      // Attempt to spend credits
      const success = await CreditService.spendCredits(
        userId,
        amount,
        reason,
        metadata
      );

      if (!success) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits',
            code: 'INSUFFICIENT_CREDITS'
          },
          { status: 400 }
        );
      }

      // Get updated balance
      const balance = await CreditService.getBalance(userId);

      return NextResponse.json({
        success: true,
        balance,
        spent: amount,
      });
    } catch (error) {
      console.error('Error in spend credits service:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process credit spend',
          code: 'SPEND_CREDITS_ERROR'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error spending credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
