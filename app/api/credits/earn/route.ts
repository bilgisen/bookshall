// /Users/regalstand/bookshall/app/api/credits/[userId]/balance/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handleServiceError } from '@/lib/services/credit/credit.utils';

const earnSchema = z.object({
  amount: z.coerce.number().int().positive(),
  reason: z.string().default(''),
  metadata: z
    .record(z.string(), z.unknown())
    .transform((val: unknown): Record<string, unknown> => {
      // Ensure metadata only contains string, number, boolean, or null values
      if (typeof val !== 'object' || val === null) return {};

      const result: Record<string, string | number | boolean | null> = {};
      for (const [key, value] of Object.entries(val)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        }
      }
      return result;
    })
    .optional()
    .default({}),
});

export async function POST(request: NextRequest) {
  try {
    // Get session with proper typing
    const sessionRes = await auth.api.getSession({
      headers: request.headers
    }) as { session?: { userId?: string } };
    
    const userId = sessionRes?.session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = earnSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'INVALID_REQUEST',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { amount, reason, metadata } = validation.data;
    const result = await CreditService.earnCredits(
      String(userId),
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to earn credits',
          code: result.code || 'EARN_CREDITS_ERROR',
          details: result.details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: result.balance,
        transaction: result.transaction,
        userId: String(userId),
      }
    });
  } catch (error: unknown) {
    console.error('Error in earn credits route:', error);

    // Fix: Properly handle the error object
    let serviceError: {
      message: string;
      name: string;
      code?: string;
      details?: Record<string, unknown>;
      statusCode?: number;
    };

    if (error instanceof Error) {
      // If it's a standard Error, wrap it
      serviceError = {
        message: error.message,
        name: error.name,
        code: 'UNKNOWN_ERROR',
details: { error: error.message }
      };
    } else if (typeof error === 'object' && error !== null) {
      // If it's a custom error object, extract known properties
      serviceError = {
        message: 'An error occurred',
        name: 'Error',
        code: 'UNKNOWN_ERROR',
        details: undefined,
        statusCode: undefined,
        ...error
      };
    } else {
      // Fallback for other types
      serviceError = {
        message: String(error),
        name: 'Error',
        code: 'UNKNOWN_ERROR'
      };
    }

    // Use handleServiceError if available and appropriate
    try {
      const handledError = handleServiceError(error, 'Failed to process credit earning');
      serviceError = {
        message: handledError.message,
        name: handledError.name,
        code: 'code' in handledError ? String(handledError.code) : 'UNKNOWN_ERROR',
details: 'details' in handledError ? (handledError.details as Record<string, unknown> | undefined) : undefined,
        statusCode: 'statusCode' in handledError ? Number(handledError.statusCode) : 500
      };
    } catch (err) {
      // If handleServiceError fails, use the basic error handling above
      console.error('Error in handleServiceError:', err);
    }

    // Safely extract properties
    const errorCode = serviceError.code || 'UNKNOWN_ERROR';
    const errorDetails = 'details' in serviceError ? serviceError.details : undefined;
    const statusCode = 'statusCode' in serviceError ? serviceError.statusCode : 500;

    return NextResponse.json(
      {
        success: false,
        error: serviceError.message,
        code: errorCode,
        details: errorDetails
      },
      { status: typeof statusCode === 'number' ? statusCode : 500 }
    );
  }
}

export const dynamic = 'force-dynamic';