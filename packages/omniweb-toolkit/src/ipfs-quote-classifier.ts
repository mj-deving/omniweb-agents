export type IPFSQuoteClassification =
  | "concrete"
  | "unsupported-runtime"
  | "runtime-error"
  | "degraded-runtime"
  | "unclassified";

export interface IPFSQuoteSupport {
  classification: IPFSQuoteClassification;
  concrete: boolean;
  quotedFeeDem: number | null;
  withinBudget: boolean | null;
  budgetDem: number | null;
  reasonCodes: string[];
  evidence: string[];
  quotePath?: string;
  quoteMessage?: string;
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
  quotePath?: string;
  quoteMessage?: string;
  quoteArgs?: Record<string, unknown>;
}): IPFSQuoteSupport {
  const budgetDem = Number.isFinite(input.budgetDem ?? NaN) ? Number(input.budgetDem) : null;
  const reasonCodes = new Set<string>();
  const evidence = buildQuoteEvidence(input);
  const quotePath = input.quotePath;
  const quoteMessage = input.quoteMessage;

  if (input.quoteError) {
    const sanitizedError = sanitizeIPFSText(input.quoteError);
    if (isUnknownMessage(sanitizedError)) {
      reasonCodes.add("ipfs_quote_unknown_message");
      return {
        classification: "unsupported-runtime",
        concrete: false,
        quotedFeeDem: null,
        withinBudget: null,
        budgetDem,
        reasonCodes: [...reasonCodes],
        evidence: [...evidence, `quote_error=${sanitizedError}`],
        quotePath,
        quoteMessage,
        sanitizedError,
      };
    }

    reasonCodes.add("ipfs_quote_runtime_error");
    return {
      classification: "runtime-error",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
      evidence: [...evidence, `quote_error=${sanitizedError}`],
      quotePath,
      quoteMessage,
      sanitizedError,
    };
  }

  const quoteText = stringifyQuote(input.quote).toLowerCase();
  if (isUnknownMessage(quoteText)) {
    reasonCodes.add("ipfs_quote_unknown_message");
    return {
      classification: "unsupported-runtime",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
      evidence: [...evidence, `quote_response=${truncateEvidence(quoteText)}`],
      quotePath,
      quoteMessage,
    };
  }

  const quotedFeeDem = extractDemFee(input.quote);
  if (quotedFeeDem === null) {
    reasonCodes.add("ipfs_quote_fee_missing");
    return {
      classification: input.quote === null || input.quote === undefined ? "unclassified" : "degraded-runtime",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      budgetDem,
      reasonCodes: [...reasonCodes],
      evidence: [...evidence, `quote_response=${truncateEvidence(stringifyQuote(input.quote))}`],
      quotePath,
      quoteMessage,
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
    evidence: [...evidence, `quoted_fee_dem=${quotedFeeDem}`],
    quotePath,
    quoteMessage,
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
  if (typeof value === "string") return extractFeeFromString(value) ?? extractPlainNumericFee(value);
  return null;
}

function extractFeeFromString(value: string): number | null {
  const demMatch = value.match(/(\d+(?:\.\d+)?)\s*DEM\b/i);
  if (!demMatch) return null;
  const parsed = Number(demMatch[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function extractPlainNumericFee(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
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

function isUnknownMessage(text: string): boolean {
  return text.toLowerCase().includes("unknown message");
}

function buildQuoteEvidence(input: {
  quotePath?: string;
  quoteMessage?: string;
  quoteArgs?: Record<string, unknown>;
}): string[] {
  const evidence: string[] = [];
  if (input.quotePath) evidence.push(`quote_path=${input.quotePath}`);
  if (input.quoteMessage) evidence.push(`node_call=${input.quoteMessage}`);
  if (input.quoteArgs) evidence.push(`quote_args=${truncateEvidence(stringifyQuote(input.quoteArgs))}`);
  return evidence;
}

function truncateEvidence(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}
