import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { books, workflowStatus } from '@/db';
import { eq, and } from 'drizzle-orm';

type PublishOptions = {
  includeMetadata: boolean;
  includeCover: boolean;
  includeTOC: boolean;
  tocLevel: number;
};

type TriggerWorkflowRequest = {
  bookId: string;
  options: PublishOptions;
  metadata?: Record<string, unknown>;
};

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request
) {

  try {
    // Log request headers for debugging (excluding sensitive data)
    const headers = Object.fromEntries(request.headers.entries());
    const { cookie, authorization, ...safeHeaders } = headers;
    console.log('Request headers:', JSON.stringify(safeHeaders, null, 2));
    
    // Get session from request
    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: cookie || '',
        authorization: authorization || '',
      }),
    });
    
    console.log('Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
    });
    
    if (!session?.user) {
      console.error('Unauthorized: No valid user session');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'No valid user session found',
          requiresAuth: true,
          sessionPresent: !!session,
          headersPresent: {
            cookie: !!headers.cookie,
            authorization: !!headers.authorization,
          }
        },
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          } 
        }
      );
    }

    // Parse request body
    const body = (await request.json()) as TriggerWorkflowRequest;
    const { bookId, options, metadata = {} } = body;

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Verify book exists and user has access
    const book = await db.query.books.findFirst({
      where: and(
        eq(books.id, bookId),
        eq(books.userId, session.user.id)
      ),
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found or access denied' },
        { status: 404 }
      );
    }

    // Trigger CI process
    const ciUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ci/process`;
    console.log('Initiating CI process at:', ciUrl);
    
    try {
      const requestBody = {
        contentId: bookId,
        mode: 'epub',
        options,
        metadata: {
          userId: session.user?.id,
          sessionId: session.session?.id,
          bookTitle: book.title,
          ...metadata,
        },
      };

      console.log('Sending request to CI process:', {
        url: ciUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.token}`,
        },
        body: requestBody
      });

      const ciResponse = await fetch(ciUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!ciResponse.ok) {
        let errorText;
        try {
          const errorData = await ciResponse.json();
          errorText = JSON.stringify(errorData, null, 2);
        } catch (parseError: unknown) {
          errorText = await ciResponse.text().catch(() => 'Failed to extract error details');
          console.error('Error parsing CI response:', parseError);
        }
        
        console.error('CI Process Error:', {
          status: ciResponse.status,
          statusText: ciResponse.statusText,
          error: errorText,
          url: ciUrl,
          headers: Object.fromEntries(ciResponse.headers.entries())
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to trigger CI process',
            details: errorText,
            status: ciResponse.status
          },
          { status: 500 }
        );
      }

      let responseData;
      try {
        responseData = await ciResponse.json();
      } catch (e) {
        console.error('Failed to parse CI response:', e);
        return NextResponse.json(
          { error: 'Invalid response format from CI process' },
          { status: 500 }
        );
      }
      
      const workflowId = responseData.workflowId;
      if (!workflowId) {
        console.error('Invalid CI Process Response:', responseData);
        return NextResponse.json(
          { error: 'Invalid response from CI process: Missing workflowId' },
          { status: 500 }
        );
      }
      
      console.log('CI Process started successfully with workflowId:', workflowId);

      try {
        // Create a new workflow status record
        await db.insert(workflowStatus).values({
          bookId,
          workflowId,
          status: 'pending',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return NextResponse.json({
          workflowId,
          message: 'Ebook generation started',
        });
      } catch (dbError) {
        console.error('Database error in trigger-workflow:', dbError);
        // Still return success if DB fails but workflow was triggered
        return NextResponse.json({
          workflowId,
          message: 'Ebook generation started (workflow status not saved)',
          warning: 'Could not save workflow status to database'
        });
      }
    } catch (error: unknown) {
      console.error('Error triggering workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in trigger-workflow route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
