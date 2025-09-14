import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

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
].map(origin => origin.trim());

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
    return NextResponse.next();
  }

  try {
    // Get session using better-auth
    const session = await auth.api.getSession({
      headers: Object.fromEntries(request.headers.entries())
    });

    // If no session and it's an API route that requires auth
    if (!session?.user?.id && !isPublicPath && isApiRoute) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clone the request headers and add user info for API routes
    const requestHeaders = new Headers(request.headers);
    if (session?.user) {
      requestHeaders.set('x-user-id', session.user.id);
      if (session.user.role) {
        requestHeaders.set('x-user-role', session.user.role);
      }
    }

    // Create a new response with the new headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Set CORS headers for all responses
    const origin = request.headers.get('origin') || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
