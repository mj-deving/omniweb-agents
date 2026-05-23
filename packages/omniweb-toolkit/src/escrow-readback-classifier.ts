export interface EscrowReadbackResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export type EscrowReadbackSupportClassification =
  | "supported"
  | "degraded-wrapper"
  | "runtime-api-error"
  | "error-classified";

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
    | "tx_confirmed_readback_error"
    | "tx_unconfirmed_readback_supported"
    | "tx_unconfirmed_readback_degraded"
    | "runtime_or_api_blocked";
  reasonCodes: string[];
}

export function classifyEscrowReadbackSupport(
  claimable: EscrowReadbackResult,
  escrowBalance: EscrowReadbackResult,
): EscrowReadbackSupport {
  const sanitizedErrors = [claimable.error, escrowBalance.error]
    .filter((value): value is string => Boolean(value))
    .map(sanitizeEscrowReadbackText);
  const readbackText = [
    ...sanitizedErrors,
    stringifyReadbackData(claimable.data),
    stringifyReadbackData(escrowBalance.data),
  ].filter(Boolean).join(" | ").toLowerCase();
  const reasonCodes = new Set<string>();

  if (containsRuntimeApi502(readbackText)) {
    reasonCodes.add("runtime_api_502");
    return {
      claimable,
      escrowBalance,
      classification: "runtime-api-error",
      reasonCodes: [...reasonCodes],
      sanitizedErrors,
    };
  }

  if (readbackText.includes("method not implemented") || readbackText.includes("not available")) {
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
    return {
      claimable,
      escrowBalance,
      classification: "supported",
      reasonCodes: [],
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

  reasonCodes.add("readback_degraded_and_tx_unconfirmed");
  return {
    ok: false,
    status: "STUCK",
    confirmationSurface: "tx_unconfirmed_readback_degraded",
    reasonCodes: [...reasonCodes],
  };
}

function containsRuntimeApi502(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("502") || lower.includes("bad gateway");
}

function sanitizeEscrowReadbackText(text: string): string {
  return text.replace(/(authorization|bearer|token|secret|password)=([^&\s]+)/gi, "$1=REDACTED");
}

function stringifyReadbackData(data: unknown): string {
  if (typeof data === "string") return data;
  if (data === undefined || data === null) return "";
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
