import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { and, eq } from 'drizzle-orm';
import { chapters, books } from '@/db/schema';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string; chapterId: string }> }
) {
  // Await the params to ensure they're resolved
  const params = await context.params;
  console.log('GET /api/books/by-slug/[slug]/chapters/[chapterId] called');
  
  try {
    const { slug, chapterId: chapterIdParam } = params;
    
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
          eq(books.slug, slug),
          eq(books.userId, sessionResponse.user.id)
        )
      )
      .limit(1);

    if (!book) {
      console.log('Book not found for slug:', slug);
      return NextResponse.json(
        { error: 'Book not found' }, 
        { status: 404 }
      );
    }

    // Convert chapterId to number since that's what the database expects
    const chapterId = parseInt(chapterIdParam, 10);
    if (isNaN(chapterId)) {
      console.log('Invalid chapter ID format:', chapterIdParam);
      return NextResponse.json(
        { error: 'Invalid chapter ID format' },
        { status: 400 }
      );
    }

    console.log('Fetching chapter with ID:', chapterId, 'for book ID:', book.id);
    
    // Get the chapter with basic book information
    const [chapterData] = await db
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

    if (!chapterData) {
      console.log('Chapter not found for id:', chapterId);
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }
    
    console.log('Chapter data retrieved from DB:', {
      id: chapterData.id,
      title: chapterData.title,
      hasContent: chapterData.content !== undefined && chapterData.content !== null,
      contentType: typeof chapterData.content
    });

    // Prepare response data with proper serialization
    const { book: bookData, ...restChapterData } = chapterData;
    
    // Ensure content is in proper Tiptap JSON format
    let content = null;
    if (chapterData.content !== null && chapterData.content !== undefined) {
      if (typeof chapterData.content === 'string') {
        try {
          // Try to parse as JSON (Tiptap format)
          content = JSON.parse(chapterData.content);
        } catch (e) {
          // If it's not JSON, it might be HTML - convert to Tiptap format
          if (chapterData.content.trim().startsWith('<')) {
            try {
              content = generateJSON(chapterData.content, [StarterKit]);
            } catch (parseError) {
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
              };
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
            };
          }
        }
      } else {
        // Already an object (Tiptap JSON format)
        content = chapterData.content;
      }
    }

    const responseData = {
      ...restChapterData,
      content,
      id: Number(restChapterData.id),
      bookId: Number(restChapterData.bookId),
      order: Number(restChapterData.order),
      level: Number(restChapterData.level),
      wordCount: restChapterData.wordCount ? Number(restChapterData.wordCount) : 0,
      readingTime: restChapterData.readingTime ? Number(restChapterData.readingTime) : null,
      parentChapterId: restChapterData.parentChapterId ? Number(restChapterData.parentChapterId) : null,
      createdAt: new Date(restChapterData.createdAt).toISOString(),
      updatedAt: new Date(restChapterData.updatedAt).toISOString(),
      book: {
        id: Number(bookData.id),
        title: bookData.title,
        slug: bookData.slug,
        author: bookData.author || null,
        coverImageUrl: bookData.coverImageUrl || null,
        language: bookData.language,
        subtitle: bookData.subtitle || null,
        publisher: bookData.publisher || null,
        publishYear: bookData.publishYear || null,
        isbn: bookData.isbn || null,
        description: bookData.description || null,
        createdAt: new Date(bookData.createdAt).toISOString(),
        updatedAt: new Date(bookData.updatedAt).toISOString()
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
  context: { params: Promise<{ slug: string; chapterId: string }> }
) {
  const params = await context.params;
  console.log('PUT /api/books/by-slug/[slug]/chapters/[chapterId] called');
  try {
    const { slug, chapterId: chapterIdParam } = params;
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

    const chapterId = Number(chapterIdParam);
    if (isNaN(chapterId)) {
      return NextResponse.json(
        { error: 'Invalid chapter ID' },
        { status: 400 }
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
          } catch (e) {
            // If parsing fails, treat as HTML/plain text
            if (content.trim().startsWith('<')) {
              // Convert HTML to Tiptap JSON
              try {
                updateData.content = generateJSON(content, [StarterKit]);
              } catch (htmlError) {
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
          } catch (e) {
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
    const updateFields: any = {
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.content !== undefined && { content: updateData.content }),
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
      // Update the chapter
      const [updatedChapter] = await db
        .update(chapters)
        .set(updateFields)
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
  context: { params: Promise<{ slug: string; chapterId: string }> }
) {
  try {
    const params = await context.params;
    console.log('PATCH /api/books/by-slug/[slug]/chapters/[chapterId] called');
    
    const { slug, chapterId: chapterIdParam } = params;
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

    const chapterId = Number(chapterIdParam);
    if (isNaN(chapterId)) {
      return NextResponse.json(
        { error: 'Invalid chapter ID' },
        { status: 400 }
      );
    }

    // Get the update data from the request body
    const updateData = await req.json();
    
    // Validate update data
    const allowedFields = ['order', 'level', 'parentChapterId'];
    const validUpdate: Record<string, any> = {};
    
    // Only allow specific fields to be updated
    for (const field of allowedFields) {
      if (field in updateData && updateData[field] !== undefined) {
        validUpdate[field] = updateData[field];
      }
    }
    
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
            eq(chapters.id, validUpdate.parentChapterId),
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