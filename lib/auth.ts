// lib/auth.ts
import { db } from "@/db/drizzle";
import { account, session, subscription, user, verification } from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

// Define allowed origins for both development and production
const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const prodOrigins = [
  'https://bookshall.com',
  'https://www.bookshall.com',
];

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd ? prodOrigins : [...devOrigins, ...prodOrigins];

export const auth = betterAuth({
  // Base URL configuration
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || 'http://localhost:3000',
  
  // Security configurations
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
  
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  // CORS and origins
  trustedOrigins: allowedOrigins,
  allowedDevOrigins: allowedOrigins,
  
  // Cookie configuration
  cookies: {
    sessionToken: {
      name: `__Secure-better-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  
  // Database adapter
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
      subscription,
    },
  }),
  
  // Social providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    },
  },
  
  // Plugins
  plugins: [
    nextCookies(),
  ],
  
  // Debug logging in development
  debug: process.env.NODE_ENV === 'development',
  
  // Callbacks
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (session?.user) {
        session.user.id = token.sub || '';
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});
