import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

// Use the test database URL from environment variables
const connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required for tests');
}

// Create a single connection for testing
const client = postgres(connectionString, {
  max: 1, // Use a single connection for tests
  ssl: 'require',
  idle_timeout: 20,
  max_lifetime: 60 * 30
});

// Create the test database instance
export const testDb = drizzle(client, { schema });

export async function setupTestDatabase() {
  try {
    // Add any test database setup here if needed
    console.log('Test database connection established');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase() {
  try {
    // Add any test database cleanup here if needed
    await client.end();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error during test database teardown:', error);
    throw error;
  }
}
