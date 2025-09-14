// lib/db/edge-client.ts
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from '../../db/edge-schema';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required for Edge Runtime');
}

// Create the drizzle instance with the Edge-compatible schema
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export types
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Re-export schema types for convenience
export * from '../../db/edge-schema';
