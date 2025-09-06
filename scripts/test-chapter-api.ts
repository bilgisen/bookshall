import { db } from '../db/drizzle';
import { books, chapters } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

async function testChapterApi() {
  try {
    // Get the most recently created book with chapters
    const bookWithChapters = await db.query.books.findFirst({
      orderBy: (books, { desc }) => [desc(books.createdAt)],
      with: {
        chapters: {
          orderBy: (chapters, { desc }) => [desc(chapters.createdAt)],
          limit: 1,
        },
      },
    });

    if (!bookWithChapters || !bookWithChapters.chapters?.[0]) {
      console.log('No books with chapters found in the database.');
      return;
    }

    const book = bookWithChapters;
    const chapter = bookWithChapters.chapters[0];
    
    console.log('Found test data:');
    console.log(`- Book ID: ${book.id}`);
    console.log(`- Book Title: ${book.title}`);
    console.log(`- Book Slug: ${book.slug}`);
    console.log(`- Chapter ID: ${chapter.id}`);
    console.log(`- Chapter Title: ${chapter.title}`);

    console.log('Testing API with:');
    console.log(`- Book ID: ${book.id}`);
    console.log(`- Book Slug: ${book.slug}`);
    console.log(`- Chapter ID: ${chapter.id}`);

    // Get auth token from the browser's cookies
    const cookieStore = cookies();
    const token = cookieStore.get('__Secure-next-auth.session-token') || 
                 cookieStore.get('next-auth.session-token');
    
    if (!token) {
      console.error('No auth token found. Please log in first.');
      return;
    }

    console.log('Auth token found. Testing API endpoint...');
    
    // Test the API endpoint with auth token
    const response = await fetch(
      `http://localhost:3000/api/books/by-slug/${book.slug}/chapters/${chapter.id}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `${token.name}=${token.value}`
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`API Error (${response.status}): ${error}`);
      return;
    }

    const data = await response.json();
    console.log('\nAPI Response:');
    console.log(JSON.stringify(data, null, 2));

    // Verify the response structure
    const requiredFields = [
      'id', 'title', 'content', 'order', 'level', 'isDraft',
      'wordCount', 'createdAt', 'updatedAt', 'bookId', 'book'
    ];

    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      console.error('\nMissing required fields in response:', missingFields);
    } else {
      console.log('\n✅ All required fields are present in the response');
    }

    // Verify book info
    const requiredBookFields = ['id', 'title', 'slug'];
    const missingBookFields = requiredBookFields.filter(field => !(field in data.book));
    if (missingBookFields.length > 0) {
      console.error('\nMissing required book fields:', missingBookFields);
    } else {
      console.log('✅ All required book fields are present');
    }

  } catch (error) {
    console.error('Error testing chapter API:', error);
  } finally {
    process.exit(0);
  }
}

testChapterApi();
