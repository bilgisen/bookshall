// types/db.d.ts
import { PgTable } from 'drizzle-orm/pg-core';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

declare module '@/db/schema' {
  export const user: PgTable;
  export const session: PgTable;
  export const account: PgTable;
  export const verification: PgTable;
  export const subscription: PgTable;
  // Add other exports as needed
}

declare module 'postgres' {
  interface Sql<O extends Record<string, unknown> = Record<string, unknown>> {
    <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
    sql<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  }
}

declare module '@/lib/db/client' {
  export const db: PostgresJsDatabase<Record<string, never>>;
  export const client: ReturnType<typeof postgres>;
}

export {};