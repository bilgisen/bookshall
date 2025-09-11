import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Bypass any authentication middleware
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  
  // Get all environment variables (be careful with sensitive data in production)
  const envVars = {} as Record<string, string>;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.includes('API') || key.includes('KEY') || key.includes('AUTH') || key.includes('NODE')) {
      if (key === 'BOOKSHALL_API_KEY' && value) {
        envVars[key] = `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
      } else {
        envVars[key] = value || '';
      }
    }
  }

  const response = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiKey: {
      expected: 'W4XmILA4VtkcAdgr6B0tc6v',
      actual: process.env.BOOKSHALL_API_KEY || 'Not set',
      match: process.env.BOOKSHALL_API_KEY === 'W4XmILA4VtkcAdgr6B0tc6v',
      length: process.env.BOOKSHALL_API_KEY?.length || 0,
    },
    relevantEnvVars: envVars,
  };

  return new NextResponse(JSON.stringify(response, null, 2), { headers });
}
