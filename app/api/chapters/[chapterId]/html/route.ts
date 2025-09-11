import { NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { books, chapters } from '@/db';
import { generateCompleteDocumentHTML } from '@/lib/generateChapterHTML';

// Database schema types are imported from @/db

// Force dynamic route - required for API routes that need to access headers
// and for routes that need to be called from external services like GitHub Actions
export const dynamic = 'force-dynamic';


export async function GET(
  request: Request,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  // Set cache control headers
  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  headers.set('Content-Type', 'text/html; charset=utf-8');
  
  // Await the params promise
  const { chapterId } = await params;
  try {
    // First, try to find the chapter by UUID
    let chapterResult = await db
      .select()
      .from(chapters)
      .where(eq(chapters.uuid, chapterId))
      .limit(1)
      .then(res => res[0]);
      
    // If not found by UUID, try by ID for backward compatibility
    if (!chapterResult) {
      chapterResult = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, chapterId))
        .limit(1)
        .then(res => res[0]);
    }

    if (!chapterResult) {
      return new NextResponse(
        JSON.stringify({ error: 'Chapter not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=60'
          }
        }
      );
    }

    // Then get the associated book
    const [bookResult] = await db
      .select()
      .from(books)
      .where(eq(books.id, chapterResult.bookId))
      .limit(1);

    if (!bookResult) {
      return new NextResponse(
        JSON.stringify({ error: 'Book not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=60'
          }
        }
      );
    }

    // For non-published books, only allow access to non-draft chapters
    if (chapterResult.isDraft) {
      return new NextResponse(
        JSON.stringify({ error: 'Chapter not available' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=60'
          }
        }
      );
    }

    // Create typed objects
    const row = {
      chapter: {
        id: chapterResult.id,
        bookId: chapterResult.bookId,
        uuid: chapterResult.uuid,
        title: chapterResult.title,
        content: chapterResult.content,
        order: chapterResult.order,
        level: chapterResult.level,
        parentChapterId: chapterResult.parentChapterId,
        isDraft: chapterResult.isDraft ?? false,
        wordCount: chapterResult.wordCount,
        readingTime: chapterResult.readingTime,
        createdAt: chapterResult.createdAt,
        updatedAt: chapterResult.updatedAt,
      },
      book: {
        id: bookResult.id,
        userId: bookResult.userId,
        title: bookResult.title,
        author: bookResult.author,
        description: bookResult.description,
        coverImageUrl: bookResult.coverImageUrl,
        isbn: bookResult.isbn,
        language: bookResult.language ?? 'en',
        publisher: bookResult.publisher,
        publisherWebsite: bookResult.publisherWebsite,
        publishYear: bookResult.publishYear,
        slug: bookResult.slug,
        isPublished: bookResult.isPublished ?? false,
        epubUrl: bookResult.epubUrl,
        createdAt: bookResult.createdAt,
        updatedAt: bookResult.updatedAt,
        subtitle: bookResult.subtitle || null,
        contributor: bookResult.contributor || null,
        translator: bookResult.translator || null,
        genre: bookResult.genre || null,
        series: bookResult.series || null,
        seriesIndex: bookResult.seriesIndex || null,
        tags: bookResult.tags || null,
      }
    };

    // Row is already populated from the query above
    // Ensure required fields are not null
    if (!row.chapter.title || !row.chapter.content || !row.chapter.uuid) {
      return new NextResponse(
        JSON.stringify({ error: 'Chapter data is incomplete' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, s-maxage=60'
          }
        }
      );
    }

    // Use the typed data from our query
    const chapter = row.chapter;
    const book = row.book;

    // Generate HTML with complete metadata
    const html = generateCompleteDocumentHTML(
      chapter.title || 'Untitled Chapter',
      chapter.content || '',
      {
        book: book.title || 'Untitled Book',
        chapter_id: chapter.id,
        order: chapter.order || 0,
        level: chapter.level || 1,
        title_tag: `h${chapter.level || 1}`,
        title: chapter.title || 'Untitled Chapter',
        parent_chapter: chapter.parentChapterId || ''
      }
    );

    return new NextResponse(html, { headers });
  } catch (error) {
    console.error('Error in chapter HTML route:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }
}
