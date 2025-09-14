import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { books } from '@/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string; filename: string }> }
) {
  try {
    // Get session from request
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { bookId, filename } = await params;

    if (!bookId || !filename) {
      return new NextResponse('Book ID and filename are required', { status: 400 });
    }

    // Verify user has access to this book
    const book = await db.query.books.findFirst({
      where: and(
        eq(books.id, bookId),
        eq(books.userId, session.user.id)
      ),
    });

    if (!book) {
      return new NextResponse('Book not found or access denied', { status: 404 });
    }

    // In a real implementation, you would:
    // 1. Get the file from your storage (S3, local filesystem, etc.)
    // 2. Stream it back to the client
    
    // For now, we'll return a placeholder response
    return new NextResponse('Ebook file content would be served here', {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
