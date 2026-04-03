import { describe, it, expect } from "vitest";

const hasStripePriceId = !!process.env.STRIPE_PRO_PRICE_ID;

describe.skipIf(!hasStripePriceId)("Stripe Pro Price ID", () => {
  it("should be set and have correct format", () => {
    const priceId = process.env.STRIPE_PRO_PRICE_ID!;
    expect(typeof priceId).toBe("string");
    expect(priceId.length).toBeGreaterThan(0);
    expect(priceId.startsWith("price_")).toBe(true);
  });
});
