// lib/db.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

// Environment variable kontrolü
if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

// PostgreSQL bağlantı yapılandırması
const client = postgres(process.env.POSTGRES_URL_NON_POOLING, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 60,
  connection: {
    options: '-c search_path=public',
  },
});

// Bağlantı testi
async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Drizzle instance oluşturma
export const db = drizzle(client, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Types export
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Re-export schema
export * from '../db/schema';

// Bağlantı testini gerçekleştir
testConnection().catch(console.error);

// Client export
export { client };