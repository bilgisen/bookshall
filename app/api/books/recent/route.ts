import { db } from '@/db/drizzle';
import { books, chapters } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the most recent book with its most recent chapter
    const bookWithChapter = await db.query.books.findFirst({
      orderBy: [desc(books.createdAt)],
      with: {
        chapters: {
          orderBy: [desc(chapters.createdAt)],
          limit: 1,
        },
      },
    });

    if (!bookWithChapter || !bookWithChapter.chapters?.[0]) {
      return NextResponse.json(
        { error: 'No books with chapters found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      book: {
        id: bookWithChapter.id,
        title: bookWithChapter.title,
        slug: bookWithChapter.slug,
      },
      chapter: {
        id: bookWithChapter.chapters[0].id,
        title: bookWithChapter.chapters[0].title,
      },
    });
  } catch (error) {
    console.error('Error getting recent book and chapter:', error);
    return NextResponse.json(
      { error: 'Failed to get recent book and chapter' },
      { status: 500 }
    );
  }
}

// This is a one-time setup endpoint to create a test book and chapter
// It's only for development/testing purposes
export async function POST() {
  try {
    // Check if we already have test data
    const existingTestBook = await db.query.books.findFirst({
      where: (books, { like }) => like(books.title, 'Test Book%'),
      with: {
        chapters: {
          limit: 1,
        },
      },
    });

    if (existingTestBook) {
      return NextResponse.json({
        success: true,
        message: 'Test data already exists',
        bookId: existingTestBook.id,
        chapterId: existingTestBook.chapters?.[0]?.id,
      });
    }

    // Create a test book
    const [book] = await db
      .insert(books)
      .values({
        userId: 'test-user-id', // This will be replaced by the actual user ID in the real app
        title: 'Test Book',
        slug: `test-book-${Date.now()}`,
        author: 'Test Author',
        isPublished: true,
      })
      .returning();

    // Create a test chapter
    const [chapter] = await db
      .insert(chapters)
      .values({
        bookId: book.id,
        title: 'Test Chapter',
        content: JSON.stringify([
          {
            type: 'heading',
            children: [{ text: 'Welcome to the Test Chapter' }],
          },
          {
            type: 'paragraph',
            children: [
              { text: 'This is a test chapter with some ' },
              { text: 'formatted', bold: true },
              { text: ' content.' },
            ],
          },
        ]),
        order: 1,
        level: 1,
        isDraft: false,
        wordCount: 10,
        readingTime: 2,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      bookId: book.id,
      chapterId: chapter.id,
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create test data' },
      { status: 500 }
    );
  }
}
