import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit/credit.service';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Await the params promise
  const { userId } = await params;
  try {
    // Get the session using the auth handler
    const session = await auth.handler(request);
    if (!session.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await session.json();

    // Only allow users to earn credits for themselves or admins to do it for others
    const isAdmin = user.role === 'admin';
    if (user.id !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const { amount, reason, metadata } = await request.json();
    
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

    // Add credits to user's account
    const result = await CreditService.earnCredits(
      userId,
      amount,
      reason,
      metadata as Record<string, string | number | boolean | null>
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to earn credits' },
        { status: 400 }
      );
    }

    // Get updated balance
    const newBalance = await CreditService.getBalance(userId);

    return NextResponse.json({
      success: true,
      balance: newBalance,
    });
  } catch (error) {
    console.error('Error earning credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
