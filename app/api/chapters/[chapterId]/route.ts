import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { chapters, books } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Schema for chapter ID parameter (numeric ID)
const chapterIdSchema = z.object({
  chapterId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Invalid chapter ID: must be a number');
    return num;
  }),
});

// Schema for updating a chapter
const updateChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().optional(),
  order: z.number().int().min(0).optional(),
  level: z.number().int().min(1).max(6).optional(),
  parent_chapter_id: z.number().int().positive('Invalid parent chapter ID').nullable().optional(),
  is_published: z.boolean().optional(),
  slug: z.string().optional(),
  book_id: z.number().int().positive('Invalid book ID').optional(),
});

type UpdateChapterInput = z.infer<typeof updateChapterSchema>;

export async function GET(
  request: Request,
  context: { params: { chapterId: string } }
) {
  console.log('GET /api/chapters/[chapterId] called');
  
  try {
    // Await params before accessing chapterId
    const { chapterId } = await context.params;
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const [chapter] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.id, parseInt(chapterId)),
          // Add user check if chapters table has userId
          // eq(chapters.userId, response.user.id)
        )
      )
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    console.log('Returning chapter:', chapter.id);
    return NextResponse.json(chapter);
  } catch (error) {
    console.error('Error in GET /api/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update a chapter
export async function PATCH(
  request: Request,
  context: { params: { chapterId: string } }
) {
  console.log('PATCH /api/chapters/[chapterId] called');
  
  try {
    // Await params before accessing chapterId
    const { chapterId } = await context.params;
    const body = await request.json();
    
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const [chapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, parseInt(chapterId)))
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    const [updatedChapter] = await db
      .update(chapters)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, parseInt(chapterId)))
      .returning();

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Error in PATCH /api/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a chapter
export async function DELETE(
  request: Request,
  context: { params: { chapterId: string } }
) {
  console.log('DELETE /api/chapters/[chapterId] called');
  
  try {
    // Await params before accessing chapterId
    const { chapterId } = await context.params;
    
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!response?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // First check if chapter exists
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, parseInt(chapterId)))
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    const [deletedChapter] = await db
      .delete(chapters)
      .where(eq(chapters.id, parseInt(chapterId)))
      .returning();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}