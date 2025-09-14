import { NextRequest, NextResponse } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session-utils';

interface ErrorWithDetails extends Error {
  details?: Record<string, unknown>;
  code?: string;
}

// Zod schema for request validation
const spendCreditsSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// The actual implementation
async function spendCredits(
  request: NextRequest,
  params: { userId: string }
): Promise<NextResponse> {
  const { userId } = params;
  const origin = request.headers.get('origin') || '';

  try {
    // Get the authenticated user
    const { user, errorResponse } = await getSessionUser(request);
    if (!user || errorResponse) {
      return errorResponse || new NextResponse('Unauthorized', { status: 401 });
    }
    
    const currentUserId = user.id;
    const userRole = user.role;

    // Only allow users to spend their own credits or admins
    if (currentUserId !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED' 
        },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = spendCreditsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: validation.error.format() 
        },
        { 
          status: 400,
          headers: {
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
        const errorResponse: {
          success: false;
          error: string;
          code: string;
          details?: Record<string, unknown>;
        } = {
          success: false,
          error: 'error' in spendResult ? String(spendResult.error) : 'Failed to spend credits',
          code: 'TRANSACTION_FAILED',
          details: {}
        };

        if (spendResult && typeof spendResult === 'object') {
          if ('code' in spendResult && spendResult.code) {
            errorResponse.code = String(spendResult.code);
          }

          if ('details' in spendResult && spendResult.details && 
              typeof spendResult.details === 'object' && spendResult.details !== null) {
            // Fix: Create a new object instead of spreading potentially non-object types
            errorResponse.details = Object.assign({}, spendResult.details);
          }
        }

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
      console.error('Error spending credits:', error);

      if (error instanceof Error) {
        const typedError = error as ErrorWithDetails;

        if (error.name === 'InsufficientCreditsError' || error.name === 'InvalidAmountError') {
          return NextResponse.json(
            { 
              success: false,
              error: error.message,
              code: error.name,
              details: typedError.details
            },
            { 
              status: 400,
              headers: {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Credentials': 'true',
              }
            }
          );
        }
      }

      return NextResponse.json(
        { 
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR'
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in spendCredits:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  return spendCredits(request, params);
}