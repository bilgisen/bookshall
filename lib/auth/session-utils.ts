import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionUser {
  id: string;
  role?: string;
  [key: string]: unknown;
}

export interface SessionData {
  user: SessionUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function getSessionUser(request: NextRequest): Promise<{ user: SessionUser | null; errorResponse?: NextResponse }> {
  try {
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      headers.append(key, value);
    });

    const sessionData = await auth.api.getSession({
      headers,
      query: { disableCookieCache: false }
    });

    if (!sessionData?.user?.id) {
      return { user: null, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })};
    }

    return { user: sessionData.user };
  } catch (error) {
    console.error('Error getting session:', error);
    return { 
      user: null, 
      errorResponse: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}
