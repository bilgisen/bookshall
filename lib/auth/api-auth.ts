import { NextResponse } from 'next/server';
import { auth } from '../auth';

type AuthResult = 
  | { type: 'session'; userId: string }
  | { type: 'api-key' }
  | { type: 'unauthorized' };

/**
 * Authenticates a request using either session or API key
 * @param request The incoming request
 * @returns AuthResult indicating the authentication status
 */
export async function authenticateRequest(
  request: Request | { headers: Headers | Record<string, string> }
): Promise<AuthResult> {
  try {
    // Normalize headers to plain object (lowercased keys)
    const headersObj: Record<string, string> =
      request instanceof Request
        ? Object.fromEntries(request.headers.entries())
        : request.headers instanceof Headers
          ? Object.fromEntries(request.headers.entries())
          : request.headers;

    const normalizedHeaders = Object.fromEntries(
      Object.entries(headersObj).map(([k, v]) => [k.toLowerCase(), v])
    );

    // API key check with detailed logging
    const apiKey = headersObj['x-api-key'] || headersObj['X-API-Key'] || headersObj['x-api-key'];
    const expectedApiKey = process.env.BOOKSHALL_API_KEY;
    
    // Log all headers for debugging
    console.log('=== AUTHENTICATION DEBUG ===');
    console.log('All headers:', JSON.stringify(headersObj, null, 2));
    console.log('API Key from headers:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'Not provided');
    console.log('Expected API key:', expectedApiKey ? `${expectedApiKey.substring(0, 3)}...${expectedApiKey.substring(expectedApiKey.length - 3)}` : 'Not set');
    console.log('Environment:', process.env.NODE_ENV);
    
    if (!apiKey) {
      console.log('API key validation failed: No API key provided in headers');
    } else if (!expectedApiKey) {
      console.log('API key validation failed: BOOKSHALL_API_KEY is not set in environment');
    } else if (apiKey !== expectedApiKey) {
      console.log('API key validation failed: Key mismatch');
      console.log('  Expected length:', expectedApiKey.length);
      console.log('  Received length:', apiKey.length);
      console.log('  Expected first 5 chars:', expectedApiKey.substring(0, 5));
      console.log('  Received first 5 chars:', apiKey.substring(0, 5));
      console.log('  Expected last 5 chars:', expectedApiKey.substring(expectedApiKey.length - 5));
      console.log('  Received last 5 chars:', apiKey.substring(apiKey.length - 5));
    } else {
      console.log('API key validation successful');
      return { type: 'api-key' };
    }

    // Fallback to session auth
    const session = await auth.api.getSession({
      headers: new Headers(headersObj),
    });

    if (session?.user?.id) {
      return { type: 'session', userId: session.user.id };
    }
  } catch (error) {
    console.error('Authentication error:', error);
  }

  return { type: 'unauthorized' };
}

/**
 * Middleware to protect API routes with authentication
 */
type Handler = (req: Request, auth: AuthResult) => Promise<Response>;

export function withApiAuth(handler: Handler) {
  return async (request: Request) => {
    const authResult = await authenticateRequest(request);

    if (authResult.type === 'unauthorized') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    return handler(request, authResult);
  };
}

/**
 * Creates a query condition that enforces user ownership for session auth
 * @param authResult The authentication result
 * @param field The field to compare with user ID (default: 'userId')
 * @returns A condition that can be used in Drizzle queries
 */
export function withUserCondition<T extends Record<string, unknown>>(
  authResult: AuthResult,
  field: string = 'userId'
): Partial<T> | undefined {
  return authResult.type === 'session'
    ? { [field]: authResult.userId } as Partial<T>
    : undefined;
}
