import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHmac } from "crypto";
import { PolarWebhookService } from "@/lib/services/polar/webhook-service";

// Force Node.js runtime for transactions
export const runtime = "nodejs";

// Verify the webhook signature
function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ POLAR_WEBHOOK_SECRET is not set");
    return false;
  }
  
  try {
    const digest = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const isSignatureValid = signature === digest;
    if (!isSignatureValid) {
      console.error('❌ Invalid webhook signature');
    }
    
    return isSignatureValid;
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Get headers and raw payload
    const headersList = await headers();
    const signature = headersList.get('polar-signature') || '';
    const payload = await req.text();
    
    // Log incoming webhook for debugging
    console.log('🔔 Received Polar webhook with type:', headersList.get('polar-event-type'));

    // Verify the webhook signature
    if (!verifySignature(payload, signature)) {
      console.error('❌ Webhook signature verification failed');
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Define the Polar webhook event type
    interface PolarWebhookEvent {
      id: string;
      type: string;
      data: {
        object: Record<string, unknown>;
      };
      // Add other expected properties based on Polar's webhook documentation
      [key: string]: unknown;
    };

    // Parse the event
    let event: PolarWebhookEvent;
    try {
      event = JSON.parse(payload);
      console.log(`🔍 Processing event: ${event.type} (ID: ${event.id})`);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // Handle the webhook event using our service
    try {
      await PolarWebhookService.handleWebhookEvent(event);
      console.log(`✅ Successfully processed event: ${event.type}`);
      
      return new NextResponse(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (handleError) {
      console.error(`❌ Error handling event ${event.type}:`, handleError);
      // Still return 200 to prevent Polar from retrying for non-retryable errors
      return new NextResponse("Event handling failed", { status: 200 });
    }
    
  } catch (error) {
    console.error("❌ Unhandled error in webhook handler:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
