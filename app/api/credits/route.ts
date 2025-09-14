import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit';

// GET /api/credits - Get user's credit balance and summary
export async function GET(request: NextRequest) {
  try {
    const session = await auth.handler(request);
    if (!session.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const user = await session.json();
    const balance = await CreditService.getBalanceWithDetails(user.id);
    const summary = await CreditService.getCreditSummary(user.id);

    return NextResponse.json({
      balance,
      summary,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}

// POST /api/credits/earn - Add credits to user's account
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
    const { amount, reason, metadata } = await request.json();
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const result = await CreditService.earnCredits(
      user.id,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error earning credits:', error);
    return NextResponse.json(
      { error: 'Failed to process credit transaction' },
      { status: 500 }
    );
  }
}
