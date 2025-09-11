// app/api/books/by-slug/[slug]/publish/epub/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { triggerEpubWorkflow, PublishOptions } from '@/lib/workflows/trigger-epub';

interface PublishRequest {
  options?: Partial<PublishOptions>;
  metadata?: Record<string, unknown>;
}

// Ensures the route is treated as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST handler for generating and providing an EPUB download link for a book.
 * @param request The incoming HTTP request.
 * @param context The context object containing route parameters.
 * @returns A JSON response with the download URL or an error message.
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Query the database for the specific book belonging to the user
    const book = await db.query.books.findFirst({
      where: (books, { and, eq }) =>
        and(eq(books.slug, slug), eq(books.userId, userId)),
      columns: {
        id: true,
        title: true,
        slug: true,
        author: true,
        description: true,
        coverImageUrl: true,
      },
      with: {
        chapters: {
          where: (chapters, { eq }) => eq(chapters.isDraft, false),
          orderBy: (chapters, { asc }) => [asc(chapters.order)],
          columns: {
            id: true,
            title: true,
            content: true,
            order: true,
            level: true,
            parentChapterId: true,
          },
        },
      },
    });

    // Handle case where book is not found or doesn't belong to the user
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { options = {}, metadata = {} } = (await request.json()) as PublishRequest;

    // Call the workflow function directly
    const result = await triggerEpubWorkflow({
      bookId: book.id,
      options: {
        includeMetadata: true,
        includeCover: true,
        includeTOC: true,
        tocLevel: 3,
        includeImprint: true,
        ...options,
      },
      metadata: {
        sessionId: session.session?.id || '',
        contentId: `book-${book.id}`,
        userId: session.user.id,
        bookTitle: book.title,
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      workflowId: result.workflowId,
      message: result.message,
      status: 'queued',
    }, { status: 202 });

  } catch (error) {
    console.error('EPUB generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate EPUB',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
