import { describe, it, expect } from "vitest";

describe("Stripe Pro Price ID", () => {
  it("should be set and have correct format", () => {
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    expect(priceId).toBeDefined();
    expect(typeof priceId).toBe("string");
    expect(priceId!.length).toBeGreaterThan(0);
    expect(priceId!.startsWith("price_")).toBe(true);
  });

  it("should match the user-provided value", () => {
    expect(process.env.STRIPE_PRO_PRICE_ID).toBe("price_1TI4asAQPRHUVpg4QCF8LdjZ");
  });
});
