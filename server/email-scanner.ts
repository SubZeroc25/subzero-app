/**
 * Email Scanner Service
 * Fetches emails from Gmail and Outlook and extracts subscription information
 */

import { getOAuthConfig, type EmailProvider } from "@/server/email-providers";
import { extractSubscriptionsFromEmail } from "@/server/ai-extraction";

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  provider: EmailProvider;
}

/**
 * Fetch emails from Gmail API
 * Requires a valid access token for the user
 */
export async function fetchGmailEmails(
  accessToken: string,
  query: string = "subject:(invoice OR receipt OR subscription OR billing OR charge OR renewal)",
  maxResults: number = 10
): Promise<EmailMessage[]> {
  try {
    const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.messages || [];

    // Fetch full message details for each message
    const emailMessages: EmailMessage[] = [];

    for (const message of messages.slice(0, maxResults)) {
      try {
        const detailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!detailResponse.ok) continue;

        const detail = await detailResponse.json();
        const headers = detail.payload.headers || [];

        const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const date = new Date(parseInt(detail.internalDate));

        // Extract email body
        let body = "";
        if (detail.payload.parts) {
          const textPart = detail.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        } else if (detail.payload.body.data) {
          body = Buffer.from(detail.payload.body.data, "base64").toString("utf-8");
        }

        emailMessages.push({
          id: message.id,
          from,
          subject,
          body,
          date,
          provider: "gmail",
        });
      } catch (error) {
        console.error("Error fetching Gmail message details:", error);
        continue;
      }
    }

    return emailMessages;
  } catch (error) {
    console.error("Error fetching Gmail emails:", error);
    throw error;
  }
}

/**
 * Fetch emails from Outlook API
 * Requires a valid access token for the user
 */
export async function fetchOutlookEmails(
  accessToken: string,
  maxResults: number = 10
): Promise<EmailMessage[]> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=contains(subject,'invoice') or contains(subject,'receipt') or contains(subject,'subscription') or contains(subject,'billing')&$top=" +
        maxResults,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages = data.value || [];

    const emailMessages: EmailMessage[] = messages.map((msg: any) => ({
      id: msg.id,
      from: msg.from?.emailAddress?.address || "",
      subject: msg.subject || "",
      body: msg.bodyPreview || "",
      date: new Date(msg.receivedDateTime),
      provider: "outlook",
    }));

    return emailMessages;
  } catch (error) {
    console.error("Error fetching Outlook emails:", error);
    throw error;
  }
}

/**
 * Scan emails from a provider and extract subscriptions
 */
export async function scanEmailsForSubscriptions(
  provider: EmailProvider,
  accessToken: string
): Promise<any[]> {
  try {
    let emails: EmailMessage[] = [];

    if (provider === "gmail") {
      emails = await fetchGmailEmails(accessToken);
    } else if (provider === "outlook") {
      emails = await fetchOutlookEmails(accessToken);
    } else {
      throw new Error(`Unknown email provider: ${provider}`);
    }

    if (emails.length === 0) {
      console.log(`No emails found for ${provider}`);
      return [];
    }

    // Extract subscriptions from emails using AI
    const allSubscriptions = [];
    for (const email of emails) {
      const emailContent = `Subject: ${email.subject}\n\nFrom: ${email.from}\n\n${email.body}`;
      const result = await extractSubscriptionsFromEmail(emailContent);
      allSubscriptions.push(...result.subscriptions);
    }
    const subscriptions = allSubscriptions;

    return subscriptions;
  } catch (error) {
    console.error(`Error scanning ${provider} emails:`, error);
    throw error;
  }
}

/**
 * Test email provider connectivity
 */
export async function testEmailProviderConnection(
  provider: EmailProvider,
  accessToken: string
): Promise<boolean> {
  try {
    if (provider === "gmail") {
      const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } else if (provider === "outlook") {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    }
    return false;
  } catch (error) {
    console.error(`Error testing ${provider} connection:`, error);
    return false;
  }
}
