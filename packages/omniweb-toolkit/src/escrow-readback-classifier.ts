export interface EscrowReadbackResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export type EscrowReadbackSupportClassification =
  | "supported"
  | "degraded-wrapper"
  | "inconclusive-readback"
  | "runtime-api-error"
  | "error-classified";

export interface EscrowReadbackExpectedState {
  platform?: string;
  username?: string;
  amount?: number;
  txHash?: string;
}

export interface EscrowReadbackSupport {
  claimable: EscrowReadbackResult;
  escrowBalance: EscrowReadbackResult;
  classification: EscrowReadbackSupportClassification;
  reasonCodes: string[];
  sanitizedErrors: string[];
}

export type EscrowProofStatus = "GREEN" | "DEGRADED" | "STUCK" | "BLOCKED";

export interface EscrowProofClassification {
  ok: boolean;
  status: EscrowProofStatus;
  confirmationSurface:
    | "tx_and_readback_wrappers"
    | "tx_confirmed_readback_wrappers_degraded"
    | "tx_confirmed_readback_inconclusive"
    | "tx_confirmed_readback_error"
    | "tx_unconfirmed_readback_supported"
    | "tx_unconfirmed_readback_degraded"
    | "tx_unconfirmed_readback_inconclusive"
    | "runtime_or_api_blocked";
  reasonCodes: string[];
}

export function classifyEscrowReadbackSupport(
  claimable: EscrowReadbackResult,
  escrowBalance: EscrowReadbackResult,
  expected?: EscrowReadbackExpectedState,
): EscrowReadbackSupport {
  const sanitizedErrors = [claimable.error, escrowBalance.error]
    .filter((value): value is string => Boolean(value))
    .map(sanitizeEscrowReadbackText);
  const errorText = sanitizedErrors.join(" | ").toLowerCase();
  const directReadbackText = [
    ...sanitizedErrors,
    stringifyDirectReadbackData(claimable.data),
    stringifyDirectReadbackData(escrowBalance.data),
  ].filter(Boolean).join(" | ").toLowerCase();
  const reasonCodes = new Set<string>();

  if (containsRuntimeApi502(errorText)) {
    reasonCodes.add("runtime_api_502");
    return {
      claimable,
      escrowBalance,
      classification: "runtime-api-error",
      reasonCodes: [...reasonCodes],
      sanitizedErrors,
    };
  }

  if (containsMissingEscrowQueryMethod(directReadbackText)) {
    reasonCodes.add("escrow_query_method_not_implemented");
    return {
      claimable,
      escrowBalance,
      classification: "degraded-wrapper",
      reasonCodes: [...reasonCodes],
      sanitizedErrors,
    };
  }

  if (claimable.ok && escrowBalance.ok) {
    const claimableEvidence = hasClaimableEscrowEvidence(claimable.data, expected);
    const balanceEvidence = hasPositiveEscrowBalanceEvidence(escrowBalance.data, expected);
    if (!claimableEvidence) reasonCodes.add("claimable_product_state_not_proven");
    if (!balanceEvidence) reasonCodes.add("escrow_balance_product_state_not_proven");
    if (claimableEvidence && balanceEvidence) {
      return {
        claimable,
        escrowBalance,
        classification: "supported",
        reasonCodes: [],
        sanitizedErrors,
      };
    }

    return {
      claimable,
      escrowBalance,
      classification: "inconclusive-readback",
      reasonCodes: [...reasonCodes],
      sanitizedErrors,
    };
  }

  if (!claimable.ok) reasonCodes.add("claimable_readback_failed");
  if (!escrowBalance.ok) reasonCodes.add("escrow_balance_readback_failed");
  return {
    claimable,
    escrowBalance,
    classification: "error-classified",
    reasonCodes: [...reasonCodes],
    sanitizedErrors,
  };
}

export function classifyEscrowProofReadback(
  readback: Pick<EscrowReadbackSupport, "classification" | "reasonCodes">,
  txConfirmed: boolean,
  verificationReason?: string,
): EscrowProofClassification {
  const reasonCodes = new Set<string>(readback.reasonCodes);
  if (!txConfirmed) reasonCodes.add("tx_not_confirmed");

  if (readback.reasonCodes.includes("runtime_api_502") || containsRuntimeApi502(verificationReason ?? "")) {
    reasonCodes.add("runtime_or_api_502");
    return {
      ok: false,
      status: "BLOCKED",
      confirmationSurface: "runtime_or_api_blocked",
      reasonCodes: [...reasonCodes],
    };
  }

  if (txConfirmed && readback.classification === "supported") {
    return {
      ok: true,
      status: "GREEN",
      confirmationSurface: "tx_and_readback_wrappers",
      reasonCodes: [...reasonCodes],
    };
  }

  if (txConfirmed && readback.classification === "degraded-wrapper") {
    reasonCodes.add("readback_wrappers_degraded");
    return {
      ok: false,
      status: "DEGRADED",
      confirmationSurface: "tx_confirmed_readback_wrappers_degraded",
      reasonCodes: [...reasonCodes],
    };
  }

  if (txConfirmed && readback.classification === "inconclusive-readback") {
    reasonCodes.add("readback_product_state_not_proven");
    return {
      ok: false,
      status: "DEGRADED",
      confirmationSurface: "tx_confirmed_readback_inconclusive",
      reasonCodes: [...reasonCodes],
    };
  }

  if (txConfirmed) {
    reasonCodes.add("readback_error_after_tx_confirmation");
    return {
      ok: false,
      status: "DEGRADED",
      confirmationSurface: "tx_confirmed_readback_error",
      reasonCodes: [...reasonCodes],
    };
  }

  if (readback.classification === "supported") {
    reasonCodes.add("readback_supported_but_tx_unconfirmed");
    return {
      ok: false,
      status: "STUCK",
      confirmationSurface: "tx_unconfirmed_readback_supported",
      reasonCodes: [...reasonCodes],
    };
  }

  if (readback.classification === "inconclusive-readback") {
    reasonCodes.add("readback_product_state_not_proven");
    return {
      ok: false,
      status: "STUCK",
      confirmationSurface: "tx_unconfirmed_readback_inconclusive",
      reasonCodes: [...reasonCodes],
    };
  }

  reasonCodes.add("readback_degraded_and_tx_unconfirmed");
  return {
    ok: false,
    status: "STUCK",
    confirmationSurface: "tx_unconfirmed_readback_degraded",
    reasonCodes: [...reasonCodes],
  };
}

