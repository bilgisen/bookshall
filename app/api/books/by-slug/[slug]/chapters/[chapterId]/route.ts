import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { chapters, books } from '@/db';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

// Define types for our response data
interface ChapterContent {
  type: 'doc' | string;  // Made type more specific with default value
  content?: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

type ChapterResponse = {
  id: string;
  title: string | null;
  content: ChapterContent | null;
  excerpt: null;
  order: number;
  level: number;
  isDraft: boolean;
  wordCount: number;
  readingTime: number | null;
  parentChapterId: string | null;
  bookId: string;
  uuid: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: null;
  book: {
    id: string;
    title: string;
    slug: string;
    author: string | null;
    coverImageUrl: string | null;
    language: string | null;
    subtitle: string | null;
    publisher: string | null;
    publishYear: number | null;
    isbn: string | null;
    description: string | null;
    isPublished: boolean;
    publishedAt: null;
    createdAt: string;
    updatedAt: string;
  };
};

type UpdateFieldKey = 
  | 'title'
  | 'content'
  | 'excerpt'
  | 'order'
  | 'level'
  | 'isDraft'
  | 'parentChapterId'
  | 'wordCount'
  | 'readingTime'
  | 'updatedAt';

type UpdateFieldValue = 
  | string 
  | number 
  | boolean 
  | ChapterContent 
  | Date 
  | null 
  | undefined;

type UpdateFields = Partial<Record<UpdateFieldKey, UpdateFieldValue>>;

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
  { params }: { params: { slug: string; chapterId: string } }
) {
  console.log('GET /api/books/by-slug/[slug]/chapters/[chapterId] called');
  
  try {
    
    // Get session using authClient
    const sessionResponse = await auth.api.getSession({
      headers: req.headers,
    });
    
    if (!sessionResponse?.user) {
      console.log('No session found, returning 401');
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
          eq(books.slug, params.slug),
          eq(books.userId, sessionResponse.user.id)
        )
      )
      .limit(1);

    if (!book) {
      console.log('Book not found for slug:', params.slug);
      return NextResponse.json(
        { error: 'Book not found' }, 
        { status: 404 }
      );
    }

    const chapterId = params.chapterId.trim();
    console.log('Fetching chapter with ID:', chapterId, 'for book ID:', book.id);
    
    // First try with the exact ID
    let [chapterData] = await db
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
        bookId: chapters.bookId,
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
      
    // If not found, try with UUID if the ID looks like a number (for backward compatibility)
    if (!chapterData && !isNaN(Number(chapterId))) {
      console.log('Chapter not found with ID, trying with UUID...');
      [chapterData] = await db
        .select({
          id: chapters.id,
          uuid: chapters.uuid,
          title: chapters.title,
          content: chapters.content,
          order: chapters.order,
          level: chapters.level,
          wordCount: chapters.wordCount,
          readingTime: chapters.readingTime,
          parentChapterId: chapters.parentChapterId,
          bookId: chapters.bookId,
          isDraft: chapters.isDraft,
          createdAt: chapters.createdAt,
          updatedAt: chapters.updatedAt,
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
            eq(chapters.uuid, chapterId),
            eq(chapters.bookId, book.id)
          )
        )
        .limit(1);
    }

    if (!chapterData) {
      console.log('Chapter not found with ID:', chapterId, 'for book ID:', book.id);
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    // Ensure content is in proper Tiptap JSON format
    let content: ChapterContent | null = null;
    if (chapterData.content !== null && chapterData.content !== undefined) {
      if (typeof chapterData.content === 'string') {
        try {
          // Try to parse as JSON (Tiptap format)
          const parsed = JSON.parse(chapterData.content);
          // Ensure the parsed content has the correct type
          if (parsed && typeof parsed === 'object' && 'type' in parsed) {
            content = parsed as ChapterContent;
          } else {
            throw new Error('Invalid content format');
          }
        } catch {
          // If it's not JSON, it might be HTML - convert to Tiptap format
          if (chapterData.content.trim().startsWith('<')) {
            try {
              content = generateJSON(chapterData.content, [StarterKit]) as ChapterContent;
            } catch {
              // If conversion fails, create basic Tiptap document
              content = {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: chapterData.content
                      }
                    ]
                  }
                ]
              } satisfies ChapterContent;
            }
          } else {
            // Plain text
            content = {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: chapterData.content
                    }
                  ]
                }
              ]
            } satisfies ChapterContent;
          }
        }
      } else {
        // Already an object (Tiptap JSON format)
        content = chapterData.content as ChapterContent;
      }
    }

    // Return the data in the expected format
    const responseData: ChapterResponse = {
      id: chapterData.id,
      title: chapterData.title,
      content: content,
      excerpt: null, // Not in the schema
      order: Number(chapterData.order) || 0,
      level: Number(chapterData.level) || 1,
      isDraft: false, // Not in the schema
      wordCount: Number(chapterData.wordCount) || 0,
      readingTime: chapterData.readingTime ? Number(chapterData.readingTime) : null,
      parentChapterId: chapterData.parentChapterId || null,
      bookId: chapterData.bookId,
      uuid: chapterData.uuid,
      createdAt: new Date(chapterData.createdAt).toISOString(),
      updatedAt: new Date(chapterData.updatedAt).toISOString(),
      publishedAt: null, // Not in the schema
      // Include book information
      book: {
        id: chapterData.book.id,
        title: chapterData.book.title,
        slug: chapterData.book.slug,
        author: chapterData.book.author || null,
        coverImageUrl: chapterData.book.coverImageUrl || null,
        language: chapterData.book.language || null,
        subtitle: chapterData.book.subtitle || null,
        publisher: chapterData.book.publisher || null,
        publishYear: chapterData.book.publishYear || null,
        isbn: chapterData.book.isbn || null,
        description: chapterData.book.description || null,
        isPublished: true, // Default value since it's not in the schema
        publishedAt: null, // Not in the schema
        createdAt: new Date(chapterData.book.createdAt).toISOString(),
        updatedAt: new Date(chapterData.book.updatedAt).toISOString(),
      },
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error getting chapter:', error);
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

export async function PUT(
  req: Request,
  { params }: { params: { slug: string; chapterId: string } }
) {
  console.log('PUT /api/books/by-slug/[slug]/chapters/[chapterId] called');
  try {
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
          eq(books.slug, params.slug),
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

    // Parse the request body
    const updateData = await req.json();
    
    // Validate required fields
    if (!updateData.title) {
      return NextResponse.json(
        { error: 'Title is required' }, 
        { status: 400 }
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
    const updateFields: UpdateFields = {
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

    try {
      // Convert UpdateFields to DbUpdateFields for database operation
      const dbUpdateFields: DbUpdateFields = {};
      
      Object.entries(updateFields).forEach(([key, value]) => {
        switch (key as UpdateFieldKey) {
          case 'title':
            if (typeof value === 'string') dbUpdateFields.title = value;
            break;
          case 'content':
            if (value === null) {
              // If content is null, set empty string to match DB schema
              dbUpdateFields.content = '';
            } else if (typeof value === 'object') {
              // Ensure we have proper ChapterContent with type
              const contentObj = value as ChapterContent;
              if (!contentObj.type) {
                contentObj.type = 'doc';  // Default type for Tiptap documents
              }
              dbUpdateFields.content = JSON.stringify(contentObj);
            } else if (typeof value === 'string') {
              dbUpdateFields.content = value;
            } else {
              // Fallback for any other case
              dbUpdateFields.content = '';
            }
            break;
          case 'excerpt':
            if (value === null || typeof value === 'string') dbUpdateFields.excerpt = value;
            break;
          case 'order':
            if (typeof value === 'number') dbUpdateFields.order = value;
            break;
          case 'level':
            if (typeof value === 'number') dbUpdateFields.level = value;
            break;
          case 'isDraft':
            if (typeof value === 'boolean') dbUpdateFields.isDraft = value;
            break;
          case 'parentChapterId':
            if (value === null || typeof value === 'string') dbUpdateFields.parentChapterId = value;
            break;
          case 'wordCount':
            if (typeof value === 'number') dbUpdateFields.wordCount = value;
            break;
          case 'readingTime':
            if (value === null || typeof value === 'number') dbUpdateFields.readingTime = value;
            break;
          case 'updatedAt':
            if (value instanceof Date) dbUpdateFields.updatedAt = value;
            break;
        }
      });

      // Update the chapter
      const [updatedChapter] = await db
        .update(chapters)
        .set(dbUpdateFields)
        .where(
          and(
            eq(chapters.id, params.chapterId),
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
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update chapter' },
        { status: 500 }
      );
    }
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
  { params }: { params: { slug: string; chapterId: string } }
) {
  try {
    console.log('PATCH /api/books/by-slug/[slug]/chapters/[chapterId] called');
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
          eq(books.slug, params.slug),
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

    // Ensure chapterId is always a string for database queries
    const chapterIdParam = String(params.chapterId).trim();
    
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
    
    // Get the update data from the request body
    const updateData = await req.json();
    
    console.log('Received update ', JSON.stringify(updateData, null, 2));
    
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
    if (!chapterToUpdate && !isNaN(Number(params.chapterId))) {
      console.log('Chapter not found with UUID, trying numeric ID...');
      const numericChapters = await db
        .select()
        .from(chapters)
        .where(
          and(
            eq(chapters.id, String(params.chapterId)), // Try with string ID
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
          details: { chapterId: params.chapterId, bookId: book.id }
        },
        { status: 404 }
      );
    }
    
    // Validate update data
    const allowedFields: UpdateFieldKey[] = ['title', 'content', 'order', 'level', 'parentChapterId', 'wordCount', 'readingTime'];
    const validUpdate: DbUpdateFields = {};
    
    console.log('Allowed fields:', allowedFields);
    
    // Only allow specific fields to be updated
    for (const field of allowedFields) {
      console.log(`Checking field: ${field}, exists: ${field in updateData}, value:`, updateData[field]);
      
      if (field in updateData && updateData[field] !== undefined) {
        validUpdate[field] = updateData[field];
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
    if ('parentChapterId' in validUpdate && validUpdate.parentChapterId !== null) {
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
      if (validUpdate.parentChapterId === params.chapterId) {
        return NextResponse.json(
          { error: 'A chapter cannot be its own parent' },
          { status: 400 }
        );
      }
    }
    
    // Add updatedAt timestamp
    validUpdate.updatedAt = new Date();
  
    // Ensure content is properly serialized
    if ('content' in validUpdate && validUpdate.content !== undefined) {
      validUpdate.content = typeof validUpdate.content === 'string' 
        ? validUpdate.content 
        : validUpdate.content === null 
          ? '' 
          : JSON.stringify(validUpdate.content);
    }
  
    console.log('Update values with dates:', JSON.stringify(validUpdate, null, 2));
    
    // Convert UpdateFields to DbUpdateFields for database operation
    const dbUpdateFields: DbUpdateFields = {};
    
    Object.entries(validUpdate).forEach(([key, value]) => {
      switch (key as UpdateFieldKey) {
        case 'title':
          if (typeof value === 'string') dbUpdateFields.title = value;
          break;
        case 'content':
          if (value === null) {
            // If content is null, set empty string to match DB schema
            dbUpdateFields.content = '';
          } else if (typeof value === 'object') {
            // Ensure we have proper ChapterContent with type
            const contentObj: ChapterContent = {
              type: 'doc',
              ...(value as object)
            };
            dbUpdateFields.content = JSON.stringify(contentObj);
          } else if (typeof value === 'string') {
            dbUpdateFields.content = value;
          } else {
            // Fallback for any other case
            dbUpdateFields.content = '';
          }
          break;
        case 'excerpt':
          if (value === null || typeof value === 'string') dbUpdateFields.excerpt = value;
          break;
        case 'order':
          if (typeof value === 'number') dbUpdateFields.order = value;
          break;
        case 'level':
          if (typeof value === 'number') dbUpdateFields.level = value;
          break;
        case 'isDraft':
          if (typeof value === 'boolean') dbUpdateFields.isDraft = value;
          break;
        case 'parentChapterId':
          if (value === null || typeof value === 'string') dbUpdateFields.parentChapterId = value;
          break;
        case 'wordCount':
          if (typeof value === 'number') dbUpdateFields.wordCount = value;
          break;
        case 'readingTime':
          if (value === null || typeof value === 'number') dbUpdateFields.readingTime = value;
          break;
        case 'updatedAt':
          if (value instanceof Date) dbUpdateFields.updatedAt = value;
          break;
      }
    });

    // Update the chapter
    const [updatedChapter] = await db
      .update(chapters)
      .set(dbUpdateFields)
      .where(
        and(
          eq(chapters.id, params.chapterId),
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