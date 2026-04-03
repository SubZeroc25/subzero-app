/**
 * External Service Routes
 * Gmail/Outlook OAuth callbacks and Stripe webhook/checkout endpoints
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import * as emailProviders from "./email-providers";
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

/**
 * Get the frontend URL for redirects.
 * Derives from the API base URL by replacing 3000- with 8081- prefix.
 */
function getFrontendUrl(): string {
  // Derive from API base URL (3000 -> 8081)
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
  if (apiBase) {
    return apiBase.replace(/3000-/, "8081-");
  }
  return process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
}

export function registerExternalRoutes(app: Express) {
  // ── Gmail OAuth ────────────────────────────────────────

  /**
   * Start Gmail OAuth flow
   * Redirects user to Google consent screen
   */
  app.get("/api/email/gmail/authorize", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    const validation = emailProviders.validateOAuthConfig("gmail");
    if (!validation.valid) {
      res.status(500).json({ error: validation.error, configured: false });
      return;
    }

    // Encode user ID in state for the callback
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      provider: "gmail",
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = emailProviders.buildAuthorizationUrl("gmail", state);
    // Add access_type=offline and prompt=consent for refresh token
    const url = new URL(authUrl);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    res.json({ url: url.toString() });
  });

  /**
   * Gmail OAuth callback
   * Exchanges code for tokens and stores them
   */
  app.get("/api/oauth/gmail/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      console.error("[Gmail OAuth] Error:", error);
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?gmail_error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }

    try {
      // Decode state to get user ID
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      const userId = stateData.userId;

      if (!userId) {
        throw new Error("Invalid state: missing userId");
      }

      // Exchange code for tokens
      const tokens = await emailProviders.exchangeCodeForToken("gmail", code);

      // Get user's Gmail email address
      let gmailEmail = "";
      try {
        const profileRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          gmailEmail = profile.emailAddress || "";
        }
      } catch (e) {
        console.warn("[Gmail OAuth] Failed to fetch profile:", e);
      }

      // Store tokens in database
      await db.saveEmailToken({
        userId,
        provider: "gmail",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        email: gmailEmail || null,
      });

      // Update profile to mark Gmail as connected
      await db.updateProfile(userId, { connectedGmail: true });

      console.log(`[Gmail OAuth] Successfully connected for user ${userId} (${gmailEmail})`);

      // Redirect back to the app
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?gmail_connected=true`);
    } catch (error) {
      console.error("[Gmail OAuth] Callback failed:", error);
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?gmail_error=callback_failed`);
    }
  });

  /**
   * Disconnect Gmail
   */
  app.post("/api/email/gmail/disconnect", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    try {
      await db.deleteEmailToken(user.id, "gmail");
      await db.updateProfile(user.id, { connectedGmail: false });
      res.json({ success: true });
    } catch (error) {
      console.error("[Gmail] Disconnect failed:", error);
      res.status(500).json({ error: "Failed to disconnect Gmail" });
    }
  });

  /**
   * Get Gmail connection status
   */
  app.get("/api/email/gmail/status", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    const token = await db.getEmailToken(user.id, "gmail");
    const configured = emailProviders.validateOAuthConfig("gmail").valid;

    res.json({
      connected: !!token,
      email: token?.email || null,
      configured,
      expiresAt: token?.expiresAt?.toISOString() || null,
    });
  });

  // ── Outlook OAuth ──────────────────────────────────────

  /**
   * Start Outlook OAuth flow
   */
  app.get("/api/email/outlook/authorize", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    const validation = emailProviders.validateOAuthConfig("outlook");
    if (!validation.valid) {
      res.status(500).json({ error: validation.error, configured: false });
      return;
    }

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      provider: "outlook",
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = emailProviders.buildAuthorizationUrl("outlook", state);
    res.json({ url: authUrl });
  });

  /**
   * Outlook OAuth callback
   */
  app.get("/api/oauth/outlook/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?outlook_error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }

    try {
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      const userId = stateData.userId;

      const tokens = await emailProviders.exchangeCodeForToken("outlook", code);

      // Get Outlook email
      let outlookEmail = "";
      try {
        const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          outlookEmail = profile.mail || profile.userPrincipalName || "";
        }
      } catch (e) {
        console.warn("[Outlook OAuth] Failed to fetch profile:", e);
      }

      await db.saveEmailToken({
        userId,
        provider: "outlook",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        expiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : null,
        email: outlookEmail || null,
      });

      await db.updateProfile(userId, { connectedOutlook: true });

      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?outlook_connected=true`);
    } catch (error) {
      console.error("[Outlook OAuth] Callback failed:", error);
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}?outlook_error=callback_failed`);
    }
  });

  /**
   * Disconnect Outlook
   */
  app.post("/api/email/outlook/disconnect", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    try {
      await db.deleteEmailToken(user.id, "outlook");
      await db.updateProfile(user.id, { connectedOutlook: false });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect Outlook" });
    }
  });

  /**
   * Get Outlook connection status
   */
  app.get("/api/email/outlook/status", async (req: Request, res: Response) => {
    const user = await authenticateOrFail(req, res);
    if (!user) return;

    const token = await db.getEmailToken(user.id, "outlook");
    const configured = emailProviders.validateOAuthConfig("outlook").valid;

    res.json({
      connected: !!token,
      email: token?.email || null,
      configured,
    });
  });

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
    // Raw body middleware for webhook signature verification
    (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }

      // Collect raw body
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
