import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';

import { chapters, books } from '@/db/schema';

// -----------------
// GET /api/books/by-slug/[slug]/chapters
// Get all chapters for a book
// -----------------
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  console.log('GET /api/books/by-slug/[slug]/chapters called');
  try {
    const { slug } = await context.params;
    const response = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Find the book by slug
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, slug),
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

    // Get all chapters for the book with proper type casting
    const allChapters = await db
      .select()
      .from(chapters)
      .where(
        eq(chapters.bookId, book.id)
      )
      .orderBy(chapters.order);

    // Define the chapter type based on the database schema
    type DbChapter = typeof chapters.$inferSelect;
    
    // Define the shape we want for the API response
    interface ChapterNode extends Omit<DbChapter, 'id' | 'parentChapterId' | 'children'> {
      id: string;
      parentChapterId: string | null;
      children: ChapterNode[];
    }

    // Convert database rows to our API response format
    const chaptersMap = new Map<string, ChapterNode>();
    
    // First pass: create all nodes with string IDs
    for (const chapter of allChapters) {
      chaptersMap.set(chapter.id.toString(), {
        ...chapter,
        id: chapter.id.toString(),
        parentChapterId: chapter.parentChapterId?.toString() ?? null,
        children: []
      });
    }

    // Second pass: build the tree structure
    const tree: ChapterNode[] = [];
    
    for (const chapter of chaptersMap.values()) {
      if (chapter.parentChapterId === null) {
        // This is a root-level chapter
        tree.push(chapter);
      } else {
        // This is a child chapter, find its parent
        const parent = chaptersMap.get(chapter.parentChapterId);
        if (parent) {
          parent.children.push(chapter);
        }
      }
    }

    // Sort chapters by their order
    const sortByOrder = (chapters: ChapterNode[]): ChapterNode[] => {
      return [...chapters]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(chapter => ({
          ...chapter,
          children: sortByOrder(chapter.children)
        }));
    };

    const sortedTree = sortByOrder(tree);

    // Convert flat array to use string IDs for consistency
    const flatChapters = allChapters.map(chapter => ({
      ...chapter,
      id: chapter.id.toString(),
      parentChapterId: chapter.parentChapterId?.toString() ?? null
    }));

    return NextResponse.json({
      flat: flatChapters,
      tree: sortedTree
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// -----------------
// POST /api/books/by-slug/[slug]/chapters
// Create a new chapter
// -----------------
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  console.log('POST /api/books/by-slug/[slug]/chapters called');
  try {
    const { slug } = await context.params;
    const response = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Find the book by slug
    const [book] = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.slug, slug),
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

    const body = await req.json();
    const { title, content, parentChapterId, order, level } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' }, 
        { status: 400 }
      );
    }

    // Parse content based on its type
    let parsedContent;
    if (typeof content === 'string') {
      try {
        // Try to parse as JSON first
        parsedContent = JSON.parse(content);
      } catch {
        // If it's not valid JSON, treat it as HTML content
        parsedContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: content
                }
              ]
            }
          ]
        };
      }
    } else if (content && typeof content === 'object') {
      // If it's already an object, use it as is
      parsedContent = content;
    } else {
      // Default empty content
      parsedContent = {
        type: 'doc',
        content: []
      };
    }

    // Create the chapter
    const [chapter] = await db
      .insert(chapters)
      .values({
        title,
        content: JSON.stringify(parsedContent),
        bookId: book.id,
        parentChapterId: parentChapterId || null,
        order: order || 0,
        level: level || 1,
        wordCount: typeof content === 'string' ? content.split(/\s+/).length : 0,
        readingTime: typeof content === 'string' ? Math.ceil(content.split(/\s+/).length / 200) : 1,
      })
      .returning();

    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Error in POST /api/books/by-slug/[slug]/chapters:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
