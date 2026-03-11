/**
 * URL safety validation for dynamic source discovery.
 *
 * Used by crawler agent to validate newly discovered API endpoints
 * before adding them to the discovered sources registry.
 *
 * Rules:
 *   - HTTPS only (no HTTP, file://, data:)
 *   - No private/localhost IPs (127.x, 10.x, 172.16-31.x, 192.168.x, ::1)
 *   - Content-type whitelist (application/json, text/xml, text/plain)
 *   - Response size limits (16KB for TLSN, 1MB for DAHR)
 */

// ── Types ──────────────────────────────────────────

export interface UrlValidationResult {
  safe: boolean;
  reason?: string;
}

// ── Private IP Patterns ────────────────────────────

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "::1",
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,                     // 127.0.0.0/8
  /^10\./,                      // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,                // 192.168.0.0/16
  /^169\.254\./,                // Link-local
  /^0\./,                       // 0.0.0.0/8
];

// ── Validation ─────────────────────────────────────

/**
 * Validate a URL for safe use as a dynamic attestation source.
 * Returns { safe: true } or { safe: false, reason: "..." }.
 */
export function validateSourceUrl(url: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: "Invalid URL" };
  }

  // Scheme check: HTTPS only
  if (parsed.protocol !== "https:") {
    return { safe: false, reason: `Scheme "${parsed.protocol}" not allowed — HTTPS only` };
  }

  // Host check: block localhost and private IPs
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) {
    return { safe: false, reason: `Host "${host}" is blocked (localhost/loopback)` };
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) {
      return { safe: false, reason: `Host "${host}" is a private IP address` };
    }
  }

  // No credentials in URL
  if (parsed.username || parsed.password) {
    return { safe: false, reason: "URL contains credentials — never forward auth to discovered sources" };
  }

  return { safe: true };
}
