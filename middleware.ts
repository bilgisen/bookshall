import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import type { User } from '@/db/schema';

// Use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

// Middleware configuration
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};

// List of paths that don't require authentication
const PUBLIC_PATHS = [
  '^/$',                    // Root path
  '^/sign-in',              // Sign in page
  '^/sign-up',              // Sign up page
  '^/auth/.*',             // Auth pages and callbacks
  '^/api/auth/.*',         // All auth API routes
  '^/api/health',          // Health check
  '^/api/hello',           // Test endpoint
  '^/api/books/by-id/.*/payload', // Public book payloads
  '^/api/chapters/.*/content',    // Public chapter content
  '^/api/books/by-slug/.*/cover', // Public book covers
];

// List of allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://bookshall.com',
  'https://www.bookshall.com'
];

/**
 * Middleware to handle authentication and CORS
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicPath = PUBLIC_PATHS.some(path => new RegExp(path).test(pathname));
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get('origin') || '';
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }
    return response;
  }

  // Skip authentication for public paths and non-API routes
  if (isPublicPath || !isApiRoute) {
    const response = NextResponse.next();
    
    // Set CORS headers for all responses
    const origin = request.headers.get('origin') || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return response;
  }

  try {
    // Create headers object compatible with better-auth
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      headers.append(key, value);
    });
    
    // Get session using better-auth
    const sessionResponse = await auth.api.getSession({
      headers: headers
    });
    
    // Type the user properly using the schema type
    const user = sessionResponse?.user as User | undefined;

    // If no session and it's an API route that requires auth
    if (!user?.id && !isPublicPath && isApiRoute) {
      const origin = getOrigin(request);
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }, null, 2),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
          } 
        }
      );
    }

    // Clone the request headers and add user info for API routes
    const requestHeaders = new Headers(request.headers);
    if (user?.id) {
      requestHeaders.set('x-user-id', user.id);
      // Access role with proper typing
      if ('role' in user && typeof user.role === 'string') {
        requestHeaders.set('x-user-role', user.role);
      }
    }

    // Create a new response with the new headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Set CORS headers for all responses
    const origin = getOrigin(request);
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    const origin = getOrigin(request);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }, null, 2),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        } 
      }
    );
  }
}

// Helper function to get origin
function getOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}