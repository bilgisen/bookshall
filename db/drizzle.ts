import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { Parameter } from "postgres"; // Import Parameter type
import * as schema from "./schema";
import { env } from "@/lib/env";

if (!env.databaseUrl) {
  throw new Error("Database connection string is not configured.");
}

const client = postgres(env.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: "require",
  transform: {
    value: {
      from: (val: unknown) => {
        if (typeof val === "bigint") {
          return val < BigInt(Number.MAX_SAFE_INTEGER) ? Number(val) : val.toString();
        }
        return val;
      },
    },
  },
});

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

export * from "./schema";
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function executeQuery<T>(
  query: string,
  params: Parameter[] = [] // Use the Parameter type from postgres
): Promise<{ rows: T[] }> {
  try {
    const result = await client.unsafe<T[]>(query, params);
    return { rows: result };
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}