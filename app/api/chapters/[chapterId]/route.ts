import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { chapters } from '@/db/schema';
import { eq, and } from 'drizzle-orm';


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
          eq(chapters.id, chapterId),
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
      .where(eq(chapters.id, chapterId))
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
      .where(eq(chapters.id, chapterId))
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
      .where(eq(chapters.id, chapterId))
      .limit(1);

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' }, 
        { status: 404 }
      );
    }

    // Delete the chapter and capture the result
    const deleteResult = await db
      .delete(chapters)
      .where(eq(chapters.id, chapterId))
      .returning();

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete chapter' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chapters/[chapterId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}