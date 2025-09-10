import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { setTimeout } from 'timers/promises';

// Load environment variables
if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// Connection configuration
const connectionConfig: postgres.Options<{}> = {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : 'allow',
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 60,
  connection: {
    options: `-c search_path=public`,
  },
};

// Function to create database connection with retries
async function createDbConnection() {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to database (attempt ${attempt}/${maxRetries})...`);
      const client = postgres(process.env.POSTGRES_URL_NON_POOLING!, connectionConfig);
      
      // Test the connection
      await client`SELECT 1`;
      console.log('Successfully connected to the database');
      
      return client;
    } catch (error) {
      lastError = error;
      console.error(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await setTimeout(delay);
      }
    }
  }
  
  console.error('Failed to connect to database after multiple attempts');
  throw lastError;
}

// Create the database client
const client = await createDbConnection();

// Create the drizzle instance with the schema
const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export types for type safety
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Re-export schema types for convenience
export * from '../db/schema';

export { client, db };
