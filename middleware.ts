import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// List of allowed origins (add your frontend URLs here)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://bookshall.com',
  'https://www.bookshall.com',
];

// List of paths that should always be allowed for CORS
const PUBLIC_PATHS = [
  '/api/auth/sign-in/social',
  '/api/auth/callback/google',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/auth/get-session',
  '/api/ci/process',
];

// List of paths that don't require authentication
const PUBLIC_API_PATHS = [
  '/api/health',
  '/api/hello',
];

// List of paths that require authentication but have custom handling
const AUTH_REQUIRED_PATHS = [
  '/api/trigger-workflow',
  '/api/books',
];

// Function to normalize origin by ensuring consistent www/non-www usage
function normalizeOrigin(origin: string): string {
  if (!origin) return '';
  try {
    const url = new URL(origin);
    // Convert all to non-www for consistency
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.replace('www.', '');
    }
    return url.toString().replace(/\/$/, ''); // Remove trailing slash if any
  } catch (error) {
    console.error('Invalid origin URL:', origin);
    return '';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const normalizedOrigin = normalizeOrigin(origin);
  
  // Handle CORS for all API routes
  if (pathname.startsWith('/api/')) {
    // Create a response object
    const response = NextResponse.next();
    
    // Add CORS headers
    if (normalizedOrigin && ALLOWED_ORIGINS.some(o => o === normalizedOrigin || o === origin)) {
      response.headers.set('Access-Control-Allow-Origin', normalizedOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      response.headers.set(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
      );
    }
    
    // Add CORS headers if the origin is allowed
    if (ALLOWED_ORIGINS.some(o => normalizeOrigin(o) === normalizedOrigin)) {
      response.headers.set('Access-Control-Allow-Origin', normalizedOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
    
    // Skip authentication for public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || 
        PUBLIC_API_PATHS.some(p => pathname === p)) {
      return response;
    }
    
    // Check for authenticated session
    const session = await getSessionCookie(request);
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return response;
  }
  
  // Handle dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const session = await getSessionCookie(request);
    
    // Redirect to login if not authenticated
    if (!session) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

function addCorsHeaders(response: NextResponse, origin: string): void {
  // Normalize the origin for consistent comparison
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowedOrigins = ALLOWED_ORIGINS.map(o => normalizeOrigin(o));
  
  // Check if the normalized origin is in the allowed list
  const isAllowed = normalizedAllowedOrigins.includes(normalizedOrigin);
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up',
    '/api/auth/:path*'
  ],
};
