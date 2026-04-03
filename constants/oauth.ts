import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as ReactNative from "react-native";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
const bundleId = "space.manus.subzero.t20260327130423";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * 
 * The Manus OAuth portal validates the redirect_uri and state parameter.
 * The state parameter is base64-encoded redirect_uri.
 * 
 * On web: uses the API server callback endpoint (cookie-based auth).
 * On native: uses the API server callback endpoint too, but the state
 *   encodes the deep link scheme so the server can redirect back to the app.
 */
export const getRedirectUri = () => {
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    return `${apiBase}/api/oauth/callback`;
  }
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api/oauth/callback`;
  }
  return `${env.deepLinkScheme}://oauth/callback`;
};

/**
 * Build the login URL for the Manus OAuth portal.
 * 
 * Key insight: The state parameter must encode the redirect_uri that the
 * OAuth portal will use. For native apps, we encode the API server callback
 * URL in the redirectUri param, but encode the DEEP LINK scheme in the state
 * so the server knows to redirect back to the native app after processing.
 */
export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();

  // For native: encode the deep link URL in state so the server
  // can detect it's a native callback and redirect back to the app.
  // For web: encode the redirect URI normally.
  const isNative = ReactNative.Platform.OS !== "web";
  const stateValue = isNative
    ? `${env.deepLinkScheme}://oauth/callback`
    : redirectUri;
  const state = encodeState(stateValue);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native: Uses WebBrowser.openAuthSessionAsync which handles the
 * redirect back to the app properly in both Expo Go and standalone builds.
 * The server callback at /api/oauth/callback will redirect back to the app
 * with a deep link containing the session token.
 *
 * On web: Redirects the current window to the login URL.
 * The server callback sets a cookie and redirects back to the frontend.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getLoginUrl();
  console.log("[OAuth] Starting login flow...");
  console.log("[OAuth] Login URL:", loginUrl);
  console.log("[OAuth] Redirect URI:", getRedirectUri());

  if (ReactNative.Platform.OS === "web") {
    // On web, redirect the current window
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  // On native, use WebBrowser.openAuthSessionAsync
  try {
    const appRedirectUrl = `${env.deepLinkScheme}://oauth/callback`;
    console.log("[OAuth] Opening auth session with app redirect:", appRedirectUrl);

    const result = await WebBrowser.openAuthSessionAsync(loginUrl, appRedirectUrl);
    console.log("[OAuth] Auth session result:", JSON.stringify(result));

    if (result.type === "success" && result.url) {
      console.log("[OAuth] Auth session succeeded with URL:", result.url);
      return result.url;
    } else {
      console.log("[OAuth] Auth session was cancelled or dismissed");
      return null;
    }
  } catch (error) {
    console.error("[OAuth] Failed to open auth session:", error);
    try {
      await Linking.openURL(loginUrl);
    } catch (linkError) {
      console.error("[OAuth] Fallback Linking.openURL also failed:", linkError);
    }
    return null;
  }
}
