import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // The auth middleware will handle the webhook verification and processing
    // based on the configuration in lib/auth.ts
    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Webhook error:', error instanceof Error ? error.message : 'Unknown error');
    return new NextResponse(
      JSON.stringify({
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
