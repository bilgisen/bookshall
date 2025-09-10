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
  trustedOrigins: allowedOrigins,
  allowedDevOrigins: allowedOrigins,
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // Cache duration in seconds
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      subscription,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    nextCookies(),
  ],
});
