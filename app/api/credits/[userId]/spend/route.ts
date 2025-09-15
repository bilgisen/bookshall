import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

// Zod schema for request validation
const spendCreditsSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
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

// The actual implementation
async function spendCredits(
  request: NextRequest,
  params: { userId: string }
): Promise<NextResponse> {
  const { userId } = params;
  const origin = request.headers.get('origin') || '';

  try {
    // Get the authenticated user session using better-auth
    const sessionRes = await auth.api.getSession({ headers: request.headers });
    // Add proper type safety for session access
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
    // Add proper type safety for user role access
    const userRole = session?.user?.role || 'user';

    // Only allow users to spend their own credits or admins
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
    const validation = spendCreditsSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Validation error',
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

    try {
      const { amount, reason, metadata = {} } = validation.data;
      const spendResult = await CreditService.spendCredits(
        userId,
        amount,
        reason,
        metadata
      );

      if (!spendResult.success) {
        // Properly handle the details property type
        let details: Record<string, unknown> | undefined = undefined;
        if ('details' in spendResult && spendResult.details) {
          if (typeof spendResult.details === 'object' && spendResult.details !== null) {
            details = spendResult.details as Record<string, unknown>;
          } else if (typeof spendResult.details === 'string') {
            details = { message: spendResult.details };
          } else {
            details = { value: spendResult.details };
          }
        }

        const errorResponse = {
          success: false,
          error: 'error' in spendResult ? String(spendResult.error) : 'Failed to spend credits',
          code: 'code' in spendResult && spendResult.code ? String(spendResult.code) : 'TRANSACTION_FAILED',
          ...(details ? { details } : {})
        };

        return NextResponse.json(errorResponse, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        balance: spendResult.balance,
        spent: amount,
        transactionId: spendResult.transaction?.id,
      }, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      });
    } catch (error) {
      console.error('Error in spendCredits:', error);
      // Proper error handling with type safety
      let serviceError: {
        message: string;
        name: string;
        code?: string;
        details?: unknown;
        statusCode?: number;
      };

      try {
        serviceError = handleServiceError(error, 'Failed to process credit spend');
      } catch {
        // Fallback error handling
        serviceError = {
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          name: 'Error',
          code: 'INTERNAL_ERROR',
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500
        };
      }
      
      // Safely extract properties that may not exist on standard Error objects
      const errorCode = serviceError.code || 'INTERNAL_ERROR';
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
  } catch (error) {
    console.error('Unexpected error in spendCredits:', error);
    // Proper error handling with type safety
    let serviceError: {
      message: string;
      name: string;
      code?: string;
      details?: unknown;
      statusCode?: number;
    };

    try {
      serviceError = handleServiceError(error, 'An unexpected error occurred');
    } catch {
      // Fallback error handling
      serviceError = {
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        name: 'Error',
        code: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : undefined,
        statusCode: 500
      };
    }
    
    // Safely extract properties that may not exist on standard Error objects
    const errorCode = serviceError.code || 'UNEXPECTED_ERROR';
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

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  return spendCredits(request, params);
}