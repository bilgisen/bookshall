import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  
  try {
    const { user } = await auth();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    const body = await request.json();
    const { amount, reason, metadata = {} } = body;

    // Validate request body
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

    // Process the credit earning
    const success = await CreditService.earnCredits(
      userId,
      amount,
      reason,
      metadata as Record<string, string | number | boolean | null>
    );

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Failed to earn credits',
          code: 'EARN_CREDITS_ERROR'
        },
        { status: 400 }
      );
    }

    // Get updated balance
    const balance = await CreditService.getBalance(userId);

    return NextResponse.json({
      success: true,
      balance,
      earned: amount,
    });
  } catch (error) {
    console.error('Error in earn credits route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process credit transaction',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
