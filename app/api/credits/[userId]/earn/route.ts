import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit.service';

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    const { userId } = params;

    // Verify the user is authenticated and has permission to earn credits
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow users to earn credits for themselves or admins to do it for others
    const isAdmin = session.user.role === 'admin';
    if (session.user.id !== userId && !isAdmin) {
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
    await CreditService.earnCredits(
      userId,
      amount,
      reason,
      metadata
    );

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
