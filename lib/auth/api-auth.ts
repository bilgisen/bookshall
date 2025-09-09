import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
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
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // Check API key first
  const headersList = await headers();
  const apiKey = headersList.get('x-api-key');
  if (apiKey && apiKey === process.env.GITHUB_ACTIONS_API_KEY) {
    return { type: 'api-key' };
  }

  // Fall back to session auth
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (session?.user?.id) {
      return { type: 'session', userId: session.user.id };
    }
  } catch (error) {
    console.error('Session auth error:', error);
  }

  return { type: 'unauthorized' };
}

/**
 * Middleware to protect API routes with authentication
 */
type Handler = (req: Request, userId?: string) => Promise<Response>;

export function withApiAuth(handler: Handler) {
  return async (request: Request) => {
    const authResult = await authenticateRequest(request);
    
    if (authResult.type === 'unauthorized') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Pass the user ID if available (for session auth)
    const userId = authResult.type === 'session' ? authResult.userId : undefined;
    return handler(request, userId);
  };
}

/**
 * Creates a query condition that enforces user ownership for session auth
 * @param authResult The authentication result
 * @param field The field to compare with user ID (default: 'userId')
 * @returns A condition that can be used in Drizzle queries
 */
export function withUserCondition<T = unknown>(
  authResult: AuthResult,
  field: string = 'userId'
): T | undefined {
  return authResult.type === 'session' ? 
    { [field]: authResult.userId } as unknown as T : 
    undefined;
}
