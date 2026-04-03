/**
 * Email Provider OAuth Configuration
 * Handles Gmail and Outlook OAuth setup and token management
 */

export type EmailProvider = "gmail" | "outlook";

/**
 * Get email provider credentials from environment variables
 * These should be set via the Secrets panel in the UI
 */
function getGmailCredentials() {
  return {
    clientId: process.env.GMAIL_CLIENT_ID || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
  };
}

function getOutlookCredentials() {
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID || "",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || "",
  };
}

/**
 * Get API base URL for OAuth callbacks.
 * Prefers the public-facing API URL so external OAuth providers (Google, Microsoft)
 * can redirect back to a reachable endpoint.
 */
function getApiUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.API_URL ||
    "http://localhost:3000"
  );
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

/**
 * Gmail OAuth Configuration
 * Requires GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET env vars
 */
export function getGmailConfig(): OAuthConfig {
  const creds = getGmailCredentials();
  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: `${getApiUrl()}/api/oauth/gmail/callback`,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };
}

/**
 * Outlook OAuth Configuration
 * Requires OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET env vars
 */
export function getOutlookConfig(): OAuthConfig {
  const creds = getOutlookCredentials();
  return {
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: `${getApiUrl()}/api/oauth/outlook/callback`,
    scopes: [
      "Mail.Read",
      "Mail.Send",
      "User.Read",
      "offline_access",
    ],
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
}

/**
 * Get OAuth config for a specific provider
 */
export function getOAuthConfig(provider: EmailProvider): OAuthConfig {
  if (provider === "gmail") {
    return getGmailConfig();
  } else if (provider === "outlook") {
    return getOutlookConfig();
  }
  throw new Error(`Unknown email provider: ${provider}`);
}

/**
 * Validate that required OAuth credentials are configured
 */
export function validateOAuthConfig(provider: EmailProvider): { valid: boolean; error?: string } {
  const config = getOAuthConfig(provider);

  if (!config.clientId) {
    return { valid: false, error: `${provider.toUpperCase()}_CLIENT_ID not configured` };
  }
  if (!config.clientSecret) {
    return { valid: false, error: `${provider.toUpperCase()}_CLIENT_SECRET not configured` };
  }

  return { valid: true };
}

/**
 * Build authorization URL for OAuth flow
 */
export function buildAuthorizationUrl(
  provider: EmailProvider,
  state: string,
  codeChallenge?: string
): string {
  const config = getOAuthConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: "S256" }),
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  provider: EmailProvider,
  code: string,
  codeVerifier?: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}> {
  const config = getOAuthConfig(provider);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    ...(codeVerifier && { code_verifier: codeVerifier }),
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed for ${provider}: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  provider: EmailProvider,
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresIn?: number;
  tokenType: string;
}> {
  const config = getOAuthConfig(provider);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed for ${provider}: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
  };
}
