import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { books, chapters } from '@/db';
import { CreditService } from '@/lib/services/credit/credit.service';

// Define type for chapter update data
type ChapterUpdateData = Partial<{
  title: string;
  content: string;
  parentChapterId: string | null;
  order: number;
  level: number;
  wordCount: number;
  readingTime: number;
  updatedAt: Date;
}>;

// GET /api/books/by-id/[id]/chapters/[chapterId]
// Get a specific chapter by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { id: bookId, chapterId } = await params;
    
    if (!bookId || !chapterId) {
      return NextResponse.json(
        { error: 'Book ID and Chapter ID are required' },
        { status: 400 }
      );
    }

    // Verify the book exists and belongs to the user
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.id, bookId),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get the chapter
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, bookId)
        )
      )
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/books/by-id/[id]/chapters/[chapterId]
// Update a chapter
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    console.log('PATCH request received with params:', await params);
    
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      console.error('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { id: bookId, chapterId } = await params;
    
    if (!bookId || !chapterId) {
      return NextResponse.json(
        { error: 'Book ID and Chapter ID are required' },
        { status: 400 }
      );
    }

    // Verify the book exists and belongs to the user
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.id, bookId),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Verify the chapter exists and belongs to the book
    const [existingChapter] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, bookId)
        )
      )
      .limit(1);

    if (!existingChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: ChapterUpdateData = {
      updatedAt: new Date(),
    };

    // Only include fields that are provided in the request
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.parentChapterId !== undefined) updateData.parentChapterId = body.parentChapterId;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.wordCount !== undefined) updateData.wordCount = body.wordCount;
    if (body.readingTime !== undefined) updateData.readingTime = body.readingTime;

    // Update the chapter
    const [updatedChapter] = await db
      .update(chapters)
      .set(updateData)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, bookId)
        )
      )
      .returning();

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/books/by-id/[id]/chapters/[chapterId]
// Delete a chapter
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { id: bookId, chapterId } = await params;
    
    if (!bookId || !chapterId) {
      return NextResponse.json(
        { error: 'Book ID and Chapter ID are required' },
        { status: 400 }
      );
    }

    // Verify the book exists and belongs to the user
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.id, bookId),
          eq(books.userId, response.user.id)
        )
      )
      .limit(1);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Get the chapter first to ensure it exists
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, bookId)
        )
      )
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Delete the chapter
    await db
      .delete(chapters)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, bookId)
        )
      );

    // Refund the chapter creation cost (10 credits)
    await CreditService.earnCredits(
      response.user.id,
      10, // Hardcoded chapter creation cost
      'REFUND_CHAPTER_DELETION',
      { 
        bookId,
        chapterId,
        chapterTitle: chapter.title
      }
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}