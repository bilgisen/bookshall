// app/api/books/by-id/[id]/payload/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db/drizzle';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { books, chapters } from '@/db';
import { authenticateRequest } from '@/lib/auth/api-auth';

// Constants
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

// Types and Schemas
const PublishOptionsSchema = z.object({
  format: z.enum(['epub']).default('epub'),
  includeMetadata: z.boolean().default(true),
  includeCover: z.boolean().default(true),
  includeTOC: z.boolean().default(true),
  tocLevel: z.number().int().min(1).max(5).default(3),
  includeImprint: z.boolean().default(true),
  language: z.string().default('en'),
  generate_toc: z.boolean().optional(),
  include_imprint: z.boolean().optional(),
  toc_depth: z.number().int().min(1).max(5).optional(),
}).transform(data => ({
  format: data.format,
  includeMetadata: data.includeMetadata,
  includeCover: data.includeCover,
  includeTOC: data.generate_toc ?? data.includeTOC,
  tocLevel: data.toc_depth ?? data.tocLevel,
  includeImprint: data.include_imprint ?? data.includeImprint,
  language: data.language,
}));

type PublishOptions = z.infer<typeof PublishOptionsSchema>;

// Data Types
interface ChapterNode {
  id: string;
  bookId: string;
  title: string;
  content: string;
  order: number;
  parentChapterId: string | null;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime: number | null;
  createdAt: Date;
  updatedAt: Date;
  children: ChapterNode[];
  slug?: string;
  uuid?: string;
  publishedAt?: Date | null;
}

interface PayloadChapter {
  id: string;
  title: string;
  slug: string;
  url: string;
  content_url: string;
  content: string;
  order: number;
  parent: string | null;
  title_tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface EbookPayload {
  book: {
    slug: string;
    title: string;
    author: string;
    language: string;
    output_filename: string;
    cover_url: string;
    stylesheet_url: string;
    subtitle?: string;
    description?: string;
    chapters: PayloadChapter[];
  };
  options: {
    generate_toc: boolean;
    toc_depth: number;
    embed_metadata: boolean;
    include_imprint: boolean;
    cover: boolean;
  };
  metadata: {
    generated_at: string;
    generated_by: string;
    user_id: string;
    user_email?: string;
  };
}

// Helper Functions
function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'editor.bookshall.com';
  return `${protocol}://${host}`;
}

async function buildChapterTree(bookId: string): Promise<ChapterNode[]> {
  try {
    console.log('Building chapter tree for bookId:', bookId);
    
    // Fetch all non-draft chapters for the book with explicit field selection
    console.log('Fetching chapters for bookId:', bookId);
    const allChapters = await db.select({
      id: chapters.id,
      bookId: chapters.bookId,
      title: chapters.title,
      content: chapters.content,
      order: chapters.order,
      level: chapters.level,
      parentChapterId: chapters.parentChapterId,
      isDraft: chapters.isDraft,
      wordCount: chapters.wordCount,
      readingTime: chapters.readingTime,
      uuid: chapters.uuid,
      createdAt: chapters.createdAt,
      updatedAt: chapters.updatedAt
    }).from(chapters).where(
      and(
        eq(chapters.bookId, bookId),
        eq(chapters.isDraft, false)
      )
    ).orderBy(chapters.order);
    
    console.log(`Found ${allChapters.length} non-draft chapters for book ${bookId}`);

    console.log('Fetched chapters count:', allChapters.length);
    console.log('Fetched chapters:', JSON.stringify(allChapters, null, 2));

    if (allChapters.length === 0) {
      console.log('No chapters found for bookId:', bookId);
      return [];
    }

    const chapterMap = new Map<string, ChapterNode>();
    const rootChapters: ChapterNode[] = [];

    // First pass: create all nodes with proper typing
    for (const chapter of allChapters) {
      // Ensure content is a string
      let content = '';
      if (typeof chapter.content === 'string') {
        content = chapter.content;
      } else if (chapter.content && typeof chapter.content === 'object') {
        // If it's a Tiptap JSON object, convert to string
        content = JSON.stringify(chapter.content);
      } else if (chapter.content !== null && chapter.content !== undefined) {
        content = String(chapter.content);
      }

      const node: ChapterNode = {
        id: String(chapter.id),
        bookId: String(chapter.bookId),
        title: chapter.title || 'Untitled Chapter',
        content: content,
        order: chapter.order ?? 0,
        parentChapterId: chapter.parentChapterId ? String(chapter.parentChapterId) : null,
        level: chapter.level ?? 1,
        isDraft: chapter.isDraft ?? false,
        wordCount: chapter.wordCount ?? 0,
        readingTime: chapter.readingTime ?? null,
        createdAt: chapter.createdAt ?? new Date(),
        updatedAt: chapter.updatedAt ?? new Date(),
        children: [],
        slug: `chapter-${chapter.id}`,
        uuid: chapter.uuid || undefined
      };
      
      chapterMap.set(String(chapter.id), node);
    }

    console.log('Chapter map size:', chapterMap.size);

    // Second pass: build the tree
    for (const chapter of allChapters) {
      const chapterId = String(chapter.id);
      const node = chapterMap.get(chapterId);
      if (!node) {
        console.log('Node not found for chapterId:', chapterId);
        continue;
      }

      if (chapter.parentChapterId) {
        const parentChapterId = String(chapter.parentChapterId);
        const parent = chapterMap.get(parentChapterId);
        if (parent) {
          // Ensure level is properly incremented
          node.level = parent.level + 1;
          parent.children.push(node);
          console.log(`Added chapter ${chapterId} as child of ${parentChapterId}`);
          continue;
        } else {
          console.log(`Parent chapter ${parentChapterId} not found for chapter ${chapterId}`);
        }
      }
      
      // If no parent or parent not found, add to root with level 1
      node.level = 1;
      rootChapters.push(node);
      console.log(`Added chapter ${chapterId} to root chapters`);
    }

    // Sort chapters by order
    const sortChapters = (nodes: ChapterNode[]): ChapterNode[] => {
      return nodes
        .sort((a, b) => a.order - b.order)
        .map(node => ({
          ...node,
          children: sortChapters(node.children),
        }));
    };

    const sortedRootChapters = sortChapters(rootChapters);
    console.log('Built chapter tree with root chapters:', sortedRootChapters.length);
    
    return sortedRootChapters;
  } catch (error) {
    console.error('Error building chapter tree:', error);
    return [];
  }
}

