import { sanitizeUrl } from "../../../src/toolkit/sdk-bridge.js";

const SENSITIVE_QUERY_PARAM_PATTERN = /(?:api[-_]?key|access[-_]?token|auth[-_]?token|id[-_]?token|refresh[-_]?token|client[-_]?secret|client[-_]?id|bearer|token|auth|signature|sig|secret|password|passwd|pass|session|code|key)/i;

function normalizeQueryParamKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export interface AttestUrlDiagnostics {
  safeDisplayUrl: string;
  hasQueryParams: boolean;
  queryParamKeys: string[];
  redactedQueryParamKeys: string[];
  preservesBenignQueryContext: boolean;
  requiresProbeForQueryParity: boolean;
}

export function analyzeAttestUrlDiagnostics(
  attestUrl: string,
  opts: { probeAttest?: boolean } = {},
): AttestUrlDiagnostics {
  const safeDisplayUrl = sanitizeUrl(attestUrl);

  try {
    const parsed = new URL(attestUrl);
    const queryParamKeys = Array.from(new Set(parsed.searchParams.keys())).sort();
    const redactedQueryParamKeys = queryParamKeys.filter((key) =>
      SENSITIVE_QUERY_PARAM_PATTERN.test(normalizeQueryParamKey(key))
    );
    const hasQueryParams = queryParamKeys.length > 0;

    return {
      safeDisplayUrl,
      hasQueryParams,
      queryParamKeys,
      redactedQueryParamKeys,
      preservesBenignQueryContext: hasQueryParams && redactedQueryParamKeys.length < queryParamKeys.length,
      requiresProbeForQueryParity: hasQueryParams && !opts.probeAttest,
    };
  } catch {
    return {
      safeDisplayUrl,
      hasQueryParams: false,
      queryParamKeys: [],
      redactedQueryParamKeys: [],
      preservesBenignQueryContext: false,
      requiresProbeForQueryParity: false,
    };
  }
}

export function buildAttestUrlWarnings(
  diagnostics: AttestUrlDiagnostics,
): string[] {
  const warnings: string[] = [];

  if (diagnostics.requiresProbeForQueryParity) {
    warnings.push(
      "Attest URL includes query params; static readiness validates local guards but does not prove DAHR parity for the exact query-bearing request. Use --probe-attest before making a launch claim.",
    );
  }

  if (diagnostics.redactedQueryParamKeys.length > 0) {
    warnings.push(
      `Sensitive attest-url query params are redacted in diagnostics: ${diagnostics.redactedQueryParamKeys.join(", ")}.`,
    );
  }

  return warnings;
}
