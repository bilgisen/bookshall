import { db } from "@/db/drizzle";
import { account, session, subscription, user, verification } from "@/db/schema";
import {
  checkout,
  polar,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
// Remove unused import since we're not using eq

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

interface SubscriptionData {
  id: string;
  created_at?: string | Date;
  modified_at?: string | Date | null;
  amount?: number;
  currency?: string;
  recurring_interval?: string;
  status?: string;
  current_period_start?: string | Date;
  current_period_end?: string | Date;
  cancel_at_period_end?: boolean;
  canceled_at?: string | Date | null;
  started_at?: string | Date;
  ends_at?: string | Date | null;
  ended_at?: string | Date | null;
  customer_id?: string;
  customerId?: string;
  product_id?: string;
  productId?: string;
  discount_id?: string | null;
  discountId?: string | null;
  checkout_id?: string;
  checkoutId?: string;
  customer_cancellation_reason?: string | null;
  customerCancellationReason?: string | null;
  customer_cancellation_comment?: string | null;
  customerCancellationComment?: string | null;
  metadata?: Record<string, unknown> | null;
  custom_field_data?: Record<string, unknown> | null;
  customFieldData?: Record<string, unknown> | null;
  user?: { id?: string };
  customer?: { id?: string; external_id?: string };
  user_id?: string;
}

// Process subscription update from webhook or customer state change
async function processSubscriptionUpdate(subData: SubscriptionData | null, userId?: string) {
  if (!subData) return null;
  
  console.log("👤 [Subscription] Processing subscription:", subData.id);
  
  // Extract user ID from various possible locations in the payload
  const resolvedUserId = userId || 
                        subData.user?.id || 
                        subData.customer?.external_id || 
                        subData.customer?.id || 
                        subData.user_id ||
                        null;
  
  console.log("🔑 [Subscription] Resolved user ID:", resolvedUserId);
  
  // Build subscription data with proper schema mapping for Drizzle
  const subscriptionData = {
    id: subData.id,
    createdAt: safeParseDate(subData.created_at) || new Date(),
    modifiedAt: safeParseDate(subData.modified_at) || new Date(),
    amount: subData.amount || 0,
    currency: subData.currency || 'usd',
    recurringInterval: subData.recurring_interval || 'month',
    status: subData.status || 'active',
    currentPeriodStart: safeParseDate(subData.current_period_start) || new Date(),
    currentPeriodEnd: safeParseDate(subData.current_period_end) || new Date(),
    cancelAtPeriodEnd: subData.cancel_at_period_end || false,
    canceledAt: safeParseDate(subData.canceled_at),
    startedAt: safeParseDate(subData.started_at) || new Date(),
    endsAt: safeParseDate(subData.ends_at),
    endedAt: safeParseDate(subData.ended_at),
    customerId: subData.customer_id || subData.customer?.id || null,
    productId: subData.product_id || null,
    discountId: subData.discount_id || null,
    checkoutId: subData.checkout_id || "",
    customerCancellationReason: subData.customer_cancellation_reason || null,
    customerCancellationComment: subData.customer_cancellation_comment || null,
    metadata: subData.metadata ? JSON.stringify(subData.metadata) : null,
    customFieldData: subData.custom_field_data ? JSON.stringify(subData.custom_field_data) : null,
    userId: resolvedUserId,
  };
  
  // Log the data being saved to the database
  console.log("📊 [DB] Prepared subscription data for database:", JSON.stringify({
    ...subscriptionData,
    metadata: subscriptionData.metadata ? '[REDACTED]' : null,
    customFieldData: subscriptionData.customFieldData ? '[REDACTED]' : null
  }, null, 2));

  // Only log if we have valid subscription data
  if (subscriptionData) {
    console.log("💾 [Subscription] Processed subscription data:", {
      id: subscriptionData.id,
      status: subscriptionData.status,
      userId: subscriptionData.userId,
      amount: subscriptionData.amount,
      customerId: subscriptionData.customerId,
      productId: subscriptionData.productId,
      currentPeriodStart: subscriptionData.currentPeriodStart ? new Date(subscriptionData.currentPeriodStart).toISOString() : null,
      currentPeriodEnd: subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd).toISOString() : null,
    });
  }

  return subscriptionData;
}

// Env check
if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error("Missing POLAR_ACCESS_TOKEN");
}
if (!process.env.POLAR_ENVIRONMENT) {
  throw new Error("Missing POLAR_ENVIRONMENT");
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server:
    process.env.POLAR_ENVIRONMENT === "production"
      ? "production"
      : "sandbox",
});

