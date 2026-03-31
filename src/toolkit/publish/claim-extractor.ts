import { inferAssetAlias } from "../chain/asset-helpers.js";
import { escapeRegExp } from "../util/strings.js";
import {
  ClaimExtractionResultSchema,
  type ClaimExtractionResult,
  type ClaimExtractionLlm,
  type ClaimIdentity,
  type StructuredClaim,
} from "./types.js";
import { KNOWN_SUBJECT_ALIASES } from "./subject-aliases.js";

const CONTEXT_WINDOW_SMALL = 40;
const CONTEXT_WINDOW_LARGE = 80;

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
  t: 1_000_000_000_000,
};

const CLAIM_PATTERNS: Array<{
  regex: RegExp;
  parseValue: (match: RegExpMatchArray) => number | null;
  parseUnit: (match: RegExpMatchArray) => string;
  inferMetric: (match: RegExpMatchArray, text: string, index: number) => string;
}> = [
  {
    regex: /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*([KMBTkmbt])?\b/g,
    parseValue: (match) => {
      const base = parseFloat(match[1].replace(/,/g, ""));
      if (Number.isNaN(base)) return null;
      const suffix = match[2]?.toLowerCase();
      return suffix ? base * MULTIPLIERS[suffix] : base;
    },
    parseUnit: () => "USD",
    inferMetric: (_match, text, index) => inferMetricFromContext("USD", text, index),
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*%/g,
    parseValue: (match) => {
      const value = parseFloat(match[1]);
      return Number.isNaN(value) ? null : value;
    },
    parseUnit: () => "%",
    inferMetric: (_match, text, index) => inferMetricFromContext("%", text, index),
  },
  {
    regex: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(EH\/s|TH\/s|GH\/s|gwei|TVL|blocks|USD|BTC|ETH)\b/gi,
    parseValue: (match) => {
      const value = parseFloat(match[1].replace(/,/g, ""));
      return Number.isNaN(value) ? null : value;
    },
    parseUnit: (match) => normalizeUnit(match[2]),
    inferMetric: (match, text, index) => inferMetricFromContext(normalizeUnit(match[2]), text, index),
  },
];

export interface ClaimExtractorOptions {
  llmTier?: ClaimExtractionLlm;
}

