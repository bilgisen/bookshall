import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { books, chapters } from '@/db';

// GET /api/books/by-id/[id]/chapters
// Get all chapters for a book by book ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params promise
  const { id } = await params;
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

    const { id: bookId } = await params;
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
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

    // Get all chapters for the book
    const allChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(chapters.order);

    return NextResponse.json(allChapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/books/by-id/[id]/chapters
// Create a new chapter for a book
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params promise
  const { id } = await params;
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

    const { id: bookId } = await params;
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
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
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create the chapter
    const [newChapter] = await db
      .insert(chapters)
      .values({
        bookId,
        title: body.title,
        content: body.content || '',
        parentChapterId: body.parentChapterId || null,
        order: body.order || 0,
        level: body.level || 1,
        wordCount: body.wordCount || 0,
        readingTime: body.readingTime || null,
        uuid: body.uuid || crypto.randomUUID(),
      })
      .returning();

    return NextResponse.json(newChapter, { status: 201 });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
