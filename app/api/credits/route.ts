import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { CreditService } from '@/lib/services/credit';
import { handleServiceError } from '@/lib/services/credit/credit.utils';
import { z } from 'zod';

// Define the service error type with all required properties
interface ServiceError {
  message: string;
  name: string;
  code?: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

// Minimal type for better-auth session API
type SessionRes = { session?: { userId?: string } };

const earnCreditsSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).transform((val: unknown) => {
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

// GET /api/credits - Get user's credit balance and summary
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  try {
    const sessionRes = (await auth.api.getSession({ headers: request.headers })) as unknown as SessionRes;
    const userId = sessionRes.session?.userId;
    if (!userId) {
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
    
    const [balance, summary] = await Promise.all([
      CreditService.getBalanceWithDetails(String(userId)).catch(error => {
        console.error('Error getting balance:', error);
        throw new Error('Failed to retrieve balance');
      }),
      CreditService.getCreditSummary(String(userId)).catch(error => {
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
          userId: String(userId),
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
  } catch (error) {
    console.error('Error in GET /api/credits:', error);
    try {
      const errorResult = handleServiceError(error as Error, 'Failed to fetch credit information');
      
      // Create a properly typed error object
      const serviceError: ServiceError = {
        message: errorResult.message,
        name: errorResult.name || 'ServiceError',
        statusCode: 500 // Default status code
      };
      
      // Safely access optional properties using type guards
      const errorObj = errorResult as unknown as Record<string, unknown>;
      
      if (typeof errorObj.code === 'string') {
        serviceError.code = errorObj.code;
      }
      
      if (errorObj.details && typeof errorObj.details === 'object') {
        serviceError.details = errorObj.details as Record<string, unknown>;
      }
      
      if (typeof errorObj.statusCode === 'number') {
        serviceError.statusCode = errorObj.statusCode;
      }
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: serviceError.message,
          code: serviceError.code || 'INTERNAL_ERROR',
          details: serviceError.details
        }),
        { 
          status: serviceError.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    } catch (innerError) {
      console.error('Error handling service error:', innerError);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'An unexpected error occurred',
          code: 'INTERNAL_SERVER_ERROR'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
  }
}

// POST /api/credits/earn - Add credits to user's account
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  try {
    const sessionRes = (await auth.api.getSession({ headers: request.headers })) as unknown as SessionRes;
    const userId = sessionRes.session?.userId;
    if (!userId) {
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
    const result = await CreditService.earnCredits(String(userId), amount, reason, metadata);

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to process credit transaction',
          code: result.code || 'CREDIT_TRANSACTION_FAILED',
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
          userId: String(userId),
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
  } catch (error) {
    console.error('Error in POST /api/credits:', error);
    try {
      const errorResult = handleServiceError(error as Error, 'Failed to process credit transaction');
      
      // Create a properly typed error object
      const serviceError: ServiceError = {
        message: errorResult.message,
        name: errorResult.name || 'ServiceError',
        statusCode: 500 // Default status code
      };
      
      // Safely access optional properties using type guards
      const errorObj = errorResult as unknown as Record<string, unknown>;
      
      if (typeof errorObj.code === 'string') {
        serviceError.code = errorObj.code;
      }
      
      if (errorObj.details && typeof errorObj.details === 'object') {
        serviceError.details = errorObj.details as Record<string, unknown>;
      }
      
      if (typeof errorObj.statusCode === 'number') {
        serviceError.statusCode = errorObj.statusCode;
      }
      
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: serviceError.message,
          code: serviceError.code || 'INTERNAL_ERROR',
          details: serviceError.details
        }),
        { 
          status: serviceError.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    } catch (innerError) {
      console.error('Error handling service error:', innerError);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'An unexpected error occurred',
          code: 'INTERNAL_SERVER_ERROR'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
  }
}