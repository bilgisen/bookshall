import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userBalances } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const userId = 'gDGJnnBuY2AMfDksLSENhjrbzPcX0KTW';
    
    // Get balance directly from database
    const result = await db
      .select({
        balance: userBalances.balance,
        updatedAt: userBalances.updatedAt
      })
      .from(userBalances)
      .where(eq(userBalances.userId, userId));
    
    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No balance record found',
        userId
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      balance: result[0].balance,
      lastUpdated: result[0].updatedAt,
      userId
    });
    
  } catch (error) {
    console.error('Error in test balance endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Ensure this route is always revalidated
export const dynamic = 'force-dynamic';
