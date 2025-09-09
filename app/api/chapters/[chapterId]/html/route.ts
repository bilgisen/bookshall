import { NextResponse } from 'next/server';
import { db } from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { books, chapters } from '@/db';
import { generateCompleteDocumentHTML } from '@/lib/generateChapterHTML';
import { authenticateRequest } from '@/lib/auth/api-auth';

// Define types based on database schema
type Book = {
  id: string;
  userId: string;
  title: string;
  subtitle: string | null;
  slug: string;
  author: string;
  contributor: string | null;
  translator: string | null;
  publisher: string | null;
  publisherWebsite: string | null;
  publishYear: number | null;
  isbn: string | null;
  genre: string | null;
  series: string | null;
  seriesIndex: number | null;
  tags: string[] | null;
  description: string | null;
  language: string;
  isPublished: boolean;
  coverImageUrl: string | null;
  epubUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Chapter = {
  id: string;
  uuid: string;
  bookId: string;
  parentChapterId: string | null;
  title: string;
  content: string;
  order: number;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Type for the query result with chapter and book data
type ChapterWithBook = {
  chapter: Omit<Chapter, 'createdAt' | 'updatedAt'> & {
    createdAt: Date;
    updatedAt: Date;
    isDraft: boolean; // Ensure non-null
  };
  book: Omit<Book, 'createdAt' | 'updatedAt' | 'isPublished'> & {
    createdAt: Date;
    updatedAt: Date;
    language: string; // Ensure non-null
    isPublished: boolean; // Ensure non-null
  };
};

// Force dynamic route - required for API routes that need to access headers
// and for routes that need to be called from external services like GitHub Actions
export const dynamic = 'force-dynamic';


export async function GET(
  request: Request,
  { params }: { params: { chapterId: string } }
) {
  try {
    const { chapterId } = params;
    const authResult = await authenticateRequest(request);
    if (authResult.type === 'unauthorized') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // First, get the chapter
    const [chapterResult] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);

    if (!chapterResult) {
      return new NextResponse('Chapter not found', { status: 404 });
    }

    // Then get the associated book
    const [bookResult] = await db
      .select()
      .from(books)
      .where(eq(books.id, chapterResult.bookId))
      .limit(1);

    if (!bookResult) {
      return new NextResponse('Book not found', { status: 404 });
    }

    // Check if the user has access to this chapter
    if (authResult.type === 'session' && bookResult.userId !== authResult.userId) {
      return new NextResponse('Access denied', { status: 403 });
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
      return new NextResponse('Chapter data is incomplete', { status: 400 });
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

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Failed to generate chapter HTML:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
