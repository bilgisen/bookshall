// app/api/books/by-id/[id]/payload/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/drizzle';
import { books, chapters } from '@/db/schema';
import { createClient } from '@supabase/supabase-js';

// Constants
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
// Use Node.js runtime to access Supabase via server-side PostgreSQL driver
export const runtime = 'nodejs';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Types and Schemas
const PublishOptionsSchema = z.object({
  format: z.enum(['epub']).default('epub'),
  includeMetadata: z.coerce.boolean().default(true),
  includeCover: z.coerce.boolean().default(true),
  includeTOC: z.coerce.boolean().default(true),
  tocLevel: z.coerce.number().int().min(1).max(5).default(3),
  language: z.string().default('en'),
  generate_toc: z.coerce.boolean().optional(),
  toc_depth: z.coerce.number().int().min(1).max(5).optional(),
}).transform(data => ({
  format: data.format,
  includeMetadata: data.includeMetadata,
  includeCover: data.includeCover,
  includeTOC: data.generate_toc ?? data.includeTOC,
  tocLevel: data.toc_depth ?? data.tocLevel,
  language: data.language,
}));


interface ChapterNode {
  id: string;
  bookId: string;
  title: string;
  order: number;
  level: number;
  parentChapterId: string | null;
  children: ChapterNode[];
  [key: string]: unknown; // For additional properties like uuid
}

