// lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// Create the database client with Supabase configuration
const client = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 60,
  ssl: 'require',
  connection: {
    options: `-c search_path=public`,
  },
});

// Create the drizzle instance with the schema
const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export the database client and types
export { db, client };
export type { PostgresJsDatabase };

export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Re-export schema types for convenience
export * from '../../db/schema';
