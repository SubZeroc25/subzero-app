import { invokeLLM } from "./_core/llm";
import type { SubscriptionExtraction } from "../shared/types";

const EXTRACTION_PROMPT = `You are an AI that extracts subscription/billing information from email content.
Analyze the email and extract any subscription or recurring billing information.

Return JSON:
{
  "subscriptions": [
    {
      "name": "Service Name",
      "provider": "Company Name",
      "amount": 9.99,
      "currency": "USD",
      "billingCycle": "monthly|yearly|weekly|quarterly|one-time",
      "category": "entertainment|productivity|cloud|finance|health|education|shopping|news|social|utilities|other",
      "nextRenewalDate": "2025-04-15T00:00:00Z" or null
    }
  ],
  "isSubscriptionEmail": true/false
}

If the email is not related to subscriptions or billing, set isSubscriptionEmail to false and return empty subscriptions array.
Be precise with amounts and dates. If unsure about a field, use reasonable defaults.`;

const IMAGE_EXTRACTION_PROMPT = `You are an AI that extracts subscription/billing information from screenshots of billing emails, receipts, invoices, or subscription confirmation pages.

Analyze the image carefully and extract any subscription or recurring billing information you can find.

Return JSON:
{
  "subscriptions": [
    {
      "name": "Service Name",
      "provider": "Company Name",
      "amount": 9.99,
      "currency": "USD",
      "billingCycle": "monthly|yearly|weekly|quarterly|one-time",
      "category": "entertainment|productivity|cloud|finance|health|education|shopping|news|social|utilities|other",
      "nextRenewalDate": "2025-04-15T00:00:00Z" or null
    }
  ],
  "isSubscriptionContent": true/false
}

If the image does not contain subscription or billing information, set isSubscriptionContent to false and return empty subscriptions array.
Be precise with amounts and dates. Extract ALL subscriptions visible in the image. If unsure about a field, use reasonable defaults.`;

export interface ExtractionResult {
  subscriptions: SubscriptionExtraction[];
  isSubscriptionEmail: boolean;
}

export async function extractSubscriptionsFromEmail(emailContent: string): Promise<ExtractionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `Analyze this email:\n\n${emailContent}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return { subscriptions: [], isSubscriptionEmail: false };

    const parsed = JSON.parse(content);
    return {
      subscriptions: parsed.subscriptions || [],
      isSubscriptionEmail: parsed.isSubscriptionEmail ?? false,
    };
  } catch (error) {
    console.error("[AI Extraction] Failed to extract subscriptions:", error);
    return { subscriptions: [], isSubscriptionEmail: false };
  }
}

export async function extractSubscriptionsFromBatch(emails: string[]): Promise<ExtractionResult> {
  try {
    const batchContent = emails.map((e, i) => `--- EMAIL ${i + 1} ---\n${e}`).join("\n\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `${EXTRACTION_PROMPT}\n\nYou will receive multiple emails. Extract ALL unique subscriptions found across all emails. Deduplicate by service name.`,
        },
        { role: "user", content: `Analyze these emails:\n\n${batchContent}` },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return { subscriptions: [], isSubscriptionEmail: false };

    const parsed = JSON.parse(content);
    return {
      subscriptions: parsed.subscriptions || [],
      isSubscriptionEmail: (parsed.subscriptions?.length ?? 0) > 0,
    };
  } catch (error) {
    console.error("[AI Extraction] Batch extraction failed:", error);
    return { subscriptions: [], isSubscriptionEmail: false };
  }
}

/**
 * Extract subscriptions from a screenshot/photo of a billing email, receipt, or invoice.
 * Uses the LLM's vision capabilities to analyze the image.
 */
export async function extractSubscriptionsFromImage(imageUrl: string): Promise<ExtractionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: IMAGE_EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all subscription and billing information from this image." },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return { subscriptions: [], isSubscriptionEmail: false };

    const parsed = JSON.parse(content);
    return {
      subscriptions: parsed.subscriptions || [],
      isSubscriptionEmail: parsed.isSubscriptionContent ?? (parsed.subscriptions?.length ?? 0) > 0,
    };
  } catch (error) {
    console.error("[AI Extraction] Image extraction failed:", error);
    return { subscriptions: [], isSubscriptionEmail: false };
  }
}