function flattenChapterTree(
  chapters: ChapterNode[],
  bookSlug: string,
  baseUrl: string,
  level = 1,
  parentId: string | null = null
): PayloadChapter[] {
  let result: PayloadChapter[] = [];
  
  console.log('Flattening chapter tree, chapters count:', chapters.length);
  
  for (const chapter of chapters) {
    const slug = `chapter-${chapter.id}`;
    const url = `${baseUrl}/books/${bookSlug}/${slug}`;
    const contentUrl = `${baseUrl}/api/chapters/${chapter.id}/content`;
    
    const payloadChapter: PayloadChapter = {
      id: chapter.id,
      title: chapter.title,
      slug,
      url,
      content_url: contentUrl,
      content: chapter.content,
      order: chapter.order,
      parent: parentId,
      title_tag: `h${Math.min(chapter.level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    };
    
    result.push(payloadChapter);
    console.log(`Flattened chapter: ${chapter.title} (ID: ${chapter.id})`);
    
    // Add children recursively
    if (chapter.children.length > 0) {
      result = result.concat(
        flattenChapterTree(chapter.children, bookSlug, baseUrl, level + 1, chapter.id)
      );
    }
  }
  
  return result;
}

// Main Handler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  console.log('=== PAYLOAD ROUTE DEBUG ===');
  console.log('Request URL:', request.url);
  console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  // Await the params promise
  const { id } = await params;
  console.log('Book ID:', id);
  
  try {
    // Temporary bypass for debugging
    console.log('Temporarily bypassing authentication for debugging');
    /*
    // Get headers from the request
    const headersObj = Object.fromEntries(request.headers.entries());
    
    // Authenticate the request using api-auth helper
    const authResult = await authenticateRequest({
      headers: headersObj
    });
    
    if (authResult.type === 'unauthorized') {
      console.error('Unauthorized request', { 
        headers: Object.keys(headersObj),
        authResult
      });
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }
    
    // For session auth, we'll use the userId later for ownership checks
    const userId = authResult.type === 'session' ? authResult.userId : 'github-actions';
    */
    
    // Temporary hardcoded userId for debugging
    const userId = 'debug-user';
    console.log('Using debug user ID:', userId);
    // Get headers from the request
    const headersObj = Object.fromEntries(request.headers.entries());
    
    // Authenticate the request using api-auth helper
    const authResult = await authenticateRequest({
      headers: headersObj
    });
    
    if (authResult.type === 'unauthorized') {
      console.error('Unauthorized request', { 
        headers: Object.keys(headersObj),
        authResult
      });
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }
    
    // For session auth, we'll use the userId later for ownership checks
    const userId = authResult.type === 'session' ? authResult.userId : 'github-actions';

    // Await params as required by Next.js 15
    const awaitedParams = await params;
    const { id: bookId } = awaitedParams;
    
    console.log('GET /api/books/by-id/[id]/payload called with bookId:', bookId);
    
    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    const options = PublishOptionsSchema.parse({
      ...queryParams,
      toc_depth: queryParams.toc_depth || queryParams.tocLevel,
      include_imprint: queryParams.include_imprint || queryParams.includeImprint,
      generate_toc: queryParams.generate_toc || queryParams.includeTOC,
    });
    
    // Get the book with all necessary fields
    console.log('Fetching book with ID:', bookId);
    const book = await db.query.books.findFirst({
      where: (books, { eq }) => eq(books.id, bookId),
      columns: {
        id: true,
        title: true,
        slug: true,
        author: true,
        description: true,
        language: true,
        subtitle: true,
        coverImageUrl: true,
        isPublished: true,
        userId: true, // Added userId to the query
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!book) {
      console.error('Book not found with ID:', bookId);
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    console.log('Found book:', { 
      id: book.id, 
      title: book.title,
      isPublished: book.isPublished 
    });

    // Verify ownership for session-based auth
    if (authResult.type === 'session' && book.userId !== authResult.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Build chapter tree and flatten for payload
    console.log('Building chapter tree for book ID:', bookId);
    const chapterTree = await buildChapterTree(bookId);
    console.log('Chapter tree built, root chapters count:', chapterTree.length);
    
    // Debug: Check if we have any chapters in the database for this book
    const debugChapters = await db.select({
      id: chapters.id,
      title: chapters.title,
      parentChapterId: chapters.parentChapterId,
      order: chapters.order,
      isDraft: chapters.isDraft,
      bookId: chapters.bookId,
      level: chapters.level,
      content: chapters.content
    }).from(chapters).where(
      and(
        eq(chapters.bookId, bookId),
        eq(chapters.isDraft, false)
      )
    ).orderBy(chapters.order);
    
    console.log('Debug - Total non-draft chapters in database for this book:', debugChapters.length);
    if (debugChapters.length > 0) {
      console.log('Debug - Sample chapter from database:', {
        id: debugChapters[0].id,
        bookId: debugChapters[0].bookId,
        title: debugChapters[0].title,
        parentChapterId: debugChapters[0].parentChapterId,
        order: debugChapters[0].order,
        level: debugChapters[0].level,
        isDraft: debugChapters[0].isDraft,
        contentLength: debugChapters[0].content?.length || 0
      });
    } else {
      // Check if there are any chapters at all (including drafts)
      const anyChapters = await db.select({ count: sql<number>`count(*)` })
        .from(chapters)
        .where(eq(chapters.bookId, bookId));
      
      console.log(`Debug - Total chapters (including drafts): ${anyChapters[0]?.count || 0}`);
    }
    
    const baseUrl = getBaseUrl(request);
    console.log('Base URL:', baseUrl);
    
    const payloadChapters = flattenChapterTree(chapterTree, book.slug, baseUrl);
    console.log('Flattened payload chapters count:', payloadChapters.length);

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `${book.slug}-${timestamp}.epub`;

    // Construct final payload
    const payload: EbookPayload = {
      book: {
        slug: book.slug,
        title: book.title,
        author: book.author || '',
        language: options.language,
        description: book.description || undefined,
        subtitle: book.subtitle || undefined,
        output_filename: outputFilename,
        cover_url: book.coverImageUrl || '',
        stylesheet_url: `${baseUrl}/styles/epub.css`,
        chapters: payloadChapters,
      },
      options: {
        generate_toc: options.includeTOC,
        toc_depth: options.tocLevel,
        embed_metadata: options.includeMetadata,
        include_imprint: options.includeImprint,
        cover: options.includeCover,
      },
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: 'bookshall-epub-generator',
        user_id: authResult.type === 'session' ? authResult.userId : 'github-actions',
        user_email: 'github-actions@bookshall.com',
      },
    };

    console.log('Generated payload with chapters:', payload.book.chapters.length);

    // Return the payload
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error generating payload', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate payload' },
      { status: 500 }
    );
  }
}