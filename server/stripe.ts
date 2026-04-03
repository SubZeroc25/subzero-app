/**
 * Stripe Billing Service
 * Handles Pro plan checkout, webhooks, and customer portal
 */

import * as db from "./db";

// Stripe is imported dynamically to avoid crashes when STRIPE_SECRET_KEY is not set
let stripeInstance: any = null;

async function getStripe() {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[Stripe] STRIPE_SECRET_KEY not configured");
    return null;
  }

  try {
    const Stripe = (await import("stripe")).default;
    stripeInstance = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as any });
    return stripeInstance;
  } catch (error) {
    console.error("[Stripe] Failed to initialize:", error);
    return null;
  }
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId: number, email: string, name?: string): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  // Check if user already has a Stripe customer ID
  const profile = await db.getOrCreateProfile(userId);
  if (profile?.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  // Create new Stripe customer
  try {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId: String(userId) },
    });

    await db.updateStripeCustomer(userId, {
      stripeCustomerId: customer.id,
    });

    return customer.id;
  } catch (error) {
    console.error("[Stripe] Failed to create customer:", error);
    return null;
  }
}

/**
 * Create a Stripe Checkout session for Pro plan upgrade
 */
export async function createCheckoutSession(
  userId: number,
  email: string,
  name?: string,
  successUrl?: string,
  cancelUrl?: string,
): Promise<{ url: string; sessionId: string } | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    console.error("[Stripe] STRIPE_PRO_PRICE_ID not configured");
    return null;
  }

  try {
    const customerId = await getOrCreateCustomer(userId, email, name);
    if (!customerId) return null;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081"}?checkout=success`,
      cancel_url: cancelUrl || `${process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081"}/pricing?checkout=cancelled`,
      metadata: { userId: String(userId) },
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("[Stripe] Failed to create checkout session:", error);
    return null;
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(
  userId: number,
  returnUrl?: string,
): Promise<string | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const profile = await db.getOrCreateProfile(userId);
  if (!profile?.stripeCustomerId) return null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: returnUrl || `${process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081"}/profile`,
    });

    return session.url;
  } catch (error) {
    console.error("[Stripe] Failed to create portal session:", error);
    return null;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  body: string | Buffer,
  signature: string,
): Promise<{ received: boolean; type?: string }> {
  const stripe = await getStripe();
  if (!stripe) return { received: false };

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET not configured");
    return { received: false };
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("[Stripe] Webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = parseInt(session.metadata?.userId || "0");
        if (userId && session.subscription) {
          await db.updateStripeCustomer(userId, {
            stripeSubscriptionId: session.subscription as string,
            plan: "pro",
          });
          console.log(`[Stripe] User ${userId} upgraded to Pro`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const profile = await db.getProfileByStripeCustomerId(subscription.customer as string);
        if (profile) {
          const isActive = ["active", "trialing"].includes(subscription.status);
          await db.updateStripeCustomer(profile.userId, {
            plan: isActive ? "pro" : "free",
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });
          console.log(`[Stripe] Subscription updated for user ${profile.userId}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const profile = await db.getProfileByStripeCustomerId(subscription.customer as string);
        if (profile) {
          await db.updateStripeCustomer(profile.userId, {
            plan: "free",
            stripeSubscriptionId: null,
            stripeCurrentPeriodEnd: null,
          });
          console.log(`[Stripe] Subscription cancelled for user ${profile.userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.warn(`[Stripe] Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return { received: true, type: event.type };
  } catch (error) {
    console.error("[Stripe] Webhook error:", error);
    return { received: false };
  }
}
