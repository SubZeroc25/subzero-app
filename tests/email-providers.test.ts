import { describe, it, expect, beforeAll } from "vitest";
import { validateOAuthConfig, getOAuthConfig } from "../server/email-providers";

describe("Email Provider OAuth Configuration", async () => {
  beforeAll(() => {
    // Set up test environment variables
    process.env.GMAIL_CLIENT_ID = "dev-gmail-client-id-placeholder";
    process.env.GMAIL_CLIENT_SECRET = "dev-gmail-client-secret-placeholder";
    process.env.OUTLOOK_CLIENT_ID = "dev-outlook-client-id-placeholder";
    process.env.OUTLOOK_CLIENT_SECRET = "dev-outlook-client-secret-placeholder";
    process.env.API_URL = "http://localhost:3000";
  });

  it("should validate Gmail OAuth configuration", () => {
    const result = validateOAuthConfig("gmail");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should validate Outlook OAuth configuration", () => {
    const result = validateOAuthConfig("outlook");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return Gmail OAuth config with correct endpoints", () => {
    const config = getOAuthConfig("gmail");
    expect(config.clientId).toBe("dev-gmail-client-id-placeholder");
    expect(config.clientSecret).toBe("dev-gmail-client-secret-placeholder");
    expect(config.authorizationEndpoint).toContain("accounts.google.com");
    expect(config.tokenEndpoint).toContain("oauth2.googleapis.com");
    expect(config.scopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("should return Outlook OAuth config with correct endpoints", () => {
    const config = getOAuthConfig("outlook");
    expect(config.clientId).toBe("dev-outlook-client-id-placeholder");
    expect(config.clientSecret).toBe("dev-outlook-client-secret-placeholder");
    expect(config.authorizationEndpoint).toContain("login.microsoftonline.com");
    expect(config.tokenEndpoint).toContain("login.microsoftonline.com");
    expect(config.scopes).toContain("Mail.Read");
  });

  it("should construct correct redirect URIs", () => {
    const gmailConfig = getOAuthConfig("gmail");
    expect(gmailConfig.redirectUri).toContain("/api/oauth/gmail/callback");

    const outlookConfig = getOAuthConfig("outlook");
    expect(outlookConfig.redirectUri).toContain("/api/oauth/outlook/callback");
  });

  it("should throw error for unknown provider", () => {
    expect(() => getOAuthConfig("unknown" as any)).toThrow("Unknown email provider");
  });
});
