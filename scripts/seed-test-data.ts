import { db } from '../db/drizzle';
import { books, chapters, user } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seedTestData() {
  try {
    // Get an existing user ID from the database
    const existingUser = await db.query.user.findFirst();
    
    if (!existingUser) {
      console.error('No users found in the database. Please create a user first.');
      return;
    }
    
    const testUserId = existingUser.id;
    
    // Create a test book
    const [book] = await db.insert(books).values({
      userId: testUserId,
      title: 'Test Book',
      slug: 'test-book-' + uuidv4().substring(0, 8),
      author: 'Test Author',
      isPublished: true,
    }).returning();

    console.log(`Created test book: ${book.title} (ID: ${book.id})`);

    // Create a test chapter
    const [chapter] = await db.insert(chapters).values({
      bookId: book.id,
      title: 'Test Chapter',
      content: JSON.stringify([
        {
          type: 'heading',
          children: [{ text: 'Welcome to the Test Chapter' }],
        },
        {
          type: 'paragraph',
          children: [
            { text: 'This is a test chapter with some ' },
            { text: 'formatted', bold: true },
            { text: ' content.' },
          ],
        },
      ]),
      order: 1,
      level: 1,
      isDraft: false,
      wordCount: 10,
      readingTime: 2,
    }).returning();

    console.log(`Created test chapter: ${chapter.title} (ID: ${chapter.id})`);
    console.log(`\nYou can now view the chapter at:`);
    console.log(`http://localhost:3000/dashboard/books/${book.slug}/chapters/${chapter.id}/view`);

  } catch (error) {
    console.error('Error seeding test data:', error);
  } finally {
    process.exit(0);
  }
}

seedTestData();
