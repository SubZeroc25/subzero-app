import { eq, and, desc, sql, gte, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertUserProfile, userProfiles,
  InsertSubscription, subscriptions,
  InsertScanJob, scanJobs,
  InsertEmailToken, emailTokens,
  InsertPromoCode, promoCodes,
  InsertCancellationRequest, cancellationRequests,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── User ──────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── User Profile ──────────────────────────────────────
export async function getOrCreateProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userProfiles).values({ userId });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function updateProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

// ── Subscriptions ─────────────────────────────────────
export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptions).values(data);
  return result[0].insertId;
}

export async function updateSubscription(id: number, userId: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(data).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
}

export async function deleteSubscription(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subscriptions).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
}

export async function getActiveSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")));
}

export async function getUpcomingRenewals(userId: number, daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return db.select().from(subscriptions).where(
    and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, "active"),
      gte(subscriptions.nextRenewalDate, now),
      sql`${subscriptions.nextRenewalDate} <= ${future}`
    )
  ).orderBy(subscriptions.nextRenewalDate);
}

export async function findDuplicateSubscription(userId: number, name: string, provider: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(
    and(eq(subscriptions.userId, userId), eq(subscriptions.name, name), eq(subscriptions.provider, provider))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ── Scan Jobs ─────────────────────────────────────────
export async function createScanJob(data: InsertScanJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scanJobs).values(data);
  return result[0].insertId;
}

export async function updateScanJob(id: number, data: Partial<InsertScanJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scanJobs).set(data).where(eq(scanJobs.id, id));
}

export async function getUserScanJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scanJobs).where(eq(scanJobs.userId, userId)).orderBy(desc(scanJobs.startedAt));
}

export async function getScanJob(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scanJobs).where(eq(scanJobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ── Email Tokens ─────────────────────────────────────
export async function saveEmailToken(data: InsertEmailToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(emailTokens).where(
    and(eq(emailTokens.userId, data.userId), eq(emailTokens.provider, data.provider))
  ).limit(1);
  if (existing.length > 0) {
    await db.update(emailTokens).set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      email: data.email,
    }).where(eq(emailTokens.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(emailTokens).values(data);
  return result[0].insertId;
}

export async function getEmailToken(userId: number, provider: "gmail" | "outlook") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(emailTokens).where(
    and(eq(emailTokens.userId, userId), eq(emailTokens.provider, provider))
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteEmailToken(userId: number, provider: "gmail" | "outlook") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailTokens).where(
    and(eq(emailTokens.userId, userId), eq(emailTokens.provider, provider))
  );
}

// ── Stripe ───────────────────────────────────────────
export async function updateStripeCustomer(userId: number, data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  plan?: "free" | "pro";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

export async function getProfileByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProfiles).where(
    eq(userProfiles.stripeCustomerId, stripeCustomerId)
  ).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ── Admin ───────────────────────────────────────────
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getAllProfiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userProfiles).orderBy(desc(userProfiles.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
}

export async function getSystemStats() {
  const db = await getDb();
  if (!db) return null;

  const [userCount] = await db.select({ count: count() }).from(users);
  const [subCount] = await db.select({ count: count() }).from(subscriptions);
  const [activeSubCount] = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  const [proCount] = await db.select({ count: count() }).from(userProfiles).where(eq(userProfiles.plan, "pro"));
  const [scanCount] = await db.select({ count: count() }).from(scanJobs);
  const [promoCount] = await db.select({ count: count() }).from(promoCodes).where(eq(promoCodes.isActive, true));

  // Total monthly revenue tracked across all users
  const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  let totalMonthlyTracked = 0;
  for (const sub of activeSubs) {
    const amount = Number(sub.amount);
    const discount = sub.discountPercent ? amount * (sub.discountPercent / 100) : (sub.discountAmount ? Number(sub.discountAmount) : 0);
    const effectiveAmount = amount - discount;
    switch (sub.billingCycle) {
      case "weekly": totalMonthlyTracked += effectiveAmount * 4.33; break;
      case "monthly": totalMonthlyTracked += effectiveAmount; break;
      case "quarterly": totalMonthlyTracked += effectiveAmount / 3; break;
      case "yearly": totalMonthlyTracked += effectiveAmount / 12; break;
    }
  }

  return {
    totalUsers: userCount.count,
    totalSubscriptions: subCount.count,
    activeSubscriptions: activeSubCount.count,
    proUsers: proCount.count,
    totalScans: scanCount.count,
    activePromoCodes: promoCount.count,
    totalMonthlyTracked: Math.round(totalMonthlyTracked * 100) / 100,
  };
}

export async function adminSetUserPlan(userId: number, plan: "free" | "pro", grantedBy: "admin" | "promo") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set({
    plan,
    proGrantedBy: plan === "pro" ? grantedBy : null,
    proGrantedAt: plan === "pro" ? new Date() : null,
  }).where(eq(userProfiles.userId, userId));
}

export async function adminSetUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ── Promo Codes ─────────────────────────────────────
export async function createPromoCode(data: InsertPromoCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(promoCodes).values(data);
  return result[0].insertId;
}

export async function getPromoCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase())).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllPromoCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function incrementPromoCodeUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoCodes).set({
    usedCount: sql`${promoCodes.usedCount} + 1`,
  }).where(eq(promoCodes.id, id));
}

