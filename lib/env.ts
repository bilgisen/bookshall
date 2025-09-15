// lib/env.ts

// Server-side environment variables
export const env = {
  // Database
  databaseUrl: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL,
  
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
  
  // App
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validate required environment variables
if (typeof window === 'undefined') {
  // Server-side validations
  const requiredVars = ['databaseUrl', 'supabaseUrl', 'supabaseAnonKey'];
  const missingVars = requiredVars.filter(key => !env[key as keyof typeof env]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export default env;
