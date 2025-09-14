import { NextResponse, NextRequest } from 'next/server';
import { CreditService } from '@/lib/services/credit';
import { getSessionUser } from '@/lib/auth/session-utils';

interface RouteParams {
  params: {
    userId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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
    
    // Only allow users to view their own balance or admins
    if (currentUserId !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN' 
        },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Get the balance using the main service
    const [balance, summary] = await Promise.all([
      CreditService.getBalanceWithDetails(userId),
      CreditService.getCreditSummary(userId)
    ]);

    return NextResponse.json(
      { 
        success: true,
        data: {
          balance,
          summary
        }
      },
      {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } catch (error) {
    console.error('Error getting credit balance:', error);
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

// Add OPTIONS handler for CORS preflight
// This is required for CORS with credentials
export const OPTIONS = async (request: Request) => {
  const origin = request.headers.get('origin') || '*';
  
  return new Response(null, {
    status: 204, // No Content
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
};
