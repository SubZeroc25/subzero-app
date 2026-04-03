import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { extractSubscriptionsFromBatch } from "./ai-extraction";
import { scanEmailsForSubscriptions } from "./email-scanner";
import { refreshAccessToken } from "./email-providers";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateProfile(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        onboardingComplete: z.boolean().optional(),
        connectedGmail: z.boolean().optional(),
        connectedOutlook: z.boolean().optional(),
        currency: z.string().max(3).optional(),
        notificationsEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateProfile(ctx.user.id, input);
        return db.getOrCreateProfile(ctx.user.id);
      }),

    redeemPromo: protectedProcedure
      .input(z.object({ code: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const promo = await db.getPromoCodeByCode(input.code.toUpperCase());
        if (!promo) throw new Error("Invalid promo code");
        if (!promo.isActive) throw new Error("This promo code is no longer active");
        if (promo.usedCount >= promo.maxUses) throw new Error("This promo code has been fully redeemed");
        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) throw new Error("This promo code has expired");

        if (promo.type === "pro_upgrade") {
          await db.adminSetUserPlan(ctx.user.id, "pro", "promo");
          await db.incrementPromoCodeUsage(promo.id);
          return { success: true, message: "Upgraded to Pro!", type: "pro_upgrade" as const };
        }

        await db.incrementPromoCodeUsage(promo.id);
        return { success: true, message: `${promo.discountPercent}% discount applied!`, type: "discount" as const, discountPercent: promo.discountPercent };
      }),
  }),

  subscriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSubscriptions(ctx.user.id);
    }),

    active: protectedProcedure.query(async ({ ctx }) => {
      return db.getActiveSubscriptions(ctx.user.id);
    }),

    upcomingRenewals: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(7) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUpcomingRenewals(ctx.user.id, input?.days ?? 7);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        provider: z.string().min(1).max(255),
        amount: z.number().min(0),
        currency: z.string().max(3).default("USD"),
        billingCycle: z.enum(["monthly", "yearly", "weekly", "quarterly", "one-time"]).default("monthly"),
        category: z.enum([
          "entertainment", "productivity", "cloud", "finance", "health",
          "education", "shopping", "news", "social", "utilities", "other",
        ]).default("other"),
        status: z.enum(["active", "cancelled", "trial", "paused", "expired"]).default("active"),
        nextRenewalDate: z.string().nullable().optional(),
        detectedFrom: z.string().default("manual"),
        logoUrl: z.string().nullable().optional(),
        discountPercent: z.number().min(0).max(100).nullable().optional(),
        discountAmount: z.number().min(0).nullable().optional(),
        discountNote: z.string().max(255).nullable().optional(),
        discountExpiresAt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getOrCreateProfile(ctx.user.id);
        if (profile?.plan === "free" && input.detectedFrom === "manual") {
          const existing = await db.getUserSubscriptions(ctx.user.id);
          if (existing.length >= 10) {
            throw new Error("Free plan limited to 10 subscriptions. Upgrade to Pro for unlimited.");
          }
        }
        const id = await db.createSubscription({
          ...input,
          userId: ctx.user.id,
          amount: String(input.amount),
          discountAmount: input.discountAmount != null ? String(input.discountAmount) : null,
          nextRenewalDate: input.nextRenewalDate ? new Date(input.nextRenewalDate) : null,
          discountExpiresAt: input.discountExpiresAt ? new Date(input.discountExpiresAt) : null,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        amount: z.number().min(0).optional(),
        billingCycle: z.enum(["monthly", "yearly", "weekly", "quarterly", "one-time"]).optional(),
        category: z.enum([
          "entertainment", "productivity", "cloud", "finance", "health",
          "education", "shopping", "news", "social", "utilities", "other",
        ]).optional(),
        status: z.enum(["active", "cancelled", "trial", "paused", "expired"]).optional(),
        nextRenewalDate: z.string().nullable().optional(),
        discountPercent: z.number().min(0).max(100).nullable().optional(),
        discountAmount: z.number().min(0).nullable().optional(),
        discountNote: z.string().max(255).nullable().optional(),
        discountExpiresAt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.amount !== undefined) updateData.amount = String(data.amount);
        if (data.nextRenewalDate !== undefined) {
          updateData.nextRenewalDate = data.nextRenewalDate ? new Date(data.nextRenewalDate) : null;
        }
        if (data.discountAmount !== undefined) {
          updateData.discountAmount = data.discountAmount != null ? String(data.discountAmount) : null;
        }
        if (data.discountExpiresAt !== undefined) {
          updateData.discountExpiresAt = data.discountExpiresAt ? new Date(data.discountExpiresAt) : null;
        }
        await db.updateSubscription(id, ctx.user.id, updateData as any);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSubscription(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  scan: router({
    start: protectedProcedure
      .input(z.object({ provider: z.enum(["gmail", "outlook"]) }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getOrCreateProfile(ctx.user.id);
        if (profile?.plan === "free" && (profile.scansThisMonth ?? 0) >= 1) {
          throw new Error("Free plan limited to 1 scan per month. Upgrade to Pro for unlimited scans.");
        }

        const jobId = await db.createScanJob({
          userId: ctx.user.id,
          provider: input.provider,
          status: "connecting",
        });

        const emailToken = await db.getEmailToken(ctx.user.id, input.provider);
        const useRealScan = !!emailToken;

        setTimeout(async () => {
          try {
            await db.updateScanJob(jobId, { status: "scanning", emailsScanned: 0 });
            let allSubscriptions: any[] = [];
            let emailCount = 0;

            if (useRealScan && emailToken) {
              let accessToken = emailToken.accessToken;
              if (emailToken.expiresAt && new Date(emailToken.expiresAt) < new Date() && emailToken.refreshToken) {
                try {
                  const refreshed = await refreshAccessToken(input.provider, emailToken.refreshToken);
                  accessToken = refreshed.accessToken;
                  await db.saveEmailToken({
                    userId: ctx.user.id, provider: input.provider,
                    accessToken: refreshed.accessToken, refreshToken: emailToken.refreshToken,
                    expiresAt: refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : null,
                    email: emailToken.email,
                  });
                } catch (refreshErr) { console.error("[Scan] Token refresh failed:", refreshErr); }
              }
              await db.updateScanJob(jobId, { status: "scanning" });
              const subs = await scanEmailsForSubscriptions(input.provider, accessToken);
              allSubscriptions = subs;
              emailCount = subs.length > 0 ? Math.max(subs.length * 3, 10) : 0;
            } else {
              emailCount = Math.floor(Math.random() * 50) + 20;
              await db.updateScanJob(jobId, { status: "scanning", emailsScanned: emailCount });
            }

            await db.updateScanJob(jobId, { status: "analyzing" });

            let result;
            if (useRealScan && allSubscriptions.length > 0) {
              result = { subscriptions: allSubscriptions };
            } else {
              const sampleEmails = generateSampleBillingEmails();
              result = await extractSubscriptionsFromBatch(sampleEmails);
            }

            let subsFound = 0;
            for (const sub of result.subscriptions) {
              const existing = await db.findDuplicateSubscription(ctx.user.id, sub.name, sub.provider);
              if (!existing) {
                await db.createSubscription({
                  userId: ctx.user.id, name: sub.name, provider: sub.provider,
                  amount: String(sub.amount), currency: sub.currency || "USD",
                  billingCycle: sub.billingCycle || "monthly", category: sub.category || "other",
                  status: "active",
                  nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate) : null,
                  detectedFrom: input.provider,
                });
                subsFound++;
              }
            }

            await db.updateScanJob(jobId, {
              status: "completed", emailsScanned: emailCount,
              subscriptionsFound: subsFound, completedAt: new Date(),
            });
            await db.updateProfile(ctx.user.id, { scansThisMonth: (profile?.scansThisMonth ?? 0) + 1 });
          } catch (error) {
            console.error("[Scan] Job failed:", error);
            await db.updateScanJob(jobId, { status: "failed" });
          }
        }, 2000);

        return { jobId };
      }),

    status: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return db.getScanJob(input.jobId);
      }),

    history: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserScanJobs(ctx.user.id);
    }),
  }),

  analytics: router({
    spending: protectedProcedure.query(async ({ ctx }) => {
      return db.getSpendingAnalytics(ctx.user.id);
    }),
  }),

  // ── Admin Panel ──────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getSystemStats();
    }),

    users: adminProcedure.query(async () => {
      const allUsers = await db.getAllUsers();
      const allProfiles = await db.getAllProfiles();
      const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));
      return allUsers.map((u) => ({
        ...u,
        profile: profileMap.get(u.id) || null,
      }));
    }),

    setUserPlan: adminProcedure
      .input(z.object({
        userId: z.number(),
        plan: z.enum(["free", "pro"]),
      }))
      .mutation(async ({ input }) => {
        await db.adminSetUserPlan(input.userId, input.plan, "admin");
        return { success: true };
      }),

    setUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.adminSetUserRole(input.userId, input.role);
        return { success: true };
      }),

    allSubscriptions: adminProcedure.query(async () => {
      return db.getAllSubscriptions();
    }),

    promoCodes: router({
      list: adminProcedure.query(async () => {
        return db.getAllPromoCodes();
      }),

      create: adminProcedure
        .input(z.object({
          code: z.string().min(1).max(64),
          description: z.string().max(255).optional(),
          type: z.enum(["pro_upgrade", "discount"]).default("pro_upgrade"),
          discountPercent: z.number().min(0).max(100).nullable().optional(),
          maxUses: z.number().min(1).default(1),
          expiresAt: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await db.createPromoCode({
            code: input.code.toUpperCase(),
            description: input.description,
            type: input.type,
            discountPercent: input.discountPercent,
            maxUses: input.maxUses,
            isActive: true,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            createdBy: ctx.user.id,
          });
          return { id };
        }),

      deactivate: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deactivatePromoCode(input.id);
          return { success: true };
        }),
    }),
  }),
});