interface PayloadChapter {
  id: string;
  title: string;
  url: string;
  order: number;
  level: number;
  parent: string | null;
  title_tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

interface EbookPayload {
  book: {
    id: string;
    title: string;
    author: string;
    language: string;
    output_filename: string;
    cover_url: string;
    stylesheet_url: string;
    subtitle?: string;
    description?: string;
    publisher?: string;
    isbn?: string;
    publish_year?: number;
    chapters: PayloadChapter[];
  };
  options: {
    generate_toc: boolean;
    toc_depth: number;
    embed_metadata: boolean;
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
    const allChapters = await db
      .select({
        id: chapters.id,
        uuid: chapters.uuid,
        bookId: chapters.bookId,
        title: chapters.title,
        content: chapters.content,
        order: chapters.order,
        level: chapters.level,
        parentChapterId: chapters.parentChapterId,
        isDraft: chapters.isDraft,
        wordCount: chapters.wordCount,
        readingTime: chapters.readingTime,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
      })
      .from(chapters)
      .where(
        and(
          eq(chapters.bookId, bookId),
          eq(chapters.isDraft, false)
        )
      )
      .orderBy(asc(chapters.order));
    
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
        uuid: chapter.uuid,
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

    // Sort chapters by order and assign stable sequential order when missing (0 or negative)
    const sortChapters = (nodes: ChapterNode[]): ChapterNode[] => {
      // First, sort by existing order ascending
      const sorted = [...nodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      // Then, assign a stable order index to nodes lacking a positive order
      const stabilized = sorted.map((node, idx) => {
        const effectiveOrder = typeof node.order === 'number' && node.order > 0 ? node.order : idx + 1;
        return {
          ...node,
          order: effectiveOrder,
          children: sortChapters(node.children),
        } as ChapterNode;
      });
      return stabilized;
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
  bookId: string,
  baseUrl: string,
  level = 1,
  parentId: string | null = null
): PayloadChapter[] {
  let result: PayloadChapter[] = [];
  
  console.log('Flattening chapter tree, chapters count:', chapters.length);
  
  for (const chapter of chapters) {
  
// Determine the appropriate heading level based on the chapter's level
const titleTag = `h${Math.min(6, Math.max(1, chapter.level))}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
// Use the public chapter HTML route with UUID
const chapterUuid = chapter.uuid || chapter.id;
const url = `${baseUrl}/api/chapters/${chapterUuid}/html`;
  
const payloadChapter: PayloadChapter = {
  id: chapter.id,
  title: chapter.title,
  url,
  order: Number(chapter.order ?? 0),
  level: Number(chapter.level ?? level),
  parent: parentId,
  title_tag: titleTag,
};
  
console.log(`Flattened chapter: ${chapter.title} (ID: ${chapter.id}, Level: ${chapter.level}, Order: ${chapter.order})`);
  
// Add the current chapter to the result
result.push(payloadChapter);
  
// Process children recursively if they exist
if (chapter.children && chapter.children.length > 0) {
result = result.concat(
flattenChapterTree(chapter.children, bookId, baseUrl, level + 1, chapter.id)
);
}
}
  
return result;
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders,
    },
  });
}

// Main Handler
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
// Public route - no authentication required
console.log('=== PAYLOAD ROUTE DEBUG ===');
console.log('Request URL:', request.url);
  

  try {
    const { id: bookId } = await params;

    // Get the authorization token (if any). This is a public route, so we never fail on bad tokens.
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (token) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) {
          console.warn('Authentication token invalid; proceeding as unauthenticated');
        } else if (user) {
          console.log('Authenticated user:', user.id);
        }
      } catch {
        console.warn('Token verification error; proceeding as unauthenticated');
      }
    }

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
      generate_toc: queryParams.generate_toc || queryParams.includeTOC,
    });

    // Get the book with all necessary fields
    console.log('Fetching book with ID:', bookId);
    try {
      const [book] = await db
        .select({
          id: books.id,
          title: books.title,
          slug: books.slug,
          author: books.author,
          description: books.description,
          language: books.language,
          subtitle: books.subtitle,
          coverImageUrl: books.coverImageUrl,
          isPublished: books.isPublished,
          userId: books.userId,
          publisher: books.publisher,
          isbn: books.isbn,
          publishYear: books.publishYear,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt,
        })
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      if (!book) {
        console.error('Book not found with ID:', bookId);
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Book not found or not published',
          }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      console.log('Found book:', { 
        id: book.id, 
        title: book.title,
        isPublished: book.isPublished 
      });

      // Skip ownership check in public mode
      console.log('Skipping ownership check in public access mode');

      // Build chapter tree and flatten for payload
      console.log('Building chapter tree for book ID:', bookId);
      const chapterTree = await buildChapterTree(bookId);
      console.log('Chapter tree built, root chapters count:', chapterTree.length);

      // Get the base URL for building chapter URLs
      const baseUrl = getBaseUrl(request);

      // Flatten the chapter tree for the payload
      const flattenedChaptersRaw = flattenChapterTree(chapterTree, bookId, baseUrl);
      // Assign strict sequential order for pandoc stability
      const flattenedChapters = flattenedChaptersRaw.map((ch, idx) => ({
        ...ch,
        order: idx + 1,
      }));
      console.log('Flattened chapters count:', flattenedChapters.length);

      // Build the final payload
      const payload: EbookPayload = {
        book: {
          id: book.id,
          title: book.title,
          author: book.author || 'Unknown Author',
          language: book.language || 'en',
          output_filename: `${book.slug || 'book'}.epub`,
          cover_url: book.coverImageUrl || `${baseUrl}/images/default-cover.jpg`,
          stylesheet_url: `${baseUrl}/styles/ebook.css`,
          subtitle: book.subtitle ?? undefined,
          description: book.description ?? undefined,
          publisher: book.publisher ?? undefined,
          isbn: book.isbn ?? undefined,
          publish_year: book.publishYear ? parseInt(book.publishYear.toString(), 10) : undefined,
          chapters: flattenedChapters,
        },
        options: {
          generate_toc: options.includeTOC,
          toc_depth: options.tocLevel,
          embed_metadata: options.includeMetadata,
          cover: true,
        },
        metadata: {
          generated_at: new Date().toISOString(),
          generated_by: 'bookshall-api',
          user_id: book.userId,
          user_email: undefined,
        },
      };

      // Return the final payload
      console.log('Generated payload with chapters:', payload.book.chapters.length);
      return new NextResponse(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    } catch (error) {
      console.error('Error processing book payload:', error);

      if (error instanceof z.ZodError) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Invalid parameters',
            details: error.issues,
          }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Internal server error',
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error in GET handler:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred',
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}