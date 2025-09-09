// types/db.d.ts
declare module '@/db/schema' {
  import { PgTable } from 'drizzle-orm/pg-core';
  
  export const user: PgTable;
  export const session: PgTable;
  export const account: PgTable;
  export const verification: PgTable;
  export const subscription: PgTable;
  // Add other exports as needed
}

declare module '@/lib/db/client' {
  import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
  
  export const db: PostgresJsDatabase;
  export const client: any; // Adjust the type as needed
}
