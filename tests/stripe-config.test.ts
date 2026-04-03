import { describe, it, expect } from "vitest";

describe("Stripe Configuration", () => {
  it("should have STRIPE_SECRET_KEY set", () => {
    const key = process.env.STRIPE_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("sk_test_") || key!.startsWith("sk_live_")).toBe(true);
  });

  it("should have STRIPE_WEBHOOK_SECRET set", () => {
    const key = process.env.STRIPE_WEBHOOK_SECRET;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("whsec_")).toBe(true);
  });

  it("should have STRIPE_PRO_PRICE_ID set", () => {
    const key = process.env.STRIPE_PRO_PRICE_ID;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key!.startsWith("price_")).toBe(true);
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

  it("should be able to list products from Stripe (validates key works)", async () => {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-03-31.basil" as any,
    });
    // This will fail if the key is invalid
    const products = await stripe.products.list({ limit: 1 });
    expect(products).toBeDefined();
    expect(products.data).toBeDefined();
  });
});
