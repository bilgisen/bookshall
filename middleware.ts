import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Use Node.js runtime instead of Edge Runtime
export const runtime = 'nodejs';

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
  '^/api/chapters/.*/html',    // Public chapter HTML content
  '^/api/books/by-slug/.*/cover', // Public book covers
  '^/api/ci/process',       // Internal CI trigger
  '^/api/workflows/complete', // Workflow completion callback
  '^/api/payments/webhooks', // Payment webhooks
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
 * Sets CORS headers on the response
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(path => new RegExp(path).test(pathname));
  const sessionCookie = getSessionCookie(request);
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(request, response);
  }

  // Skip authentication for public paths
  if (isPublicPath) {
    const response = NextResponse.next();
    return setCorsHeaders(request, response);
  }

  // Handle authentication for protected routes
  if (sessionCookie) {
    // If user is authenticated but tries to access auth pages, redirect to dashboard
    if (['/sign-in', '/sign-up'].includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Continue with the request for authenticated users
    const response = NextResponse.next();
    return setCorsHeaders(request, response);
  }

  // Handle unauthenticated requests to protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
    if (pathname.startsWith('/api')) {
      const response = new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      return setCorsHeaders(request, response);
    }
    
    // For non-API routes, redirect to sign-in
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // For all other cases, continue with the request
  const response = NextResponse.next();
  return setCorsHeaders(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};