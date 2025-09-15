import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { handleServiceError } from '@/lib/services/credit/credit.utils';
import { z } from 'zod';

// Zod schema for query parameters
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const origin = request.headers.get('origin') || '';
  
  try {
    // Get the authenticated user session
    const sessionRes = await auth.api.getSession({ headers: request.headers });
    // Proper typing without 'any'
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

    // Verify the user is authorized to access this data
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };
    
    const validation = querySchema.safeParse(queryParams);
    if (!validation.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid query parameters',
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
    
    const { limit, offset } = validation.data;

    // Get balance, transaction history, and summary in parallel
    const [balance, history, summary] = await Promise.all([
      CreditService.getBalanceWithDetails(userId).catch((error) => {
        console.error('Error getting balance:', error);
        throw new Error('Failed to retrieve balance');
      }),
      // Pass options as a single object with userId, limit, and offset
      CreditService.getTransactionHistory({
        userId,
        limit,
        offset
      }).catch((error) => {
        console.error('Error getting transaction history:', error);
        throw new Error('Failed to retrieve transaction history');
      }),
      CreditService.getCreditSummary(userId).catch((error) => {
        console.error('Error getting credit summary:', error);
        throw new Error('Failed to retrieve credit summary');
      })
    ]);

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          balance: balance,
          summary: summary,
          transactions: history.transactions || [],
          pagination: {
            total: history.pagination?.total || 0,
            limit: history.pagination?.limit || limit,
            offset: history.pagination?.offset || offset,
            hasMore: history.pagination?.hasMore || false,
          },
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
    console.error('Error in credits API:', error);
    // Proper error handling without 'any'
    let serviceError: {
      message: string;
      name: string;
      code?: string;
      details?: unknown;
      statusCode?: number;
    };

    try {
      serviceError = handleServiceError(error, 'Failed to retrieve credit information');
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