export function extractClaimsRegex(
  draftText: string,
  _options: ClaimExtractorOptions = {},
): ClaimExtractionResult {
  const claims: StructuredClaim[] = [];
  const seen = new Set<string>();

  for (const pattern of CLAIM_PATTERNS) {
    pattern.regex.lastIndex = 0;
    for (const match of draftText.matchAll(pattern.regex)) {
      const value = pattern.parseValue(match);
      if (value === null || match.index === undefined) continue;

      const unit = pattern.parseUnit(match);
      const metric = pattern.inferMetric(match, draftText, match.index);
      const subjectMatch = inferSubject(draftText, match.index);
      const subject = subjectMatch?.subject ?? "market";
      const chain = subjectMatch?.chain ?? inferChainForMetric(metric);
      const sourceField = inferSourceField(metric);

      const claim: StructuredClaim = {
        identity: buildIdentity(subject, chain, metric),
        subject,
        value,
        unit,
        direction: inferDirection(draftText, match.index),
        dataTimestamp: null,
        sourceField,
        type: "factual",
      };

      const key = `${claim.subject}|${claim.identity.metric}|${claim.value}|${claim.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push(claim);
    }
  }

  const result: ClaimExtractionResult = {
    claims,
    needsLlmTier: claims.length === 0,
    regexClaimCount: claims.length,
  };

  return ClaimExtractionResultSchema.parse(result);
}

function buildIdentity(subject: string, chain: string, metric: string): ClaimIdentity {
  return {
    chain,
    address: null,
    market: null,
    entityId: null,
    metric,
  };
}

const UNIT_TO_METRIC: Record<string, string> = {
  "EH/s": "hash_rate",
  "TH/s": "hash_rate",
  "GH/s": "hash_rate",
  gwei: "gas_price",
  blocks: "block_count",
  BTC: "totalSupply",
  ETH: "totalSupply",
  "%": "percentage",
};

const CONTEXT_KEYWORD_TO_METRIC: [string, string][] = [
  ["tvl", "tvl"],
  ["volume", "volume"],
  ["supply", "totalSupply"],
  ["transactions", "tx_count"],
  ["tx count", "tx_count"],
];

function inferMetricFromContext(unit: string, text: string, index: number): string {
  const context = text.slice(Math.max(0, index - CONTEXT_WINDOW_SMALL), Math.min(text.length, index + CONTEXT_WINDOW_SMALL)).toLowerCase();
  const normalizedUnit = normalizeUnit(unit);

  const unitMetric = UNIT_TO_METRIC[normalizedUnit];
  if (unitMetric) return unitMetric;

  for (const [keyword, metric] of CONTEXT_KEYWORD_TO_METRIC) {
    if (context.includes(keyword)) return metric;
  }

  return normalizedUnit === "USD" ? "price_usd" : "metric";
}

function inferSourceField(metric: string): string {
  const fieldMap: Record<string, string> = {
    hash_rate: "hash_rate",
    gas_price: "gwei",
    tvl: "tvl",
    volume: "volume",
    totalSupply: "totalSupply",
    block_count: "blocks",
    tx_count: "tx_count",
    price_usd: "price_usd",
    percentage: "percentage",
  };
  return fieldMap[metric] ?? metric;
}

function inferDirection(text: string, index: number): StructuredClaim["direction"] {
  const context = text.slice(Math.max(0, index - CONTEXT_WINDOW_SMALL), Math.min(text.length, index + CONTEXT_WINDOW_SMALL)).toLowerCase();
  if (/\b(up|rose|surged|gained|higher|bullish)\b/.test(context)) return "up";
  if (/\b(down|fell|dropped|lower|bearish)\b/.test(context)) return "down";
  if (/\b(flat|stable|unchanged)\b/.test(context)) return "stable";
  return null;
}

function inferSubject(text: string, index: number): { subject: string; chain: string } | null {
  const start = Math.max(0, index - CONTEXT_WINDOW_LARGE);
  const end = Math.min(text.length, index + CONTEXT_WINDOW_LARGE);
  const context = text.slice(start, end);
  const normalizedContext = context.toLowerCase();

  const matches: Array<{ subject: string; chain: string; distance: number; before: boolean }> = [];
  for (const entry of KNOWN_SUBJECT_ALIASES) {
    for (const alias of entry.aliases) {
      const rx = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "ig");
      let match: RegExpExecArray | null;
      while ((match = rx.exec(context)) !== null) {
        const absoluteIndex = start + match.index;
        matches.push({
          subject: entry.subject,
          chain: entry.chain,
          distance: Math.abs(absoluteIndex - index),
          before: absoluteIndex <= index,
        });
      }
    }
  }
  const orderedMatches = matches.sort((left, right) => {
    if (left.before !== right.before) return left.before ? -1 : 1;
    return left.distance - right.distance;
  });
  if (orderedMatches[0]) {
    return { subject: orderedMatches[0].subject, chain: orderedMatches[0].chain };
  }

  const inferredAsset = inferAssetAlias(normalizedContext);
  if (inferredAsset) {
    if (inferredAsset.asset === "bitcoin") return { subject: inferredAsset.asset, chain: "btc:mainnet" };
    if (inferredAsset.asset === "ethereum") return { subject: inferredAsset.asset, chain: "eth:1" };
    if (inferredAsset.asset === "solana") return { subject: inferredAsset.asset, chain: "sol:mainnet" };
    return { subject: inferredAsset.asset, chain: "web2" };
  }

  return null;
}

const METRIC_TO_CHAIN: Record<string, string> = {
  hash_rate: "btc:mainnet",
  block_count: "btc:mainnet",
  tx_count: "btc:mainnet",
  gas_price: "eth:1",
};

function inferChainForMetric(metric: string): string {
  return METRIC_TO_CHAIN[metric] ?? "web2";
}

function normalizeUnit(unit: string): string {
  const normalized = unit.toUpperCase();
  if (normalized === "GWEI") return "gwei";
  if (normalized === "BLOCKS") return "blocks";
  if (normalized === "TVL") return "TVL";
  if (normalized === "USD" || normalized === "BTC" || normalized === "ETH") return normalized;
  if (normalized === "EH/S" || normalized === "TH/S" || normalized === "GH/S") {
    return `${normalized.slice(0, 2)}/s`;
  }
  return unit;
}