export const auth = betterAuth({
  trustedOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  allowedDevOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
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
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId:
                process.env.NEXT_PUBLIC_STARTER_TIER ||
                (() => {
                  throw new Error(
                    "NEXT_PUBLIC_STARTER_TIER environment variable is required",
                  );
                })(),
              slug:
                process.env.NEXT_PUBLIC_STARTER_SLUG ||
                (() => {
                  throw new Error(
                    "NEXT_PUBLIC_STARTER_SLUG environment variable is required",
                  );
                })(),
            },
          ],
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${process.env.POLAR_SUCCESS_URL}`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret:
            process.env.POLAR_WEBHOOK_SECRET ||
            (() => {
              throw new Error(
                "POLAR_WEBHOOK_SECRET environment variable is required",
              );
            })(),
          onPayload: async ({ data, type }) => {
            console.log(`🔍 [Webhook] Received webhook type: ${type}`);
            
            const supportedEvents = [
              "subscription.created", 
              "subscription.active", 
              "subscription.canceled", 
              "subscription.revoked", 
              "subscription.uncanceled", 
              "subscription.updated",
              "customer.state_changed"
            ];
            
            if (!supportedEvents.includes(type)) {
              console.log(`ℹ️ [Webhook] Skipping unsupported event type: ${type}`);
              return;
            }
            
            console.log("🎯 [Webhook] Processing webhook type:", type);
            console.log("📦 [Webhook] Payload data:", JSON.stringify(data, null, 2));

            // Handle customer state changes
            if (type === 'customer.state_changed') {
              try {
                const customer = data;
                console.log("👤 [Customer] Processing customer state change for:", customer.email);
                
                // Process each active subscription for the customer
                if (customer.active_subscriptions && customer.active_subscriptions.length > 0) {
                  for (const sub of customer.active_subscriptions) {
                    await processSubscriptionUpdate(sub, customer.external_id);
                  }
                } else {
                  console.log("ℹ️ [Customer] No active subscriptions found");
                }
                return; // Exit after processing customer state change
              } catch (error) {
                const err = error as Error;
                console.error("💥 [CUSTOMER ERROR] Error processing customer state change:", err);
                return; // Continue to avoid marking webhook as failed
              }
            }

            // Handle subscription events
            try {
              // Extract subscription data from webhook payload
              const subscriptionData = await processSubscriptionUpdate(data, data.customer?.external_id);

              if (!subscriptionData) {
                console.log("ℹ️ [DB] No subscription data to process");
                return;
              }
              
              console.log("💾 [Webhook] Final subscription data:", {
                id: subscriptionData.id,
                status: subscriptionData.status,
                userId: subscriptionData.userId,
                amount: subscriptionData.amount,
                customerId: subscriptionData.customerId,
                productId: subscriptionData.productId,
                currentPeriodStart: subscriptionData.currentPeriodStart ? new Date(subscriptionData.currentPeriodStart).toISOString() : null,
                currentPeriodEnd: subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd).toISOString() : null,
              });
              
              // STEP 3: Use Drizzle's onConflictDoUpdate for proper upsert
              console.log("💾 [DB] Attempting to upsert subscription data");
              
              try {
                // Insert or update the subscription in the database
                const result = await db
                  .insert(subscription)
                  .values(subscriptionData)
                  .onConflictDoUpdate({
                    target: subscription.id,
                    set: {
                      modifiedAt: new Date(),
                      amount: subscriptionData.amount,
                      currency: subscriptionData.currency,
                      recurringInterval: subscriptionData.recurringInterval,
                      status: subscriptionData.status,
                      currentPeriodStart: subscriptionData.currentPeriodStart,
                      currentPeriodEnd: subscriptionData.currentPeriodEnd,
                      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                      canceledAt: subscriptionData.canceledAt,
                      startedAt: subscriptionData.startedAt,
                      endsAt: subscriptionData.endsAt,
                      endedAt: subscriptionData.endedAt,
                      customerId: subscriptionData.customerId,
                      productId: subscriptionData.productId,
                      discountId: subscriptionData.discountId,
                      checkoutId: subscriptionData.checkoutId,
                      customerCancellationReason: subscriptionData.customerCancellationReason,
                      customerCancellationComment: subscriptionData.customerCancellationComment,
                      metadata: subscriptionData.metadata,
                      customFieldData: subscriptionData.customFieldData,
                      userId: subscriptionData.userId,
                    },
                  });
                  
                console.log("✅ [DB] Successfully upserted subscription:", subscriptionData.id);
                console.log("📊 [DB] Database operation result:", JSON.stringify(result, null, 2));
              } catch (dbError) {
                const error = dbError as Error;
                console.error("💥 [DB ERROR] Error saving subscription to database:", error);
                console.error("📌 [DB ERROR] Error details:", {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                  type: type,
                  subscriptionId: data.id,
                  timestamp: new Date().toISOString()
                });
                // Don't throw - let webhook succeed to avoid retries
                return; // Add return to prevent falling through to outer catch
              }
            } catch (error) {
              const err = error as Error;
              console.error("💥 [ERROR] Error in webhook processing:", err);
              console.error("📌 [ERROR] Error details:", {
                name: err.name,
                message: err.message,
                stack: err.stack,
                type: type,
                timestamp: new Date().toISOString()
              });
              // Don't throw - let webhook succeed to avoid retries
            }
          },
        }),
      ],
    }),
    nextCookies(),
  ],
});