import { NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { chapters, books } from '@/db';
import { JSONContent } from '@tiptap/react';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> }
) {
  try {
    // Await the params to ensure they're resolved
    const { slug, chapterId } = await params;
    
    // Find the book by slug
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.slug, slug))
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
          eq(chapters.bookId, book.id)
        )
      )
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Process content for viewing
    let content: string | JSONContent;
    
    // If content is not set, use a default empty document
    if (!chapter.content) {
      content = '<p>No content available</p>';
    } 
    // If content is a string, return it as is (preserving HTML)
    else if (typeof chapter.content === 'string') {
      content = chapter.content;
    } 
    // If content is already a JSON object, use it as is
    else if (typeof chapter.content === 'object' && chapter.content !== null) {
      content = chapter.content;
    } 
    // Fallback for any other case
    else {
      content = '<p>Content could not be loaded.</p>';
    }

    // Create the response data with the processed content
    const responseData = {
      ...chapter,
      content, // This will be either HTML string or JSONContent
      book: {
        id: book.id,
        title: book.title,
        slug: book.slug,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        isPublished: book.isPublished,
        publishYear: book.publishYear,
        description: book.description,
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in chapter view endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
