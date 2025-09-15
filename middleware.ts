import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

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
  '^/api/chapters/.*/html',    // Public chapter HTML content for Pandoc
  '^/api/books/by-slug/.*/cover', // Public book covers
  '^/api/ci/process',       // Internal CI trigger (already auth-checked upstream)
  '^/api/workflows/complete', // Workflow completion callback from GitHub Actions
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

  // Skip authentication for public paths
  if (isPublicPath) {
    const response = NextResponse.next();
    setCorsHeaders(request, response);
    return response;
  }

  // Check for session cookie (lightweight check)
  const sessionCookie = getSessionCookie(request);
  
  // For API routes
  if (isApiRoute) {
    if (!sessionCookie) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      setCorsHeaders(request, response);
      return response;
    }
    
    const response = NextResponse.next();
    setCorsHeaders(request, response);
    return response;
  }

  // For page routes, redirect to sign-in if no session cookie
  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Session cookie exists, proceed with the request
  const response = NextResponse.next();
  setCorsHeaders(request, response);
  return response;
}

/**
 * Helper function to set CORS headers
 */
function setCorsHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}
