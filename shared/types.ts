/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// SubZero shared types

export type SubscriptionStatus = "active" | "cancelled" | "trial" | "paused" | "expired";
export type BillingCycle = "monthly" | "yearly" | "weekly" | "quarterly" | "one-time";
export type SubscriptionCategory =
  | "entertainment"
  | "productivity"
  | "cloud"
  | "finance"
  | "health"
  | "education"
  | "shopping"
  | "news"
  | "social"
  | "utilities"
  | "other";

export type PlanTier = "free" | "pro";
export type ScanStatus = "pending" | "connecting" | "scanning" | "analyzing" | "completed" | "failed";
export type EmailProvider = "gmail" | "outlook";

export interface SubscriptionData {
  id: number;
  userId: number;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  nextRenewalDate: string | null;
  detectedFrom: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanJobData {
  id: number;
  userId: number;
  provider: string;
  status: ScanStatus;
  emailsScanned: number;
  subscriptionsFound: number;
  startedAt: string;
  completedAt: string | null;
}

export interface UserProfileData {
  id: number;
  userId: number;
  plan: PlanTier;
  onboardingComplete: boolean;
  connectedGmail: boolean;
  connectedOutlook: boolean;
  currency: string;
  notificationsEnabled: boolean;
  scansThisMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpendingAnalytics {
  totalMonthly: number;
  totalYearly: number;
  categoryBreakdown: { category: SubscriptionCategory; amount: number; count: number }[];
  monthlyTrend: { month: string; amount: number }[];
  topSubscriptions: { name: string; amount: number; billingCycle: BillingCycle }[];
  potentialSavings: number;
}

export interface SubscriptionExtraction {
  name: string;
  provider: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  nextRenewalDate: string | null;
}