export function classifyEscrowRecheckRuntimeBlock(reason: string): EscrowProofClassification {
  const reasonCodes = new Set<string>(["escrow_recheck_runtime_unavailable"]);
  if (containsRuntimeApi502(reason)) {
    reasonCodes.add("runtime_api_502");
    reasonCodes.add("runtime_or_api_502");
  }
  return {
    ok: false,
    status: "BLOCKED",
    confirmationSurface: "runtime_or_api_blocked",
    reasonCodes: [...reasonCodes],
  };
}

function containsRuntimeApi502(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b502\s+bad gateway\b/.test(lower)
    || /\bbad gateway\s+502\b/.test(lower)
    || /\bhttp(?:\s+status|\s+code)?\s+502\b/.test(lower)
    || /\bstatus(?:\s+code)?\s+502\b/.test(lower)
    || lower.includes("bad gateway");
}

function containsMissingEscrowQueryMethod(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("method not implemented")
    || lower.includes("not available")
    || lower.includes("is not a function")
    || lower.includes("not a function")
    || lower.includes("undefined function");
}

function sanitizeEscrowReadbackText(text: string): string {
  return text.replace(/(authorization|bearer|token|secret|password)=([^&\s]+)/gi, "$1=REDACTED");
}

function stringifyDirectReadbackData(data: unknown): string {
  return typeof data === "string" ? data : "";
}

function hasClaimableEscrowEvidence(data: unknown, expected?: EscrowReadbackExpectedState): boolean {
  const rows = toObjectRows(data);
  if (rows.length === 0) return false;
  if (!expected?.platform && !expected?.username) return rows.some((row) => Object.keys(row).length > 0);
  return rows.some((row) => matchesExpectedIdentity(row, expected));
}

function hasPositiveEscrowBalanceEvidence(data: unknown, expected?: EscrowReadbackExpectedState): boolean {
  const candidates = collectNumericCandidates(data);
  const minAmount = typeof expected?.amount === "number" && expected.amount > 0 ? expected.amount : 0;
  return candidates.some((value) => value > 0 && (minAmount === 0 || value + Number.EPSILON >= minAmount));
}

function toObjectRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }
  return isRecord(data) ? [data] : [];
}

function matchesExpectedIdentity(row: Record<string, unknown>, expected: EscrowReadbackExpectedState): boolean {
  const rowPlatform = firstString(row, ["platform", "identityPlatform", "provider", "service"]);
  const rowUsername = firstString(row, ["username", "handle", "recipient", "recipientUsername"]);
  const combinedIdentity = firstString(row, ["identity", "socialIdentity", "target", "recipientIdentity"]);
  const rowTxHash = firstString(row, ["txHash", "transactionHash", "hash"]);
  if (expected.platform && rowPlatform && normalizeIdentityValue(rowPlatform) !== normalizeIdentityValue(expected.platform)) {
    return false;
  }
  if (expected.txHash && normalizeTxHash(rowTxHash) === normalizeTxHash(expected.txHash)) return true;
  if (combinedIdentity && matchesCombinedIdentity(combinedIdentity, expected)) return true;
  const platformMatches = !expected.platform || normalizeIdentityValue(rowPlatform) === normalizeIdentityValue(expected.platform);
  const usernameMatches = !expected.username || normalizeIdentityValue(rowUsername) === normalizeIdentityValue(expected.username);
  return platformMatches && usernameMatches;
}

function firstString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function normalizeIdentityValue(value: string | undefined): string | undefined {
  return value?.trim().replace(/^@/, "").toLowerCase();
}

function normalizeTxHash(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function matchesCombinedIdentity(value: string, expected: EscrowReadbackExpectedState): boolean {
  const normalized = normalizeIdentityValue(value);
  if (!normalized) return false;
  const platform = normalizeIdentityValue(expected.platform);
  const username = normalizeIdentityValue(expected.username);
  if (platform && username) {
    return normalized === `${platform}:${username}`
      || normalized === `${platform}/${username}`
      || normalized === `${platform}@${username}`;
  }
  return Boolean(username && normalized === username);
}

function collectNumericCandidates(data: unknown): number[] {
  if (typeof data === "number" && Number.isFinite(data)) return [data];
  if (typeof data === "string") {
    const parsed = Number(data.replace(/\s*DEM$/i, ""));
    return Number.isFinite(parsed) ? [parsed] : [];
  }
  if (!isRecord(data)) return [];

  const keys = [
    "balance",
    "escrowBalance",
    "claimable",
    "claimableAmount",
    "amount",
    "total",
    "totalAmount",
    "dem",
    "value",
  ];
  return keys.flatMap((key) => collectNumericCandidates(data[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
