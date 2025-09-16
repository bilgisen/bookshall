import { config } from 'dotenv';
import { defineConfig } from "drizzle-kit";

// Load environment variables
config({ path: '.env.local' });

// Validate required environment variables
if (!process.env.POSTGRES_URL_NON_POOLING) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is required');
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use NON_POOLING connection for migrations with Supabase
    url: process.env.POSTGRES_URL_NON_POOLING,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  },
  // Optional: Add additional configuration for better development experience
  verbose: true,
  strict: true,
});
