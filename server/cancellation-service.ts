/**
 * Subscription Cancellation Service
 * Generates aggressive cancellation emails using AI and sends them
 * to subscription providers on behalf of the user via Gmail or Outlook API.
 */

import { invokeLLM } from "./_core/llm";

// ── Known Provider Cancellation Contacts ─────────────────
// Maps common subscription provider names to their support/cancellation email addresses
const PROVIDER_CONTACTS: Record<string, { email: string; name: string }> = {
  // Streaming & Entertainment
  netflix: { email: "info@account.netflix.com", name: "Netflix" },
  spotify: { email: "support@spotify.com", name: "Spotify" },
  "apple music": { email: "support@apple.com", name: "Apple Music" },
  "apple tv": { email: "support@apple.com", name: "Apple TV+" },
  "apple tv+": { email: "support@apple.com", name: "Apple TV+" },
  "disney+": { email: "support@disneyplus.com", name: "Disney+" },
  "disney plus": { email: "support@disneyplus.com", name: "Disney+" },
  hulu: { email: "support@hulu.com", name: "Hulu" },
  "hbo max": { email: "support@hbomax.com", name: "HBO Max" },
  max: { email: "support@max.com", name: "Max" },
  "amazon prime": { email: "prime-support@amazon.com", name: "Amazon Prime" },
  "prime video": { email: "prime-support@amazon.com", name: "Amazon Prime Video" },
  "youtube premium": { email: "yt-premium-support@google.com", name: "YouTube Premium" },
  "youtube music": { email: "yt-music-support@google.com", name: "YouTube Music" },
  peacock: { email: "peacocksupport@peacocktv.com", name: "Peacock" },
  paramount: { email: "support@paramountplus.com", name: "Paramount+" },
  "paramount+": { email: "support@paramountplus.com", name: "Paramount+" },
  crunchyroll: { email: "support@crunchyroll.com", name: "Crunchyroll" },

  // Productivity & Software
  "microsoft 365": { email: "support@microsoft.com", name: "Microsoft 365" },
  "office 365": { email: "support@microsoft.com", name: "Microsoft Office 365" },
  "adobe creative cloud": { email: "support@adobe.com", name: "Adobe Creative Cloud" },
  adobe: { email: "support@adobe.com", name: "Adobe" },
  notion: { email: "team@makenotion.com", name: "Notion" },
  slack: { email: "feedback@slack.com", name: "Slack" },
  zoom: { email: "support@zoom.us", name: "Zoom" },
  dropbox: { email: "support@dropbox.com", name: "Dropbox" },
  evernote: { email: "support@evernote.com", name: "Evernote" },
  grammarly: { email: "support@grammarly.com", name: "Grammarly" },
  canva: { email: "support@canva.com", name: "Canva" },
  figma: { email: "support@figma.com", name: "Figma" },
  "1password": { email: "support@1password.com", name: "1Password" },
  lastpass: { email: "support@lastpass.com", name: "LastPass" },
  todoist: { email: "support@todoist.com", name: "Todoist" },

  // Cloud & Dev
  github: { email: "support@github.com", name: "GitHub" },
  "github pro": { email: "support@github.com", name: "GitHub Pro" },
  "github copilot": { email: "support@github.com", name: "GitHub Copilot" },
  aws: { email: "aws-billing@amazon.com", name: "Amazon Web Services" },
  "google cloud": { email: "cloud-support@google.com", name: "Google Cloud" },
  "google workspace": { email: "workspace-support@google.com", name: "Google Workspace" },
  "google one": { email: "support@google.com", name: "Google One" },
  icloud: { email: "support@apple.com", name: "Apple iCloud" },
  "icloud+": { email: "support@apple.com", name: "Apple iCloud+" },
  heroku: { email: "support@heroku.com", name: "Heroku" },
  vercel: { email: "support@vercel.com", name: "Vercel" },
  digitalocean: { email: "support@digitalocean.com", name: "DigitalOcean" },

  // AI
  chatgpt: { email: "support@openai.com", name: "ChatGPT" },
  "chatgpt plus": { email: "support@openai.com", name: "ChatGPT Plus" },
  openai: { email: "support@openai.com", name: "OpenAI" },
  claude: { email: "support@anthropic.com", name: "Claude" },
  anthropic: { email: "support@anthropic.com", name: "Anthropic" },
  midjourney: { email: "support@midjourney.com", name: "Midjourney" },
  jasper: { email: "support@jasper.ai", name: "Jasper AI" },

  // Health & Fitness
  headspace: { email: "help@headspace.com", name: "Headspace" },
  calm: { email: "support@calm.com", name: "Calm" },
  peloton: { email: "support@onepeloton.com", name: "Peloton" },
  strava: { email: "support@strava.com", name: "Strava" },
  fitbit: { email: "support@fitbit.com", name: "Fitbit Premium" },
  noom: { email: "support@noom.com", name: "Noom" },
  myfitnesspal: { email: "support@myfitnesspal.com", name: "MyFitnessPal" },

  // News & Media
  "new york times": { email: "customercare@nytimes.com", name: "The New York Times" },
  nytimes: { email: "customercare@nytimes.com", name: "The New York Times" },
  "wall street journal": { email: "support@wsj.com", name: "The Wall Street Journal" },
  wsj: { email: "support@wsj.com", name: "The Wall Street Journal" },
  "washington post": { email: "support@washpost.com", name: "The Washington Post" },
  medium: { email: "yourfriends@medium.com", name: "Medium" },
  substack: { email: "support@substack.com", name: "Substack" },

  // Finance
  robinhood: { email: "support@robinhood.com", name: "Robinhood" },
  coinbase: { email: "support@coinbase.com", name: "Coinbase" },
  "coinbase pro": { email: "support@coinbase.com", name: "Coinbase Pro" },
  mint: { email: "support@mint.com", name: "Mint" },
  ynab: { email: "support@ynab.com", name: "YNAB" },

  // VPN & Security
  nordvpn: { email: "support@nordvpn.com", name: "NordVPN" },
  expressvpn: { email: "support@expressvpn.com", name: "ExpressVPN" },
  surfshark: { email: "support@surfshark.com", name: "Surfshark" },
  norton: { email: "support@norton.com", name: "Norton" },
  mcafee: { email: "support@mcafee.com", name: "McAfee" },

  // Shopping & Delivery
  "amazon prime video": { email: "prime-support@amazon.com", name: "Amazon Prime Video" },
  instacart: { email: "help@instacart.com", name: "Instacart" },
  doordash: { email: "support@doordash.com", name: "DoorDash" },
  "uber eats": { email: "support@uber.com", name: "Uber Eats" },
  "uber one": { email: "support@uber.com", name: "Uber One" },

  // Social & Communication
  linkedin: { email: "support@linkedin.com", name: "LinkedIn Premium" },
  "linkedin premium": { email: "support@linkedin.com", name: "LinkedIn Premium" },
  tinder: { email: "support@gotinder.com", name: "Tinder" },
  bumble: { email: "support@bumble.com", name: "Bumble" },
  discord: { email: "support@discord.com", name: "Discord Nitro" },
  "discord nitro": { email: "support@discord.com", name: "Discord Nitro" },
  twitch: { email: "purchasesupport@twitch.tv", name: "Twitch" },

  // Education
  skillshare: { email: "help@skillshare.com", name: "Skillshare" },
  coursera: { email: "support@coursera.org", name: "Coursera" },
  udemy: { email: "support@udemy.com", name: "Udemy" },
  duolingo: { email: "support@duolingo.com", name: "Duolingo" },
  masterclass: { email: "support@masterclass.com", name: "MasterClass" },
  brilliant: { email: "support@brilliant.org", name: "Brilliant" },
};

