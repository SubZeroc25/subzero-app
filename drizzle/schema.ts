import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  plan: mysqlEnum("plan", ["free", "pro"]).default("free").notNull(),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  connectedGmail: boolean("connectedGmail").default(false).notNull(),
  connectedOutlook: boolean("connectedOutlook").default(false).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  scansThisMonth: int("scansThisMonth").default(0).notNull(),
  lastScanReset: timestamp("lastScanReset").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly", "weekly", "quarterly", "one-time"]).default("monthly").notNull(),
  category: mysqlEnum("category", [
    "entertainment", "productivity", "cloud", "finance", "health",
    "education", "shopping", "news", "social", "utilities", "other",
  ]).default("other").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "trial", "paused", "expired"]).default("active").notNull(),
  nextRenewalDate: timestamp("nextRenewalDate"),
  detectedFrom: varchar("detectedFrom", { length: 32 }).default("manual").notNull(),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const scanJobs = mysqlTable("scan_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["pending", "connecting", "scanning", "analyzing", "completed", "failed"]).default("pending").notNull(),
  emailsScanned: int("emailsScanned").default(0).notNull(),
  subscriptionsFound: int("subscriptionsFound").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type ScanJob = typeof scanJobs.$inferSelect;
export type InsertScanJob = typeof scanJobs.$inferInsert;
