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

    // API key check
    const apiKey = normalizedHeaders['x-api-key'];
    if (apiKey && apiKey === process.env.GITHUB_ACTIONS_API_KEY) {
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