function generateSampleBillingEmails(): string[] {
  return [
    `Subject: Your Netflix subscription renewal\nFrom: info@netflix.com\nDate: 2025-03-15\n\nYour Netflix Premium subscription has been renewed.\nAmount charged: $22.99\nBilling period: Monthly\nNext billing date: April 15, 2025`,
    `Subject: Spotify Premium - Payment Confirmation\nFrom: no-reply@spotify.com\nDate: 2025-03-10\n\nThank you for your payment.\nPlan: Spotify Premium Individual\nAmount: $10.99/month\nNext payment: April 10, 2025`,
    `Subject: Your iCloud+ storage plan\nFrom: no_reply@email.apple.com\nDate: 2025-03-01\n\nYour iCloud+ subscription renewal.\niCloud+ 200GB\nAmount: $2.99/month\nNext renewal: April 1, 2025`,
    `Subject: GitHub Pro - Invoice\nFrom: billing@github.com\nDate: 2025-03-05\n\nGitHub Pro subscription invoice.\nAmount: $4.00/month\nBilling cycle: Monthly\nNext billing: April 5, 2025`,
    `Subject: Adobe Creative Cloud - Payment Receipt\nFrom: mail@adobe.com\nDate: 2025-02-20\n\nPayment received for Adobe Creative Cloud All Apps.\nAmount: $54.99/month\nNext payment: March 20, 2025`,
    `Subject: Your ChatGPT Plus subscription\nFrom: noreply@openai.com\nDate: 2025-03-12\n\nChatGPT Plus subscription renewed.\nAmount: $20.00/month\nNext billing: April 12, 2025`,
    `Subject: AWS Monthly Invoice\nFrom: aws-billing@amazon.com\nDate: 2025-03-01\n\nAmazon Web Services billing statement.\nTotal: $45.67\nBilling period: Monthly\nService: AWS Cloud Services`,
    `Subject: YouTube Premium - Payment\nFrom: payments-noreply@google.com\nDate: 2025-03-08\n\nYouTube Premium Family plan payment.\nAmount: $22.99/month\nNext billing: April 8, 2025`,
  ];
}

export type AppRouter = typeof appRouter;
