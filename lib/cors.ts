import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Headers = {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Credentials'?: string;
};

export function setCorsHeaders(response: NextResponse, origin: string = '*') {
  const headers: Headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Only include credentials if not using wildcard
  if (origin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function handleOptions(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, origin);
}
