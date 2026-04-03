import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProviderContact, generateCancellationEmail } from "../server/cancellation-service";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// ── Unit tests for provider directory ────────────────────
describe("Provider Contact Directory", () => {
  it("should find Netflix by subscription name", () => {
    const contact = getProviderContact("Netflix", "Netflix");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("info@account.netflix.com");
    expect(contact!.name).toBe("Netflix");
  });

  it("should find Spotify by provider name", () => {
    const contact = getProviderContact("Spotify Premium", "Spotify");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@spotify.com");
  });

  it("should find Adobe by partial match", () => {
    const contact = getProviderContact("Adobe Creative Cloud All Apps", "Adobe");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@adobe.com");
  });

  it("should find ChatGPT Plus", () => {
    const contact = getProviderContact("ChatGPT Plus", "OpenAI");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@openai.com");
  });

  it("should find GitHub Pro", () => {
    const contact = getProviderContact("GitHub Pro", "GitHub");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@github.com");
  });

  it("should find iCloud+", () => {
    const contact = getProviderContact("iCloud+", "Apple");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@apple.com");
  });

  it("should return null for unknown provider", () => {
    const contact = getProviderContact("My Random SaaS", "Unknown Corp");
    expect(contact).toBeNull();
  });

  it("should be case-insensitive", () => {
    const contact = getProviderContact("NETFLIX", "NETFLIX");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("info@account.netflix.com");
  });

  it("should find YouTube Premium", () => {
    const contact = getProviderContact("YouTube Premium", "Google");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("yt-premium-support@google.com");
  });

  it("should find NordVPN", () => {
    const contact = getProviderContact("NordVPN", "NordVPN");
    expect(contact).not.toBeNull();
    expect(contact!.email).toBe("support@nordvpn.com");
  });
});

// ── Unit tests for email generation (with mock LLM) ──────
vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          subject: "CANCELLATION REQUEST - Netflix Subscription",
          body: "Dear Netflix Billing Department,\n\nI am writing to formally request the immediate cancellation of my Netflix subscription.\n\nAccount holder: Test User\nAccount email: test@example.com\nCurrent charge: $22.99/monthly\n\nI require immediate cancellation and written confirmation.\n\nSincerely,\nTest User",
        }),
      },
    }],
  }),
}));

describe("Cancellation Email Generation", () => {
  it("should generate a cancellation email", async () => {
    const result = await generateCancellationEmail({
      userName: "Test User",
      userEmail: "test@example.com",
      subscriptionName: "Netflix",
      providerName: "Netflix",
      amount: 22.99,
      billingCycle: "monthly",
      isFollowUp: false,
      followUpCount: 0,
    });

    expect(result.subject).toBeDefined();
    expect(result.subject.length).toBeGreaterThan(0);
    expect(result.body).toBeDefined();
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.subject).toContain("CANCELLATION");
  });

  it("should generate a follow-up email", async () => {
    const { invokeLLM } = await import("../server/_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            subject: "URGENT: IMMEDIATE CANCELLATION DEMANDED - Netflix (Follow-up #2)",
            body: "This is follow-up #2...",
          }),
        },
      }],
    });

    const result = await generateCancellationEmail({
      userName: "Test User",
      userEmail: "test@example.com",
      subscriptionName: "Netflix",
      providerName: "Netflix",
      amount: 22.99,
      billingCycle: "monthly",
      isFollowUp: true,
      followUpCount: 2,
    });

    expect(result.subject).toContain("URGENT");
    expect(result.subject).toContain("Follow-up");
  });
});

