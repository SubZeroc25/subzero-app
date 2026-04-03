/**
 * External Service Routes
 * Stripe webhook/checkout endpoints
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import * as stripe from "./stripe";

/**
 * Authenticate request and return user, or send 401
 */
async function authenticateOrFail(req: Request, res: Response) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
}

export function registerExternalRoutes(app: Express) {
  // ── Stripe Billing ─────────────────────────────────────

  /**
   * Create Stripe Checkout session for Pro upgrade
   */
  app.post("/api/billing/checkout", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    if (!stripe.isStripeConfigured()) {
      res.status(503).json({
        error: "Stripe is not configured yet. Pro plan will be available soon.",
        configured: false,
      });
      return;
    }

    try {
      const result = await stripe.createCheckoutSession(
        user.id,
        user.email || "",
        user.name || undefined,
        req.body.successUrl,
        req.body.cancelUrl,
      );

      if (!result) {
        res.status(500).json({ error: "Failed to create checkout session" });
        return;
      }

      res.json({ url: result.url, sessionId: result.sessionId });
    } catch (error) {
      console.error("[Billing] Checkout failed:", error);
      res.status(500).json({ error: "Checkout failed" });
    }
  });

  /**
   * Create Stripe Customer Portal session
   */
  app.post("/api/billing/portal", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    if (!stripe.isStripeConfigured()) {
      res.status(503).json({ error: "Stripe is not configured", configured: false });
      return;
    }

    try {
      const url = await stripe.createPortalSession(user.id, req.body.returnUrl);
      if (!url) {
        res.status(400).json({ error: "No billing account found" });
        return;
      }
      res.json({ url });
    } catch (error) {
      console.error("[Billing] Portal failed:", error);
      res.status(500).json({ error: "Portal session failed" });
    }
  });

  /**
   * Get billing status
   */
  app.get("/api/billing/status", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    const profile = await db.getOrCreateProfile(user.id);
    res.json({
      plan: profile?.plan || "free",
      stripeConfigured: stripe.isStripeConfigured(),
      hasSubscription: !!profile?.stripeSubscriptionId,
      currentPeriodEnd: profile?.stripeCurrentPeriodEnd?.toISOString() || null,
    });
  });

  /**
   * Stripe Webhook handler
   * Must use raw body (not JSON parsed)
   */
  app.post("/api/billing/webhook",
    (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }

      let rawBody = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => { rawBody += chunk; });
      req.on("end", async () => {
        try {
          const result = await stripe.handleWebhookEvent(rawBody, signature);
          if (result.received) {
            res.json({ received: true, type: result.type });
          } else {
            res.status(400).json({ error: "Webhook processing failed" });
          }
        } catch (error) {
          console.error("[Webhook] Error:", error);
          res.status(500).json({ error: "Webhook handler error" });
        }
      });
    }
  );
}
