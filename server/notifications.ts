/**
 * Push Notification Service
 * Handles scheduling and sending renewal reminders
 */

import { getDb } from "@/server/db";
import { subscriptions } from "@/drizzle/schema";
import { eq, and, lte } from "drizzle-orm";

// Note: Push notifications are sent via the server's built-in notification capability

export interface RenewalReminder {
  subscriptionId: number;
  userId: number;
  subscriptionName: string;
  amount: string;
  daysUntilRenewal: number;
  nextRenewalDate: Date | null;
}

/**
 * Find all subscriptions that need renewal reminders
 * Returns subscriptions renewing within the specified number of days
 */
export async function findUpcomingRenewals(daysAhead: number = 7): Promise<RenewalReminder[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const db = await getDb();
  if (!db) return [];

  const upcomingSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lte(subscriptions.nextRenewalDate, futureDate)
      )
    );

  return upcomingSubs.map((sub) => {
    const daysUntil = sub.nextRenewalDate
      ? Math.ceil(
          (sub.nextRenewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    return {
      subscriptionId: sub.id,
      userId: sub.userId,
      subscriptionName: sub.name,
      amount: sub.amount,
      daysUntilRenewal: daysUntil,
      nextRenewalDate: sub.nextRenewalDate,
    };
  });
}

/**
 * Send renewal reminder notification to a user
 * In production, this would integrate with the server's push notification system
 */
export async function sendRenewalReminder(reminder: RenewalReminder): Promise<boolean> {
  try {
    const title = `${reminder.subscriptionName} Renews Soon`;
    const body =
      reminder.daysUntilRenewal === 0
        ? `${reminder.subscriptionName} renews today for $${reminder.amount}`
        : `${reminder.subscriptionName} renews in ${reminder.daysUntilRenewal} days for $${reminder.amount}`;

    // TODO: Integrate with server's push notification system
    // await sendPushNotification(reminder.userId, {
    //   title,
    //   body,
    //   data: {
    //     type: "renewal_reminder",
    //     subscriptionId: reminder.subscriptionId.toString(),
    //     deepLink: "/subscriptions",
    //   },
    // });

    console.log(`[Notification] ${title}: ${body}`);
    return true;
  } catch (error) {
    console.error("Failed to send renewal reminder:", error);
    return false;
  }
}

/**
 * Send renewal reminders for all upcoming subscriptions
 * This should be called periodically (e.g., daily via a cron job)
 */
export async function sendAllRenewalReminders(daysAhead: number = 7): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  const reminders = await findUpcomingRenewals(daysAhead);

  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const success = await sendRenewalReminder(reminder);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return {
    total: reminders.length,
    sent,
    failed,
  };
}

/**
 * Get renewal reminders for a specific user
 */
export async function getUserRenewalReminders(userId: number): Promise<RenewalReminder[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Next 30 days

  const db = await getDb();
  if (!db) return [];

  const userSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        lte(subscriptions.nextRenewalDate, futureDate)
      )
    );

  return userSubs
    .map((sub) => {
      const daysUntil = sub.nextRenewalDate
        ? Math.ceil(
            (sub.nextRenewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        subscriptionId: sub.id,
        userId: sub.userId,
        subscriptionName: sub.name,
        amount: sub.amount,
        daysUntilRenewal: daysUntil,
        nextRenewalDate: sub.nextRenewalDate,
      };
    })
    .sort((a: RenewalReminder, b: RenewalReminder) => a.daysUntilRenewal - b.daysUntilRenewal);
}
