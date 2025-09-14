import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  console.error('❌ Error: POSTGRES_URL_NON_POOLING is not set in environment variables');
  process.exit(1);
}

// Create a test database connection
const db = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
});

async function findTestUser() {
  try {
    console.log('🔍 Looking for test users...');
    
    // Find users with credit transactions
    const users = await db`
      SELECT u.id, u.email, COUNT(t.id) as transaction_count
      FROM "user" u
      LEFT JOIN credit_transactions t ON t.user_id = u.id
      GROUP BY u.id, u.email
      ORDER BY transaction_count DESC
      LIMIT 5
    `;
    
    console.log('\nFound users:');
    console.table(users);
    
    if (users.length === 0) {
      console.log('\nNo users found. Please create a user first.');
    } else {
      console.log('\nTo use a specific user for testing, copy their ID and set it in your test script.');
    }
    
  } catch (error) {
    console.error('❌ Error finding test users:');
    console.error(error);
  } finally {
    await db.end();
  }
}

findTestUser();
