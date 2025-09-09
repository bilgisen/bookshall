// Test file to isolate TypeScript errors
import { db } from '@/db/drizzle';
import { books, chapters } from '@/db';
import { and, eq } from 'drizzle-orm';

// This is a test function to check the types
async function testQuery() {
  const result = await db
    .select({
      // Chapter fields
      id: chapters.id,
      uuid: chapters.uuid,
      bookId: chapters.bookId,
      title: chapters.title,
      content: chapters.content,
      // Book fields
      bookTitle: books.title,
      bookAuthor: books.author,
    })
    .from(chapters)
    .innerJoin(books, eq(chapters.bookId, books.id))
    .limit(1);

  console.log(result);
}

testQuery().catch(console.error);
