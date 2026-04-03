import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// Mock user
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

// Mock db module
vi.mock("../server/db", () => ({
  getOrCreateProfile: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    plan: "free",
    onboardingComplete: false,
    connectedGmail: false,
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
  getActiveSubscriptions: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      name: "Netflix",
      provider: "Netflix",
      amount: "22.99",
      status: "active",
    },
  ]),
  getUpcomingRenewals: vi.fn().mockResolvedValue([]),
  createSubscription: vi.fn().mockResolvedValue(2),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  findDuplicateSubscription: vi.fn().mockResolvedValue(null),
  createScanJob: vi.fn().mockResolvedValue(1),
  updateScanJob: vi.fn().mockResolvedValue(undefined),
  getScanJob: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    provider: "gmail",
    status: "completed",
    emailsScanned: 35,
    subscriptionsFound: 5,
    startedAt: new Date(),
    completedAt: new Date(),
  }),
  getUserScanJobs: vi.fn().mockResolvedValue([]),
  getEmailToken: vi.fn().mockResolvedValue(null),
  saveEmailToken: vi.fn().mockResolvedValue(undefined),
  deleteEmailToken: vi.fn().mockResolvedValue(undefined),
  getSpendingAnalytics: vi.fn().mockResolvedValue({
    totalMonthly: 184.63,
    totalYearly: 2215.56,
    categoryBreakdown: [
      { category: "entertainment", amount: 45.98, count: 2 },
      { category: "productivity", amount: 54.99, count: 1 },
    ],
    monthlyTrend: [
      { month: "Oct 24", amount: 180.0 },
      { month: "Nov 24", amount: 182.5 },
      { month: "Dec 24", amount: 184.63 },
    ],
    topSubscriptions: [
      { name: "Adobe CC", amount: 54.99, billingCycle: "monthly" },
    ],
    potentialSavings: 27.69,
  }),
}));

// Mock AI extraction
vi.mock("../server/ai-extraction", () => ({
  extractSubscriptionsFromBatch: vi.fn().mockResolvedValue({
    subscriptions: [
      {
        name: "Netflix",
        provider: "Netflix",
        amount: 22.99,
        currency: "USD",
        billingCycle: "monthly",
        category: "entertainment",
        nextRenewalDate: "2025-04-15",
      },
    ],
    totalProcessed: 1,
    errors: [],
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

describe("Profile Routes", () => {
  const caller = appRouter.createCaller(createMockContext(true));

  it("should get user profile", async () => {
    const profile = await caller.profile.get();
    expect(profile).toBeDefined();
    expect(profile?.plan).toBe("free");
    expect(profile?.userId).toBe(1);
  });

  it("should update profile", async () => {
    const result = await caller.profile.update({ onboardingComplete: true });
    expect(result).toBeDefined();
  });
});

describe("Subscription Routes", () => {
  const caller = appRouter.createCaller(createMockContext(true));

  it("should list subscriptions", async () => {
    const subs = await caller.subscriptions.list();
    expect(Array.isArray(subs)).toBe(true);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs[0].name).toBe("Netflix");
  });

  it("should get active subscriptions", async () => {
    const active = await caller.subscriptions.active();
    expect(Array.isArray(active)).toBe(true);
    expect(active[0].status).toBe("active");
  });

  it("should get upcoming renewals", async () => {
    const renewals = await caller.subscriptions.upcomingRenewals();
    expect(Array.isArray(renewals)).toBe(true);
  });

  it("should create a subscription", async () => {
    const result = await caller.subscriptions.create({
      name: "Spotify",
      provider: "Spotify",
      amount: 10.99,
      billingCycle: "monthly",
      category: "entertainment",
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(2);
  });

  it("should update a subscription", async () => {
    const result = await caller.subscriptions.update({
      id: 1,
      status: "cancelled",
    });
    expect(result.success).toBe(true);
  });

  it("should delete a subscription", async () => {
    const result = await caller.subscriptions.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Scan Routes", () => {
  const caller = appRouter.createCaller(createMockContext(true));

  it("should start a scan job", async () => {
    const result = await caller.scan.start({ provider: "gmail" });
    expect(result).toBeDefined();
    expect(result.jobId).toBe(1);
  });

  it("should get scan status", async () => {
    const status = await caller.scan.status({ jobId: 1 });
    expect(status).toBeDefined();
    expect(status?.status).toBe("completed");
    expect(status?.emailsScanned).toBe(35);
    expect(status?.subscriptionsFound).toBe(5);
  });

  it("should get scan history", async () => {
    const history = await caller.scan.history();
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("Analytics Routes", () => {
  const caller = appRouter.createCaller(createMockContext(true));

  it("should return spending analytics", async () => {
    const analytics = await caller.analytics.spending();
    expect(analytics).toBeDefined();
    expect(analytics?.totalMonthly).toBe(184.63);
    expect(analytics?.totalYearly).toBe(2215.56);
    expect(analytics?.categoryBreakdown).toHaveLength(2);
    expect(analytics?.monthlyTrend).toHaveLength(3);
    expect(analytics?.topSubscriptions).toHaveLength(1);
    expect(analytics?.potentialSavings).toBe(27.69);
  });
});

describe("Auth Guard", () => {
  it("should reject unauthenticated access to protected routes", async () => {
    const unauthCaller = appRouter.createCaller(createMockContext(false));
    await expect(unauthCaller.profile.get()).rejects.toThrow();
    await expect(unauthCaller.subscriptions.list()).rejects.toThrow();
    await expect(unauthCaller.analytics.spending()).rejects.toThrow();
    await expect(unauthCaller.scan.history()).rejects.toThrow();
  });

  it("should allow access to public auth routes", async () => {
    const unauthCaller = appRouter.createCaller(createMockContext(false));
    const me = await unauthCaller.auth.me();
    expect(me).toBeNull();
  });
});
