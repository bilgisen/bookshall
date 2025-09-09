import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { books, chapters } from '@/db';
import { auth } from '@/lib/auth';

// Constants
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

// Types and Schemas
const PublishOptionsSchema = z.object({
  // Format options
  format: z.enum(['epub']).default('epub'),
  
  // Content inclusion
  includeMetadata: z.boolean().default(true),
  includeCover: z.boolean().default(true),
  includeTOC: z.boolean().default(true),
  tocLevel: z.number().int().min(1).max(5).default(3),
  includeImprint: z.boolean().default(true),
  language: z.string().default('en'),
  
  // Legacy parameters (for backward compatibility)
  generate_toc: z.boolean().optional(),
  include_imprint: z.boolean().optional(),
  toc_depth: z.number().int().min(1).max(5).optional(),
}).transform(data => ({
  // Normalize options
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
// From db/schema.ts: chapters table definition
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
  // Fetch all non-draft chapters for the book
  const allChapters = await db.query.chapters.findMany({
    where: and(
      eq(chapters.bookId, bookId),
      eq(chapters.isDraft, false)
    ),
    orderBy: (chapters, { asc }) => [asc(chapters.order)],
  });

  const chapterMap = new Map<string, ChapterNode>();
  const rootChapters: ChapterNode[] = [];

  // First pass: create all nodes with proper typing
  for (const chapter of allChapters) {
    const node: ChapterNode = {
      id: chapter.id,
      bookId: chapter.bookId,
      title: chapter.title,
      content: chapter.content,
      order: chapter.order,
      parentChapterId: chapter.parentChapterId,
      level: chapter.level,
      isDraft: chapter.isDraft ?? false, // Default to false if null
      wordCount: chapter.wordCount,
      readingTime: chapter.readingTime,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      children: [],
      slug: `chapter-${chapter.id}`
    };
    chapterMap.set(chapter.id, node);
  }

  // Second pass: build the tree
  for (const chapter of allChapters) {
    const node = chapterMap.get(chapter.id);
    if (!node) continue;

    if (chapter.parentChapterId) {
      const parent = chapterMap.get(chapter.parentChapterId);
      if (parent) {
        // Ensure level is properly incremented
        node.level = parent.level + 1;
        parent.children.push(node);
        continue;
      }
    }
    
    // If no parent or parent not found, add to root with level 1
    node.level = 1;
    rootChapters.push(node);
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

  return sortChapters(rootChapters);
}

function flattenChapterTree(
  chapters: ChapterNode[],
  bookSlug: string,
  baseUrl: string,
  level = 1,
  parentId: string | null = null
): PayloadChapter[] {
  let result: PayloadChapter[] = [];
  
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
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authenticate the request
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: bookId } = params;
    
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
      // Map legacy parameter names
      toc_depth: queryParams.toc_depth || queryParams.tocLevel,
      include_imprint: queryParams.include_imprint || queryParams.includeImprint,
      generate_toc: queryParams.generate_toc || queryParams.includeTOC,
    });
    
    // Fetch the book with proper type
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Verify ownership (if needed)
    if (book.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Build chapter tree and flatten for payload
    const chapterTree = await buildChapterTree(bookId);
    const baseUrl = getBaseUrl(request);
    const payloadChapters = flattenChapterTree(chapterTree, book.slug, baseUrl);

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `${book.slug}-${timestamp}.epub`;

    // Construct final payload
    const payload: EbookPayload = {
      book: {
        slug: book.slug,
        title: book.title,
        author: book.author,
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
        user_id: session.user.id,
        user_email: session.user.email,
      },
    };

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
