import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { extractSubscriptionsFromImage } from "./ai-extraction";
import {
  getProviderContact,
  generateCancellationEmail,
} from "./cancellation-service";
import { storagePut } from "./storage";

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
    // Upload a receipt/screenshot image and extract subscriptions via AI vision
    uploadAndExtract: protectedProcedure
      .input(z.object({
        imageBase64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getOrCreateProfile(ctx.user.id);
        if (profile?.plan === "free" && (profile.scansThisMonth ?? 0) >= 3) {
          throw new Error("Free plan limited to 3 scans per month. Upgrade to Pro for unlimited scans.");
        }

        // Upload image to S3
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const fileKey = `scans/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // Extract subscriptions from image using AI vision
        const result = await extractSubscriptionsFromImage(imageUrl);

        if (!result.isSubscriptionEmail || result.subscriptions.length === 0) {
          return {
            success: true,
            subscriptionsFound: 0,
            subscriptions: [],
            message: "No subscription or billing information found in this image. Try a clearer screenshot of a billing email, receipt, or invoice.",
          };
        }

        // Save found subscriptions (skip duplicates)
        let subsAdded = 0;
        const addedSubs: Array<{ name: string; provider: string; amount: number; billingCycle: string }> = [];

        for (const sub of result.subscriptions) {
          const existing = await db.findDuplicateSubscription(ctx.user.id, sub.name, sub.provider);
          if (!existing) {
            await db.createSubscription({
              userId: ctx.user.id,
              name: sub.name,
              provider: sub.provider,
              amount: String(sub.amount),
              currency: sub.currency || "USD",
              billingCycle: sub.billingCycle || "monthly",
              category: sub.category || "other",
              status: "active",
              nextRenewalDate: sub.nextRenewalDate ? new Date(sub.nextRenewalDate) : null,
              detectedFrom: "receipt_scan",
            });
            subsAdded++;
            addedSubs.push({
              name: sub.name,
              provider: sub.provider,
              amount: sub.amount,
              billingCycle: sub.billingCycle || "monthly",
            });
          }
        }

        // Update scan count
        await db.updateProfile(ctx.user.id, {
          scansThisMonth: (profile?.scansThisMonth ?? 0) + 1,
        });

        return {
          success: true,
          subscriptionsFound: subsAdded,
          subscriptions: addedSubs,
          message: subsAdded > 0
            ? `Found and added ${subsAdded} subscription${subsAdded > 1 ? "s" : ""}!`
            : "All subscriptions in this image are already tracked.",
        };
      }),
  }),

  cancellation: router({
    // Get provider contact info for a subscription
    getProviderInfo: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const subs = await db.getUserSubscriptions(ctx.user.id);
        const sub = subs.find((s) => s.id === input.subscriptionId);
        if (!sub) throw new Error("Subscription not found");

        const contact = getProviderContact(sub.name, sub.provider);
        const existingRequest = await db.getCancellationRequestForSubscription(ctx.user.id, input.subscriptionId);

        return {
          subscription: { id: sub.id, name: sub.name, provider: sub.provider, amount: sub.amount, billingCycle: sub.billingCycle },
          providerContact: contact,
          existingRequest: existingRequest ? {
            id: existingRequest.id,
            status: existingRequest.status,
            followUpCount: existingRequest.followUpCount,
            lastSentAt: existingRequest.lastSentAt,
            emailSubject: existingRequest.emailSubject,
            emailBody: existingRequest.emailBody,
          } : null,
        };
      }),

    // Generate the cancellation email content (user sends via their own mail app)
    generateEmail: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
        customProviderEmail: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const subs = await db.getUserSubscriptions(ctx.user.id);
        const sub = subs.find((s) => s.id === input.subscriptionId);
        if (!sub) throw new Error("Subscription not found");

        // Check Pro plan
        const profile = await db.getOrCreateProfile(ctx.user.id);
        if (profile?.plan !== "pro") {
          throw new Error("Cancel For Me is a Pro feature. Upgrade to Pro to generate cancellation emails.");
        }

        const existingRequest = await db.getCancellationRequestForSubscription(ctx.user.id, input.subscriptionId);
        const isFollowUp = !!existingRequest && ["email_sent", "follow_up_sent"].includes(existingRequest.status);

        const contact = getProviderContact(sub.name, sub.provider);
        const providerEmail = input.customProviderEmail || contact?.email;
        if (!providerEmail) throw new Error("No provider email found. Please enter the provider's support email address.");

        const email = await generateCancellationEmail({
          userName: ctx.user.name || "Account Holder",
          userEmail: ctx.user.email || "",
          subscriptionName: sub.name,
          providerName: sub.provider,
          amount: Number(sub.amount),
          billingCycle: sub.billingCycle,
          isFollowUp,
          followUpCount: existingRequest?.followUpCount ?? 0,
        });

        return {
          subject: email.subject,
          body: email.body,
          providerEmail,
          isFollowUp,
        };
      }),

    // Record that the user sent the cancellation email (called after mail composer closes)
    recordSent: protectedProcedure
      .input(z.object({
        subscriptionId: z.number(),
        providerEmail: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const subs = await db.getUserSubscriptions(ctx.user.id);
        const sub = subs.find((s) => s.id === input.subscriptionId);
        if (!sub) throw new Error("Subscription not found");

        const existingRequest = await db.getCancellationRequestForSubscription(ctx.user.id, input.subscriptionId);
        if (existingRequest && ["email_sent", "follow_up_sent"].includes(existingRequest.status)) {
          // Follow-up
          await db.updateCancellationRequest(existingRequest.id, {
            status: "follow_up_sent",
            followUpCount: existingRequest.followUpCount + 1,
            lastSentAt: new Date(),
            emailSubject: input.subject,
            emailBody: input.body,
          });
        } else {
          // New request
          await db.createCancellationRequest({
            userId: ctx.user.id,
            subscriptionId: input.subscriptionId,
            providerEmail: input.providerEmail,
            status: "email_sent",
            emailSubject: input.subject,
            emailBody: input.body,
            lastSentAt: new Date(),
          });
        }

        // Update subscription status to cancelled
        await db.updateSubscription(input.subscriptionId, ctx.user.id, { status: "cancelled" });

        return { success: true, message: "Cancellation recorded!" };
      }),

    // Get all cancellation requests for the user
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCancellationRequests(ctx.user.id);
    }),

    // Mark a cancellation as confirmed (provider responded)
    markConfirmed: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const request = await db.getCancellationRequest(input.id);
        if (!request || request.userId !== ctx.user.id) throw new Error("Cancellation request not found");
        await db.updateCancellationRequest(input.id, {
          status: "confirmed",
          confirmedAt: new Date(),
        });
        return { success: true };
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

export type AppRouter = typeof appRouter;
