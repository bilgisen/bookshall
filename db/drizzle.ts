import { config } from "dotenv";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Load environment variables
config({ path: ".env.local" });

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// Create the database client with Supabase configuration
const client = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 60,
  connection: {
    options: `-c search_path=public`,
  },
});

// Create the drizzle instance with the schema
const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

export { db, client };

export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
