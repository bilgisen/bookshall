import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  console.log('GET /api/books/by-slug called');
  
  try {
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const response = await auth.api.getSession({
      headers: request.headers,
    });
    
    console.log('Session response:', {
      user: response?.user ? 'User exists' : 'No user',
      userId: response?.user?.id,
      sessionId: response?.session?.id
    });
    
    if (!response?.user) {
      console.log('Unauthorized: No user in session');
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('Fetching books for user:', response.user.id);
    
    // Get all books for the authenticated user
    const userBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, response.user.id))
      .orderBy(books.createdAt);
      
    console.log(`Found ${userBooks.length} books for user ${response.user.id}`);
    
    return NextResponse.json(userBooks);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    );
  }
}
