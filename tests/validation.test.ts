import { describe, it, expect } from "vitest";

// Inline validation functions matching edit-subscription.tsx
function validateName(value: string): string | undefined {
  if (!value.trim()) return "Service name is required";
  if (value.trim().length < 2) return "Name must be at least 2 characters";
  if (value.trim().length > 100) return "Name must be under 100 characters";
  return undefined;
}

function validateAmount(value: string): string | undefined {
  if (!value.trim()) return "Amount is required";
  const num = parseFloat(value);
  if (isNaN(num)) return "Enter a valid number";
  if (num < 0) return "Amount cannot be negative";
  if (num > 99999.99) return "Amount must be under $100,000";
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) return "Max 2 decimal places";
  return undefined;
}

function validateDate(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value.trim())) return "Use format YYYY-MM-DD";
  const parsed = new Date(value.trim());
  if (isNaN(parsed.getTime())) return "Invalid date";
  const year = parsed.getFullYear();
  if (year < 2020 || year > 2099) return "Year must be 2020-2099";
  return undefined;
}

describe("Subscription Form Validation", () => {
  describe("Name validation", () => {
    it("should reject empty name", () => {
      expect(validateName("")).toBe("Service name is required");
      expect(validateName("   ")).toBe("Service name is required");
    });

    it("should reject name shorter than 2 characters", () => {
      expect(validateName("A")).toBe("Name must be at least 2 characters");
    });

    it("should reject name longer than 100 characters", () => {
      const longName = "A".repeat(101);
      expect(validateName(longName)).toBe("Name must be under 100 characters");
    });

    it("should accept valid names", () => {
      expect(validateName("Netflix")).toBeUndefined();
      expect(validateName("Spotify Premium")).toBeUndefined();
      expect(validateName("AB")).toBeUndefined();
    });
  });

  describe("Amount validation", () => {
    it("should reject empty amount", () => {
      expect(validateAmount("")).toBe("Amount is required");
      expect(validateAmount("   ")).toBe("Amount is required");
    });

    it("should reject non-numeric values", () => {
      expect(validateAmount("abc")).toBe("Enter a valid number");
      expect(validateAmount("$10")).toBe("Enter a valid number");
    });

    it("should reject negative amounts", () => {
      expect(validateAmount("-5")).toBe("Amount cannot be negative");
    });

    it("should reject amounts over $100,000", () => {
      expect(validateAmount("100000")).toBe("Amount must be under $100,000");
    });

    it("should reject more than 2 decimal places", () => {
      expect(validateAmount("9.999")).toBe("Max 2 decimal places");
    });

    it("should accept valid amounts", () => {
      expect(validateAmount("9.99")).toBeUndefined();
      expect(validateAmount("0")).toBeUndefined();
      expect(validateAmount("99999.99")).toBeUndefined();
      expect(validateAmount("15")).toBeUndefined();
      expect(validateAmount("4.5")).toBeUndefined();
    });
  });

  describe("Date validation", () => {
    it("should accept empty date (optional)", () => {
      expect(validateDate("")).toBeUndefined();
      expect(validateDate("   ")).toBeUndefined();
    });

    it("should reject invalid date format", () => {
      expect(validateDate("01-15-2025")).toBe("Use format YYYY-MM-DD");
      expect(validateDate("2025/01/15")).toBe("Use format YYYY-MM-DD");
      expect(validateDate("Jan 15, 2025")).toBe("Use format YYYY-MM-DD");
    });

    it("should reject years outside 2020-2099", () => {
      expect(validateDate("2019-01-15")).toBe("Year must be 2020-2099");
      expect(validateDate("2100-01-15")).toBe("Year must be 2020-2099");
    });

    it("should accept valid dates", () => {
      expect(validateDate("2025-06-15")).toBeUndefined();
      expect(validateDate("2026-01-01")).toBeUndefined();
      expect(validateDate("2024-12-31")).toBeUndefined();
    });
  });
});
