// app/api/books/by-slug/[slug]/chapters/[chapterId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq, sql } from 'drizzle-orm';
import { chapters, books } from '@/db';
import { generateJSON, generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

type UpdateData = {
  title?: string;
  content?: string | Record<string, unknown> | null;
  excerpt?: string | null;
  order?: number;
  level?: number;
  isDraft?: boolean;
  parentChapterId?: string | null;
  wordCount?: number;
  readingTime?: number | null;
  updatedAt?: Date;
};

// Chapter content is now handled directly in the response

// Database update fields type (to match Drizzle's expectations)
type DbUpdateFields = {
  title?: string;
  content?: string;  // Matches the database schema (not null in DB)
  excerpt?: string | null;
  order?: number;
  level?: number;
  isDraft?: boolean;
  parentChapterId?: string | null;
  wordCount?: number;
  readingTime?: number | null;
  updatedAt?: Date;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> }
) {
  console.log('GET /api/books/by-slug/[slug]/chapters/[chapterId] called');
  
  try {
    // Await params to ensure they're available
    const { slug, chapterId: rawChapterId } = await params;
    const chapterId = rawChapterId.trim();
    
    // Find the book by slug (no authentication required for GET)
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.slug, slug))
      .limit(1);

    if (!book) {
      console.log('Book not found for slug:', slug);
      return NextResponse.json(
        { error: 'Book not found' }, 
        { status: 404 }
      );
    }
    console.log('Fetching chapter with ID:', chapterId, 'for book ID:', book.id);
    
    // Get the chapter
    const [chapter] = await db
      .select({
        // Chapter fields
        id: chapters.id,
        uuid: chapters.uuid,
        title: chapters.title,
        content: chapters.content,
        order: chapters.order,
        level: chapters.level,
        wordCount: chapters.wordCount,
        readingTime: chapters.readingTime,
        parentChapterId: chapters.parentChapterId,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
        isDraft: chapters.isDraft,
        
        // Book fields - only select fields that exist in the books table
        book: {
          id: books.id,
          title: books.title,
          slug: books.slug,
          author: books.author,
          coverImageUrl: books.coverImageUrl,
          language: books.language,
          subtitle: books.subtitle,
          publisher: books.publisher,
          publishYear: books.publishYear,
          isbn: books.isbn,
          description: books.description,
          isPublished: books.isPublished,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt
        }
      })
      .from(chapters)
      .innerJoin(books, eq(chapters.bookId, books.id))
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, book.id)
        )
      )
      .limit(1);

    if (!chapter) {
      console.log('Chapter not found with ID:', chapterId, 'for book ID:', book.id);
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    // For edit mode, return the content as is (string)
    const responseContent = typeof chapter.content === 'string' 
      ? chapter.content 
      : JSON.stringify(chapter.content || '');

    // Return the chapter data with book info
    return NextResponse.json({
      ...chapter,
      content: responseContent,
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
    });
  } catch (error) {
    console.error('Error getting chapter:', error);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : 'Unknown error'
      : 'An error occurred while loading this chapter';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> }
) {
  console.log('PUT /api/books/by-slug/[slug]/chapters/[chapterId] called');
  
  try {
    // First, verify the user is authenticated
    const response = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get params
    const awaitedParams = await params;
    const { slug, chapterId: rawChapterId } = awaitedParams;
    const chapterId = rawChapterId.trim();
    
    console.log('Updating chapter with ID:', chapterId, 'for book slug:', slug);
    
    // Parse request body
    const updateData: UpdateData = await req.json();

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

    // Process content field - STORE AS TIPTAP JSON FORMAT
    if ('content' in updateData) {
      const content = updateData.content;
      console.log('Processing content update:', { 
        type: typeof content,
        content: typeof content === 'string' ? content.substring(0, 100) + '...' : content
      });
      
      // Convert content to Tiptap JSON format for storage
      if (typeof content === 'string') {
        // If it's already Tiptap JSON string
        if (content.trim().startsWith('{"type":"doc"')) {
          try {
            updateData.content = JSON.parse(content);
          } catch {
            // If parsing fails, treat as HTML/plain text
            if (content.trim().startsWith('<')) {
              // Convert HTML to Tiptap JSON
              try {
                updateData.content = generateJSON(content, [StarterKit]);
              } catch {
                console.warn('Failed to convert HTML to Tiptap JSON, storing as string');
                updateData.content = content;
              }
            } else {
              // Plain text - convert to Tiptap document
              updateData.content = {
                type: 'doc',
                content: content ? [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: content
                      }
                    ]
                  }
                ] : []
              };
            }
          }
        } else if (content.trim().startsWith('<')) {
          // HTML string - convert to Tiptap JSON
          try {
            updateData.content = generateJSON(content, [StarterKit]);
          } catch {
            console.warn('Failed to convert HTML to Tiptap JSON, storing as string');
            updateData.content = content;
          }
        } else {
          // Plain text - convert to Tiptap document
          updateData.content = {
            type: 'doc',
            content: content ? [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: content
                  }
                ]
              }
            ] : []
          };
        }
      }
      // If it's already an object (Tiptap JSON), keep as is
    }

    // Prepare update data
    const dbUpdateFields: DbUpdateFields = {
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.content !== undefined && { 
        content: typeof updateData.content === 'string' 
          ? updateData.content 
          : updateData.content === null 
            ? '' 
            : JSON.stringify(updateData.content) 
      }),
      ...(updateData.excerpt !== undefined && { excerpt: updateData.excerpt }),
      ...(updateData.order !== undefined && { order: updateData.order }),
      ...(updateData.level !== undefined && { level: updateData.level }),
      ...(updateData.isDraft !== undefined && { isDraft: updateData.isDraft }),
      ...(updateData.parentChapterId !== undefined && { 
        parentChapterId: updateData.parentChapterId 
      }),
      updatedAt: new Date(),
    };

    // Update the chapter
    const [updatedChapter] = await db
      .update(chapters)
      .set(dbUpdateFields)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, book.id)
        )
      )
      .returning();

    if (!updatedChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> }
) {
  console.log('PATCH /api/books/by-slug/[slug]/chapters/[chapterId] called');
  
  try {
    // First, verify the user is authenticated
    const sessionResponse = await auth.api.getSession({
      headers: req.headers,
    });
    
    // Type assertion for the user object
    const user = sessionResponse?.user as { id: string; [key: string]: unknown } | undefined;
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get params
    const awaitedParams = await params;
    const { slug, chapterId: rawChapterId } = awaitedParams;
    const chapterId = rawChapterId.trim();
    
    console.log('Partially updating chapter with ID:', chapterId, 'for book slug:', slug);
    
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
    
    // Check if the user is the owner of the book
    if (book.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Ensure chapterId is always a string for database queries
    const chapterIdParam = String(chapterId).trim();
    
    // Log the incoming parameters for debugging
    console.log('Processing chapter update for ID:', chapterIdParam, 'type:', typeof chapterIdParam);
    console.log('Book ID:', book.id, 'type:', typeof book.id);
    
    // Validate chapterId format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chapterIdParam)) {
      console.error('Invalid chapter ID format:', chapterIdParam);
      return NextResponse.json(
        { error: 'Invalid chapter ID format' },
        { status: 400 }
      );
    }
    
    // Parse the update data from the request body
    const updateData: Partial<UpdateData> = await req.json();
    console.log('Received update:', updateData);
    
    // First, try to find the chapter with the exact ID
    console.log('Querying for chapter with ID:', chapterIdParam, 'and book ID:', book.id);
    const existingChapter = await db.query.chapters.findFirst({
      where: and(
        eq(chapters.id, chapterIdParam),
        eq(chapters.bookId, book.id)
      )
    });
      
    // If not found, try to find by numeric ID (for backward compatibility)
    let chapterToUpdate = existingChapter;
    if (!chapterToUpdate && !isNaN(Number(chapterId))) {
      console.log('Chapter not found with UUID, trying numeric ID...');
      const numericChapters = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.id, String(chapterId)), // Try with string ID
            eq(chapters.bookId, book.id)
          )
        )
        .limit(1);
      
      if (numericChapters && numericChapters.length > 0) {
        chapterToUpdate = numericChapters[0];
      }
    }
      
    console.log('Chapter found:', chapterToUpdate ? 'Yes' : 'No');

    if (!chapterToUpdate) {
      return NextResponse.json(
        { 
          error: 'Chapter not found or does not belong to this book',
          details: { chapterId: chapterId, bookId: book.id }
        },
        { status: 404 }
      );
    }
    
    // Only allow specific fields to be updated
    const allowedFields: (keyof UpdateData)[] = ['title', 'content', 'order', 'level', 'parentChapterId', 'wordCount', 'readingTime'];
    const validUpdate: DbUpdateFields = {};
    
    console.log('Allowed fields:', allowedFields);
    
    // Only allow specific fields to be updated with proper type checking
    for (const field of allowedFields) {
      if (field in updateData) {
        const fieldValue = updateData[field];
        console.log(`Checking field: ${field}, value:`, fieldValue);
        
        // Handle each field type safely
        switch (field) {
          case 'title':
            if (typeof fieldValue === 'string') {
              validUpdate.title = fieldValue;
            }
            break;
            
          case 'content':
            if (fieldValue === null) {
              validUpdate.content = ''; // Handle null content as empty string
            } else if (typeof fieldValue === 'string') {
              validUpdate.content = fieldValue;
            } else if (typeof fieldValue === 'object' && fieldValue !== null) {
              validUpdate.content = JSON.stringify(fieldValue);
            }
            break;
            
          case 'excerpt':
            if (fieldValue === null || typeof fieldValue === 'string') {
              validUpdate.excerpt = fieldValue;
            }
            break;
            
          case 'order':
          case 'level':
          case 'wordCount':
            if (typeof fieldValue === 'number') {
              validUpdate[field] = fieldValue;
            }
            break;
            
          case 'parentChapterId':
            if (fieldValue === null || fieldValue === '') {
              validUpdate.parentChapterId = null; // Convert empty string to null
            } else if (typeof fieldValue === 'string') {
              validUpdate.parentChapterId = fieldValue;
            }
            break;
            
          case 'readingTime':
            if (fieldValue === null || typeof fieldValue === 'number') {
              validUpdate.readingTime = fieldValue;
            }
            break;
        }
      }
    }
    
    console.log('Valid update object:', JSON.stringify(validUpdate, null, 2));
    
    if (Object.keys(validUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // If parentChapterId is being updated, verify it's a valid chapter
    if ('parentChapterId' in validUpdate && validUpdate.parentChapterId !== null && validUpdate.parentChapterId !== '') {
      const [parentChapter] = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.id, String(validUpdate.parentChapterId)),
            eq(chapters.bookId, book.id)
          )
        )
        .limit(1);
        
      if (!parentChapter) {
        return NextResponse.json(
          { error: 'Parent chapter not found' },
          { status: 400 }
        );
      }
      
      // Prevent circular references
      if (validUpdate.parentChapterId === chapterId) {
        return NextResponse.json(
          { error: 'A chapter cannot be its own parent' },
          { status: 400 }
        );
      }
    }
    
    // Add updatedAt timestamp
    validUpdate.updatedAt = new Date();
  
    // Normalize and persist content as HTML
    if ('content' in validUpdate && validUpdate.content !== undefined) {
      const incoming = validUpdate.content as unknown;
      let htmlOut = '';
      if (incoming === null) {
        htmlOut = '';
      } else if (typeof incoming === 'string') {
        const trimmed = incoming.trim();
        // JSON string → TipTap JSON → HTML
        try {
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            htmlOut = generateHTML(parsed, [StarterKit]);
          } else {
            // Assume it's already HTML or plain text
            htmlOut = trimmed.startsWith('<') ? trimmed : `<p>${trimmed}</p>`;
          }
        } catch {
          htmlOut = trimmed.startsWith('<') ? trimmed : `<p>${trimmed}</p>`;
        }
      } else if (typeof incoming === 'object') {
        // TipTap JSON → HTML
        try {
          htmlOut = generateHTML(incoming as Record<string, unknown>, [StarterKit]);
        } catch {
          htmlOut = '';
        }
      }
      validUpdate.content = htmlOut;
    }
    
    console.log('Update values with dates:', JSON.stringify(validUpdate, null, 2));

    // If reordering is requested (order provided), compute gap-based new order using siblings
    if (updateData.order !== undefined || updateData.parentChapterId !== undefined) {
      // Determine target parent (new or existing)
      const targetParentId = (
        updateData.parentChapterId !== undefined
          ? (updateData.parentChapterId === '' ? null : updateData.parentChapterId)
          : chapterToUpdate.parentChapterId
      );

      // Determine desiredIndex from incoming order (treated as index from Arborist), clamp to [0, siblings.length]
      const desiredIndex = Math.max(0, Math.min(
        typeof updateData.order === 'number' ? updateData.order : Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
      ));

      // Fetch siblings (excluding current)
      const siblings = await db
        .select({ id: chapters.id, order: chapters.order })
        .from(chapters)
        .where(and(
          eq(chapters.bookId, book.id),
          targetParentId ? eq(chapters.parentChapterId, String(targetParentId)) : sql`(${chapters.parentChapterId} IS NULL)`
        ));

      const filtered = siblings.filter(s => s.id !== chapterId);
      const byOrder = filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // Compute prev/next orders around desired index
      const clampedIndex = Math.max(0, Math.min(desiredIndex, byOrder.length));
      const prevOrder = clampedIndex > 0 ? (byOrder[clampedIndex - 1]?.order ?? 0) : 0;
      const nextOrder = clampedIndex < byOrder.length ? (byOrder[clampedIndex]?.order ?? 0) : 0;

      const BASE_GAP = 10;
      let newOrder: number;

      if (clampedIndex === 0 && byOrder.length === 0) {
        newOrder = BASE_GAP;
      } else if (clampedIndex === 0) {
        // Insert at start
        newOrder = Math.max(1, nextOrder - BASE_GAP);
        if (newOrder <= 0) newOrder = Math.floor(nextOrder / 2) || 1;
      } else if (clampedIndex === byOrder.length) {
        // Insert at end
        newOrder = (prevOrder || 0) + BASE_GAP;
      } else {
        // Insert between prev and next
        const gap = nextOrder - prevOrder;
        if (gap > 1) {
          newOrder = Math.floor(prevOrder + gap / 2);
        } else {
          // Renormalize all siblings to multiples of BASE_GAP
          for (let i = 0; i < byOrder.length; i++) {
            const target = (i + 1) * BASE_GAP;
            if (byOrder[i].order !== target) {
              await db.update(chapters)
                .set({ order: target })
                .where(and(eq(chapters.id, byOrder[i].id), eq(chapters.bookId, book.id)));
              byOrder[i].order = target;
            }
          }
          const newPrev = clampedIndex > 0 ? byOrder[clampedIndex - 1].order : 0;
          const newNext = clampedIndex < byOrder.length ? byOrder[clampedIndex].order : (byOrder[byOrder.length - 1].order + BASE_GAP);
          newOrder = newPrev + Math.max(1, Math.floor((newNext - newPrev) / 2));
        }
      }

      validUpdate.order = newOrder;

      // Adjust level if parent changed and level not explicitly provided
      if (updateData.parentChapterId !== undefined && updateData.level === undefined) {
        if (targetParentId) {
          const [parent] = await db
            .select({ level: chapters.level })
            .from(chapters)
            .where(and(eq(chapters.id, String(targetParentId)), eq(chapters.bookId, book.id)))
            .limit(1);
          validUpdate.level = parent ? (Number(parent.level) || 1) + 1 : 1;
        } else {
          validUpdate.level = 1;
        }
      }
    }

    // Update the chapter
    const [updatedChapter] = await db
      .update(chapters)
      .set(validUpdate)
      .where(
        and(
          eq(chapters.id, chapterId),
          eq(chapters.bookId, book.id)
        )
      )
      .returning();

    if (!updatedChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedChapter);
    
  } catch (error) {
    console.error('Error in PATCH /api/books/by-slug/[slug]/chapters/[chapterId]:', error);
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