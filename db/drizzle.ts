import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './edge-schema';

// Create the drizzle instance with the schema
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Re-export schema and types for convenience
export * from './edge-schema';

// Export database types
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Helper function to execute raw SQL queries
export async function executeQuery<T = any>(query: string, params?: any[]): Promise<{ rows: T[] }> {
  try {
    const result = await sql.unsafe(query, params || []);
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
