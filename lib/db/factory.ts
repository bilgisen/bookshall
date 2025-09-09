import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the database client
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 60,
});

// Create the drizzle instance with the schema
export const db = drizzle<typeof schema>(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? true : false,
});
