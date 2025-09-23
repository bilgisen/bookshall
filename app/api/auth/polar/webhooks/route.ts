import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Export the webhook handler from BetterAuth
// This will handle webhook verification and processing based on the configuration in lib/auth.ts
const handler = auth.handler;

// Export the handler as POST
// This is the correct way to expose the handler as a Next.js Route Handler
export const POST = handler;

// Ensure this route is not cached and runs on the edge
// This is important for webhooks which need to respond quickly
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

export async function GET() {
  // Simple health check endpoint
  return NextResponse.json({ status: 'ok' });
}
