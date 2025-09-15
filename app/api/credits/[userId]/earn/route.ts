import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

const earnCreditsSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().default(''),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).transform((val: unknown) => {
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

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const origin = request.headers.get('origin') || '';
  
  try {
    // Get the authenticated user session
    const sessionRes = await auth.api.getSession({ headers: request.headers });
    
    // Add type safety for session access
    const session = sessionRes?.session as { userId?: string; user?: { role?: string } } | undefined;
    if (!session?.userId) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    const currentUserId = session.userId;
    const userRole = session?.user?.role || 'user';
    
    // Only allow users to earn credits for themselves or admins to do it for others
    if (currentUserId !== userId && userRole !== 'admin') {
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN' 
        }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validation = earnCreditsSchema.safeParse(body);
    
    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: validation.error.format()
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const { amount, reason, metadata } = validation.data;
    const result = await CreditService.earnCredits(
      userId,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to earn credits',
          code: result.code || 'EARN_CREDITS_FAILED',
          details: result.details || {}
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          balance: result.balance,
          transaction: result.transaction,
          userId: userId,
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } catch (error: unknown) {
    console.error('Error earning credits:', error);
    
    // Proper error handling with type safety
    let serviceError: {
      message: string;
      name: string;
      code?: string;
      details?: unknown;
      statusCode?: number;
    };

    try {
      serviceError = handleServiceError(error, 'Failed to process credit earning');
    } catch {
      // Fallback error handling
      serviceError = {
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        name: 'Error',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : undefined,
        statusCode: 500
      };
    }
    
    // Safely extract properties that may not exist on standard Error objects
    const errorCode = serviceError.code || 'INTERNAL_SERVER_ERROR';
    const errorDetails = 'details' in serviceError ? serviceError.details : undefined;
    const statusCode = 'statusCode' in serviceError ? serviceError.statusCode : 500;

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: serviceError.message,
        code: errorCode,
        details: errorDetails
      }),
      { 
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}