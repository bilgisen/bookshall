import { db } from '../db/drizzle';
import { books, chapters } from '../db/schema';

async function checkDatabase() {
  try {
    console.log('Checking database connection and tables...');
    
    // Check if books table exists and has data
    const booksResult = await db.select().from(books).limit(1);
    console.log('Books table check:', booksResult.length > 0 ? 'OK' : 'No data or table not found');
    
    // Check if chapters table exists and has data
    const chaptersResult = await db.select().from(chapters).limit(1);
    console.log('Chapters table check:', chaptersResult.length > 0 ? 'OK' : 'No data or table not found');
    
    console.log('Database check completed');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
