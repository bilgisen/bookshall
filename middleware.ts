import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// List of allowed origins (add your frontend URLs here)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://bookshall.com',
  'https://www.bookshall.com',
  
  // Add production domains here
];

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    return response;
  }

  // Add CORS headers to all API responses
  const response = NextResponse.next();
  
  if (pathname.startsWith('/api/')) {
    addCorsHeaders(response, origin);
  }

  // /api/payments/webhooks is a webhook endpoint that should be accessible without authentication
  if (pathname.startsWith("/api/payments/webhooks")) {
    return response;
  }

  if (sessionCookie && ["/sign-in", "/sign-up"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return response;
}

function addCorsHeaders(response: NextResponse, origin: string) {
  // Check if the origin is allowed or use a default
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Only allow credentials for specific origins (not using wildcard)
  if (allowedOrigin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/sign-in',
    '/sign-up'
  ],
};
