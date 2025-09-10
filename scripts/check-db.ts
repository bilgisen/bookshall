import postgres from 'postgres';
import { db } from '../db/drizzle';
import { books, chapters } from '../db/schema';

async function checkConnection(url: string) {
  try {
    console.log('\n=== Testing Database Connection ===');
    console.log('Connection URL:', url.replace(/:([^:]+)@/, ':***@'));
    
    const testClient = postgres(url, { 
      max: 1,
      idle_timeout: 5,
      ssl: 'allow',
      connection: {
        options: '-c search_path=public',
      },
    });

    // Test basic connection
    const result = await testClient`SELECT version() as version`;
    console.log('✅ Database version:', result[0]?.version || 'Unknown');
    
    // Test if we can query the database
    const tables = await testClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('\n=== Database Tables ===');
    console.log(tables.length > 0 
      ? tables.map(t => `• ${t.table_name}`).join('\n')
      : 'No tables found in public schema');
    
    await testClient.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

async function checkTables() {
  try {
    console.log('\n=== Checking Tables ===');
    
    // Check books table
    const booksResult = await db.select().from(books).limit(1);
    console.log('Books table:', booksResult.length > 0 ? '✅ Found with data' : '⚠️  Empty or not accessible');
    
    // Check chapters table
    const chaptersResult = await db.select().from(chapters).limit(1);
    console.log('Chapters table:', chaptersResult.length > 0 ? '✅ Found with data' : '⚠️  Empty or not accessible');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL_NON_POOLING;
  
  if (!dbUrl) {
    console.error('❌ Error: POSTGRES_URL_NON_POOLING environment variable is not set');
    process.exit(1);
  }
  
  const connectionOk = await checkConnection(dbUrl);
  
  if (connectionOk) {
    await checkTables();
  }
  
  process.exit(connectionOk ? 0 : 1);
}

main().catch(console.error);