// ── Integration tests for cancellation tRPC routes ───────
const mockUser = {
  id: 1,
  openId: "test-user-123",
  name: "Test User",
  email: "test@example.com",
  role: "user" as const,
  loginMethod: "oauth" as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

vi.mock("../server/db", () => ({
  getOrCreateProfile: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    plan: "pro",
    onboardingComplete: true,
    connectedGmail: true,
    connectedOutlook: false,
    currency: "USD",
    notificationsEnabled: true,
    scansThisMonth: 0,
  }),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  getUserSubscriptions: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Netflix",
      provider: "Netflix",
      amount: "22.99",
      currency: "USD",
      billingCycle: "monthly",
      category: "entertainment",
      status: "active",
      nextRenewalDate: new Date("2025-04-15"),
      detectedFrom: "gmail",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getActiveSubscriptions: vi.fn().mockResolvedValue([]),
  getUpcomingRenewals: vi.fn().mockResolvedValue([]),
  createSubscription: vi.fn().mockResolvedValue(2),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  findDuplicateSubscription: vi.fn().mockResolvedValue(null),
  createScanJob: vi.fn().mockResolvedValue(1),
  updateScanJob: vi.fn().mockResolvedValue(undefined),
  getScanJob: vi.fn().mockResolvedValue(null),
  getUserScanJobs: vi.fn().mockResolvedValue([]),
  getEmailToken: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    provider: "gmail",
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 3600000),
    email: "test@gmail.com",
  }),
  saveEmailToken: vi.fn().mockResolvedValue(undefined),
  deleteEmailToken: vi.fn().mockResolvedValue(undefined),
  getSpendingAnalytics: vi.fn().mockResolvedValue(null),
  getCancellationRequestForSubscription: vi.fn().mockResolvedValue(null),
  createCancellationRequest: vi.fn().mockResolvedValue(1),
  updateCancellationRequest: vi.fn().mockResolvedValue(undefined),
  getUserCancellationRequests: vi.fn().mockResolvedValue([]),
  getCancellationRequest: vi.fn().mockResolvedValue(null),
  getPromoCodeByCode: vi.fn().mockResolvedValue(null),
  incrementPromoCodeUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../server/ai-extraction", () => ({
  extractSubscriptionsFromBatch: vi.fn().mockResolvedValue({
    subscriptions: [],
    totalProcessed: 0,
    errors: [],
  }),
}));

vi.mock("../server/email-scanner", () => ({
  scanEmailsForSubscriptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../server/email-providers", () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: "refreshed-token",
    expiresIn: 3600,
    tokenType: "Bearer",
  }),
}));

function createMockContext(authed = true): TrpcContext {
  return {
    user: authed ? mockUser : null,
    req: {} as any,
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

describe("Cancellation Routes", () => {
  const caller = appRouter.createCaller(createMockContext(true));

  it("should get provider info for a subscription", async () => {
    const result = await caller.cancellation.getProviderInfo({ subscriptionId: 1 });
    expect(result).toBeDefined();
    expect(result.subscription.name).toBe("Netflix");
    expect(result.providerContact).not.toBeNull();
    expect(result.providerContact!.email).toBe("info@account.netflix.com");
    expect(result.existingRequest).toBeNull();
  });

  it("should throw for non-existent subscription", async () => {
    await expect(
      caller.cancellation.getProviderInfo({ subscriptionId: 999 })
    ).rejects.toThrow("Subscription not found");
  });

  it("should preview a cancellation email", async () => {
    const result = await caller.cancellation.generateEmail({ subscriptionId: 1 });
    expect(result).toBeDefined();
    expect(result.subject).toContain("CANCELLATION");
    expect(result.body.length).toBeGreaterThan(0);
    expect(result.providerEmail).toBe("info@account.netflix.com");
    expect(result.isFollowUp).toBe(false);
  });

  it("should list cancellation requests", async () => {
    const result = await caller.cancellation.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should reject unauthenticated access", async () => {
    const unauthCaller = appRouter.createCaller(createMockContext(false));
    await expect(
      unauthCaller.cancellation.getProviderInfo({ subscriptionId: 1 })
    ).rejects.toThrow();
    await expect(
      unauthCaller.cancellation.list()
    ).rejects.toThrow();
  });
});