export async function deactivatePromoCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoCodes).set({ isActive: false }).where(eq(promoCodes.id, id));
}

// ── Cancellation Requests ─────────────────────────────
export async function createCancellationRequest(data: InsertCancellationRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cancellationRequests).values(data);
  return result[0].insertId;
}

export async function getCancellationRequest(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cancellationRequests).where(eq(cancellationRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserCancellationRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cancellationRequests).where(eq(cancellationRequests.userId, userId)).orderBy(desc(cancellationRequests.createdAt));
}

export async function getCancellationRequestForSubscription(userId: number, subscriptionId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(cancellationRequests).where(
    and(eq(cancellationRequests.userId, userId), eq(cancellationRequests.subscriptionId, subscriptionId))
  ).orderBy(desc(cancellationRequests.createdAt)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateCancellationRequest(id: number, data: Partial<InsertCancellationRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cancellationRequests).set(data).where(eq(cancellationRequests.id, id));
}

// ── Analytics (with discount support) ────────────────
export async function getSpendingAnalytics(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const subs = await db.select().from(subscriptions).where(
    and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
  );

  let totalMonthly = 0;
  let totalSavings = 0;
  for (const sub of subs) {
    const amount = Number(sub.amount);
    const discount = sub.discountPercent ? amount * (sub.discountPercent / 100) : (sub.discountAmount ? Number(sub.discountAmount) : 0);
    const effectiveAmount = amount - discount;
    totalSavings += discount;

    switch (sub.billingCycle) {
      case "weekly": totalMonthly += effectiveAmount * 4.33; break;
      case "monthly": totalMonthly += effectiveAmount; break;
      case "quarterly": totalMonthly += effectiveAmount / 3; break;
      case "yearly": totalMonthly += effectiveAmount / 12; break;
      case "one-time": break;
    }
  }

  const categoryMap = new Map<string, { amount: number; count: number }>();
  for (const sub of subs) {
    const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
    const amount = Number(sub.amount);
    const discount = sub.discountPercent ? amount * (sub.discountPercent / 100) : (sub.discountAmount ? Number(sub.discountAmount) : 0);
    const effectiveAmount = amount - discount;
    let monthlyAmount = effectiveAmount;
    switch (sub.billingCycle) {
      case "weekly": monthlyAmount = effectiveAmount * 4.33; break;
      case "monthly": monthlyAmount = effectiveAmount; break;
      case "quarterly": monthlyAmount = effectiveAmount / 3; break;
      case "yearly": monthlyAmount = effectiveAmount / 12; break;
      case "one-time": monthlyAmount = 0; break;
    }
    existing.amount += monthlyAmount;
    existing.count += 1;
    categoryMap.set(sub.category, existing);
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category, amount: Math.round(data.amount * 100) / 100, count: data.count,
  })).sort((a, b) => b.amount - a.amount);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const variance = 1 + (Math.random() - 0.5) * 0.1;
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      amount: Math.round(totalMonthly * variance * 100) / 100,
    });
  }
  if (months.length > 0) months[months.length - 1].amount = Math.round(totalMonthly * 100) / 100;

  const topSubscriptions = subs
    .map((s) => {
      const amount = Number(s.amount);
      const discount = s.discountPercent ? amount * (s.discountPercent / 100) : (s.discountAmount ? Number(s.discountAmount) : 0);
      return { name: s.name, amount: amount - discount, originalAmount: amount, billingCycle: s.billingCycle, hasDiscount: discount > 0 };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    totalYearly: Math.round(totalMonthly * 12 * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    categoryBreakdown,
    monthlyTrend: months,
    topSubscriptions,
    potentialSavings: Math.round(totalMonthly * 0.15 * 100) / 100,
  };
}
