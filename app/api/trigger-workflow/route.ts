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
  includeImprint: boolean;
};

type TriggerWorkflowRequest = {
  bookId: string;
  options: PublishOptions;
  metadata?: Record<string, unknown>;
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
    const ciResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ci/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.token}`,
      },
      body: JSON.stringify({
        contentId: bookId,
        mode: 'epub',
        options,
        metadata: {
          ...metadata,
          bookTitle: book.title,
        },
      }),
    });

    if (!ciResponse.ok) {
      const error = await ciResponse.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to trigger CI process');
    }

    const { workflowId } = await ciResponse.json();

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
      success: true,
      workflowId,
      message: 'Ebook generation started',
    });

  } catch (error) {
    console.error('Error triggering workflow:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
