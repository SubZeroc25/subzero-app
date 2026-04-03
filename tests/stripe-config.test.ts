import { describe, it, expect } from "vitest";

const hasStripeSecrets = !!(
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_WEBHOOK_SECRET &&
  process.env.STRIPE_PRO_PRICE_ID
);

describe.skipIf(!hasStripeSecrets)("Stripe Configuration", () => {
  it("should have STRIPE_SECRET_KEY with correct format", () => {
    const key = process.env.STRIPE_SECRET_KEY!;
    expect(key).not.toBe("");
    expect(key.startsWith("sk_test_") || key.startsWith("sk_live_")).toBe(true);
  });

  it("should have STRIPE_WEBHOOK_SECRET with correct format", () => {
    const key = process.env.STRIPE_WEBHOOK_SECRET!;
    expect(key).not.toBe("");
    expect(key.startsWith("whsec_")).toBe(true);
  });

  it("should have STRIPE_PRO_PRICE_ID with correct format", () => {
    const key = process.env.STRIPE_PRO_PRICE_ID!;
    expect(key).not.toBe("");
    expect(key.startsWith("price_")).toBe(true);
  });

  it("should be able to initialize Stripe client", async () => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-03-31.basil" as any,
    });
    expect(stripe).toBeDefined();
    expect(stripe.customers).toBeDefined();
    expect(stripe.checkout).toBeDefined();
  });
});
