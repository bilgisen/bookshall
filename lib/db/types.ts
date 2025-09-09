import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Type representing a database transaction
 */
export type DbTransaction = Parameters<Parameters<PostgresJsDatabase['transaction']>[0]>[0];
