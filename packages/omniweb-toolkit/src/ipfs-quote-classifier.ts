export type IPFSQuoteClassification =
  | "concrete"
  | "unsupported-runtime"
  | "runtime-error"
  | "unclassified";

export interface IPFSQuoteSupport {
  classification: IPFSQuoteClassification;
  concrete: boolean;
  quotedFeeDem: number | null;
  withinBudget: boolean | null;
  budgetDem: number | null;
  reasonCodes: string[];
  sanitizedError?: string;
}

export interface IPFSPayloadSafety {
  ok: boolean;
  reasonCodes: string[];
}

export function classifyIPFSQuoteSupport(input: {
  quote: unknown;
  quoteError?: string;
  budgetDem?: number | null;
}): IPFSQuoteSupport {
  const budgetDem = Number.isFinite(input.budgetDem ?? NaN) ? Number(input.budgetDem) : null;
  const reasonCodes = new Set<string>();

  if (input.quoteError) {
    reasonCodes.add("ipfs_quote_runtime_error");
    return {
      classification: "runtime-error",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
      sanitizedError: sanitizeIPFSText(input.quoteError),
    };
  }

  const quoteText = stringifyQuote(input.quote).toLowerCase();
  if (quoteText.includes("unknown message")) {
    reasonCodes.add("ipfs_quote_unknown_message");
    return {
      classification: "unsupported-runtime",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
    };
  }

  const quotedFeeDem = extractDemFee(input.quote);
  if (quotedFeeDem === null) {
    reasonCodes.add("ipfs_quote_fee_missing");
    return {
      classification: "unclassified",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
    };
  }

  const withinBudget = budgetDem === null ? null : quotedFeeDem <= budgetDem;
  if (budgetDem === null) reasonCodes.add("explicit_budget_missing");
  if (withinBudget === false) reasonCodes.add("ipfs_quote_exceeds_budget");

  return {
    classification: "concrete",
    concrete: true,
    quotedFeeDem,
    withinBudget,
    budgetDem,
    reasonCodes: [...reasonCodes],
  };
}

export function classifyIPFSPayloadSafety(content: string | Uint8Array): IPFSPayloadSafety {
  if (content instanceof Uint8Array) return { ok: true, reasonCodes: [] };
  const lower = content.toLowerCase();
  const forbidden = [
    "mnemonic",
    "private key",
    "api_key",
    "apikey",
    "authorization:",
    "bearer ",
    "password",
    "secret=",
    "secret:",
    "token=",
  ];
  const hits = forbidden.filter((marker) => lower.includes(marker));
  return hits.length === 0
    ? { ok: true, reasonCodes: [] }
    : { ok: false, reasonCodes: hits.map((marker) => `payload_secret_marker:${marker.replace(/\W+/g, "_")}`) };
}

function extractDemFee(quote: unknown): number | null {
  if (typeof quote === "number" && Number.isFinite(quote) && quote >= 0) return quote;
  if (typeof quote === "string") return extractFeeFromString(quote);
  if (!quote || typeof quote !== "object") return null;

  for (const [key, value] of Object.entries(quote as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (isDemFeeKey(normalizedKey)) {
      const parsed = parseFeeValue(value);
      if (parsed !== null) return parsed;
    }
  }

  for (const value of Object.values(quote as Record<string, unknown>)) {
    const nested = extractDemFee(value);
    if (nested !== null) return nested;
  }
  return null;
}

function isDemFeeKey(key: string): boolean {
  return [
    "feedem",
    "costdem",
    "amountdem",
    "pricedem",
    "totaldem",
    "fee",
    "cost",
    "amount",
    "price",
    "total",
  ].includes(key.replace(/[_-]/g, ""));
}

function parseFeeValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") return extractFeeFromString(value);
  return null;
}

function extractFeeFromString(value: string): number | null {
  const demMatch = value.match(/(\d+(?:\.\d+)?)\s*DEM\b/i);
  if (!demMatch) return null;
  const parsed = Number(demMatch[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function stringifyQuote(quote: unknown): string {
  if (typeof quote === "string") return quote;
  try {
    return JSON.stringify(quote);
  } catch {
    return String(quote);
  }
}

function sanitizeIPFSText(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer REDACTED")
    .replace(/(authorization|api[_-]?key|token|secret|password)=([^&\s]+)/gi, "$1=REDACTED");
}
