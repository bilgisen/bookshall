import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // The auth middleware will handle the webhook verification and processing
    // based on the configuration in lib/auth.ts
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}
