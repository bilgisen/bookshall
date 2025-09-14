import { NextResponse } from 'next/server';
import { db } from '@/lib/db/edge-client';

export const runtime = 'edge';

export async function GET() {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT 1 as test`);
    
    return NextResponse.json({
      success: true,
      message: 'Edge Runtime is working!',
      database: 'Connection successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Edge test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Edge Runtime test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