/**
 * Look up a provider's cancellation email address
 */
export function getProviderContact(
  subscriptionName: string,
  providerName: string
): { email: string; name: string } | null {
  const nameKey = subscriptionName.toLowerCase().trim();
  const providerKey = providerName.toLowerCase().trim();

  // Try exact match on subscription name first
  if (PROVIDER_CONTACTS[nameKey]) return PROVIDER_CONTACTS[nameKey];
  // Then try provider name
  if (PROVIDER_CONTACTS[providerKey]) return PROVIDER_CONTACTS[providerKey];

  // Try partial match
  for (const [key, contact] of Object.entries(PROVIDER_CONTACTS)) {
    if (nameKey.includes(key) || key.includes(nameKey)) return contact;
    if (providerKey.includes(key) || key.includes(providerKey)) return contact;
  }

  return null;
}

/**
 * Generate an aggressive cancellation email using AI
 */
export async function generateCancellationEmail(params: {
  userName: string;
  userEmail: string;
  subscriptionName: string;
  providerName: string;
  amount: number;
  billingCycle: string;
  isFollowUp: boolean;
  followUpCount: number;
}): Promise<{ subject: string; body: string }> {
  const { userName, userEmail, subscriptionName, providerName, amount, billingCycle, isFollowUp, followUpCount } = params;

  const systemPrompt = `You are a consumer rights advocate writing cancellation emails on behalf of a customer. Your tone is firm, assertive, and no-nonsense. You cite consumer protection laws and demand immediate action. You are NOT rude, but you are extremely direct and leave no room for the company to delay or deflect.

Key principles:
- Reference the customer's RIGHT to cancel under consumer protection laws
- Demand written confirmation of cancellation within 24 hours
- Warn that continued charges will be disputed with their bank/credit card company
- Mention filing complaints with the FTC and state attorney general if not resolved
- Request confirmation that no further charges will be made
- If this is a follow-up, escalate the tone and urgency significantly
- Keep the email professional but aggressive — like a lawyer writing on behalf of a client
- Do NOT include any placeholder brackets or template markers — write the complete email
- The email should be plain text, no HTML or markdown formatting`;

  const followUpContext = isFollowUp
    ? `\n\nIMPORTANT: This is follow-up #${followUpCount}. The company has NOT responded to ${followUpCount} previous cancellation request(s). Escalate the tone significantly. Mention that you will be filing formal complaints and disputing ALL charges if this is not resolved within 24 hours. Reference that ignoring cancellation requests is a violation of FTC regulations.`
    : "";

  const userPrompt = `Write a cancellation email for the following subscription:

Customer Name: ${userName}
Customer Email: ${userEmail}
Service: ${subscriptionName}
Provider: ${providerName}
Amount: $${amount.toFixed(2)}/${billingCycle}
${followUpContext}

Generate a JSON response with "subject" and "body" fields. The subject should be direct and include "CANCELLATION REQUEST" or "IMMEDIATE CANCELLATION DEMANDED" for follow-ups. The body should be the complete email text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cancellation_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Email subject line" },
              body: { type: "string", description: "Full email body text" },
            },
            required: ["subject", "body"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content as string);
    return { subject: parsed.subject, body: parsed.body };
  } catch (error) {
    console.error("[Cancellation] AI email generation failed:", error);
    // Fallback template
    const subject = isFollowUp
      ? `URGENT: IMMEDIATE CANCELLATION DEMANDED - ${subscriptionName} (Follow-up #${followUpCount})`
      : `CANCELLATION REQUEST - ${subscriptionName} Subscription`;

    const body = isFollowUp
      ? `Dear ${providerName} Billing Department,

This is follow-up #${followUpCount} regarding my cancellation request for ${subscriptionName}. Your failure to respond to my previous cancellation request(s) is unacceptable and potentially violates FTC regulations regarding consumer cancellation rights.

I am demanding the IMMEDIATE cancellation of my ${subscriptionName} subscription ($${amount.toFixed(2)}/${billingCycle}).

Account holder: ${userName}
Account email: ${userEmail}

I require written confirmation of cancellation within 24 hours. If I do not receive confirmation, I will:
1. Dispute ALL charges with my bank/credit card company
2. File a formal complaint with the Federal Trade Commission (FTC)
3. File a complaint with my state Attorney General's office
4. Pursue any additional legal remedies available to me

Under the FTC's "Click-to-Cancel" rule and applicable consumer protection laws, you are required to process cancellation requests promptly. Continued charges after a cancellation request constitutes unauthorized billing.

Cancel my subscription immediately and confirm in writing.

${userName}`
      : `Dear ${providerName} Billing Department,

I am writing to formally request the immediate cancellation of my ${subscriptionName} subscription.

Account holder: ${userName}
Account email: ${userEmail}
Current charge: $${amount.toFixed(2)}/${billingCycle}

I am exercising my right as a consumer to cancel this subscription effective immediately. Under the FTC's "Click-to-Cancel" rule and applicable consumer protection laws, I am entitled to cancel my subscription without unnecessary barriers or delays.

I require:
1. Immediate cancellation of my subscription
2. Written confirmation that no further charges will be made
3. Confirmation email sent to ${userEmail}

If I do not receive confirmation within 48 hours, I will dispute all future charges with my financial institution and file a complaint with the FTC.

Please process this cancellation immediately.

Sincerely,
${userName}`;

    return { subject, body };
  }
}

/**
 * Send a cancellation email via Gmail API
 */
export async function sendCancellationViaGmail(
  accessToken: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Build RFC 2822 email message
    const emailLines = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      `MIME-Version: 1.0`,
      "",
      body,
    ];
    const rawEmail = emailLines.join("\r\n");

    // Base64url encode the email
    const encodedEmail = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Cancellation] Gmail send failed:", error);
      return { success: false, error: `Gmail API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("[Cancellation] Gmail send error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a cancellation email via Outlook/Microsoft Graph API
 */
export async function sendCancellationViaOutlook(
  accessToken: string,
  toEmail: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: body },
          toRecipients: [{ emailAddress: { address: toEmail } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Cancellation] Outlook send failed:", error);
      return { success: false, error: `Outlook API error: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Cancellation] Outlook send error:", error);
    return { success: false, error: error.message };
  }
}
