import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { books, chapters } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper function to build the where clause
const whereClause = (id: string, userId: string) => {
  return and(
    eq(books.id, id), // No need to parse UUID as number
    eq(books.userId, userId)
  );
};

/**
 * GET /api/books/by-id/[id]
 * Get a book by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const book = await db.query.books.findFirst({
      where: whereClause(id, response.user.id),
      columns: {
        id: true,
        userId: true,
        title: true,
        slug: true,
        author: true,
        publisher: true,
        description: true,
        coverImageUrl: true,
        epubUrl: true,
        subtitle: true,
        publisherWebsite: true,
        publishYear: true,
        isbn: true,
        contributor: true,
        translator: true,
        genre: true,
        series: true,
        seriesIndex: true,
        tags: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Error getting book:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/books/by-id/[id]
 * Update a book by ID
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      title, 
      author, 
      publisher, 
      description, 
      coverImageUrl, 
      slug,
      subtitle,
      publisherWebsite,
      publishYear,
      isbn,
      contributor,
      translator,
      genre,
      series,
      seriesIndex,
      tags,
      language,
      epubUrl
    } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Title and author are required' }, 
        { status: 400 }
      );
    }

    const [updatedBook] = await db
      .update(books)
      .set({
        title,
        author,
        publisher,
        description,
        coverImageUrl,
        slug,
        subtitle,
        publisherWebsite,
        publishYear: publishYear ? parseInt(publishYear, 10) : null,
        isbn,
        contributor,
        translator,
        genre,
        series,
        seriesIndex: seriesIndex ? parseInt(seriesIndex, 10) : null,
        tags: Array.isArray(tags) ? tags : [],
        language: language || 'tr',
        epubUrl,
        updatedAt: new Date()
      })
      .where(whereClause(id, response.user.id))
      .returning();

    if (!updatedBook) {
      return NextResponse.json(
        { error: 'Book not found or not authorized' }, 
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/books/by-id/[id]
 * Delete a book by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // First delete all chapters for this book
      await tx.delete(chapters).where(eq(chapters.bookId, id));
      // Then delete the book
      await tx.delete(books).where(
        whereClause(id, response.user.id)
      );
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }, 
      { status: 500 }
    );
  }
}
