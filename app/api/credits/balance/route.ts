import { NextResponse } from 'next/server';
import { CreditService } from '@/lib/services/credit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get user ID from headers set by middleware
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the user's balance
    const balance = await CreditService.getBalanceWithDetails(userId);
    
    // Return the balance in the response
    return NextResponse.json({
      success: true,
      data: balance
    });
    
  } catch (error) {
    console.error('Error getting balance:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// CORS preflight handler is now handled by middleware
