import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { userBalances } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Use the non-pooling connection string for direct database access
const DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING;

if (!DATABASE_URL) {
  console.error('POSTGRES_URL_NON_POOLING environment variable is required');
  process.exit(1);
}

// Create a single connection to the database
const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

async function checkUserBalance() {
  const userId = 'gDGJnnBuY2AMfDksLSENhjrbzPcX0KTW';
  
  try {
    console.log(`Checking balance for user: ${userId}`);
    
    // Check if user_balances table exists and has data
    const balance = await db
      .select({
        userId: userBalances.userId,
        balance: userBalances.balance,
        updatedAt: userBalances.updatedAt
      })
      .from(userBalances)
      .where(eq(userBalances.userId, userId));
    
    console.log('Query result:', balance);
    
    if (balance.length === 0) {
      console.log('No balance record found for user');
      
      // Try to insert a new record with default balance
      console.log('Attempting to create a new balance record...');
      const [newBalance] = await db
        .insert(userBalances)
        .values({
          userId,
          balance: 1000,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log('Created new balance record:', newBalance);
      return newBalance;
    }
    
    console.log('Found balance record:', balance[0]);
    return balance[0];
    
  } catch (error) {
    console.error('Error checking balance:', error);
    throw error;
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the check
checkUserBalance()
  .then(() => {
    console.log('Balance check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
