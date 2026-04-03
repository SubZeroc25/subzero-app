import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * 
 * Handles multi-segment domains properly:
 * - "3000-xxx.us2.manus.computer" -> ".us2.manus.computer"
 * - "3000-xxx.manuspre.computer" -> ".manuspre.computer"
 * 
 * The first segment (e.g., "3000-xxx") is the port-specific subdomain.
 * Everything after it is the parent domain that should be shared.
 * This allows cookies set by 3000-xxx to be read by 8081-xxx.
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain
  if (parts.length < 3) {
    return undefined;
  }

  // The first segment is the port-specific subdomain (e.g., "3000-xxx")
  // Return everything after it as the parent domain
  // e.g., "3000-xxx.us2.manus.computer" -> ".us2.manus.computer"
  return "." + parts.slice(1).join(".");
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
