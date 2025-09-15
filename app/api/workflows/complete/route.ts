import { NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { books, workflowStatus } from '@/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/*
  POST /api/workflows/complete
  Body: { workflowId?: string, bookId: string, epubUrl: string }
  This endpoint is called by GitHub Actions after uploading the EPUB to R2.
*/
export async function POST(request: Request) {
  try {
    const { workflowId, bookId, epubUrl } = await request.json();

    if (!bookId || !epubUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, epubUrl' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update book.epubUrl
    await db
      .update(books)
      .set({ epubUrl, updatedAt: now })
      .where(eq(books.id, bookId));

    // Update workflow status if workflowId provided
    if (workflowId) {
      await db
        .update(workflowStatus)
        .set({
          status: 'completed',
          progress: 100,
          updatedAt: now,
          completedAt: now,
          result: { downloadUrl: epubUrl, epubUrl },
        })
        .where(eq(workflowStatus.id, workflowId));
    } else {
      // Fallback: mark the latest workflow for this book as completed
      await db
        .update(workflowStatus)
        .set({
          status: 'completed',
          progress: 100,
          updatedAt: now,
          completedAt: now,
          result: { downloadUrl: epubUrl, epubUrl },
        })
        .where(eq(workflowStatus.bookId, bookId));
    }

    return NextResponse.json({ success: true, epubUrl });
  } catch (error) {
    console.error('Error completing workflow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
