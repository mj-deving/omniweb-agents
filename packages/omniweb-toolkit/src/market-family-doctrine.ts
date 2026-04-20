import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type {
  TopicClaimRequirement,
  TopicMetricSemantic,
} from "./topic-family-contract.js";
import type { MarketTopicFamily } from "./market-family-contracts.js";

export interface MarketFamilyDoctrine {
  family: MarketTopicFamily;
  baseline: string[];
  focus: string[];
  blocked: string[];
  requiresExtra: TopicClaimRequirement[];
  metricSemantics: Record<string, TopicMetricSemantic>;
}

interface MarketFamilyDoctrineFile {
  family: MarketTopicFamily;
  baseline: string[];
  focus: string[];
  blocked: string[];
  requiresExtra: TopicClaimRequirement[];
  metrics: Record<string, TopicMetricSemantic>;
}

const ORACLE_DIVERGENCE_FAMILY: MarketTopicFamily = "oracle-divergence";

let cachedOracleDivergenceDoctrine: MarketFamilyDoctrine | null = null;

export function loadOracleDivergenceDoctrine(explicitDir?: string): MarketFamilyDoctrine {
  if (explicitDir == null && cachedOracleDivergenceDoctrine != null) {
    return cachedOracleDivergenceDoctrine;
  }

  const doctrineDir = resolveDoctrineDir(explicitDir);
  const path = `${doctrineDir}/${ORACLE_DIVERGENCE_FAMILY}.yaml`;
  if (!existsSync(path)) {
    throw new Error(`missing_market_family_doctrine:${ORACLE_DIVERGENCE_FAMILY}`);
  }

  const parsed = parseYaml(readFileSync(path, "utf8")) as unknown;
  const doctrine = toMarketFamilyDoctrine(parsed, ORACLE_DIVERGENCE_FAMILY);

  if (explicitDir == null) {
    cachedOracleDivergenceDoctrine = doctrine;
  }

  return doctrine;
}

function resolveDoctrineDir(explicitDir?: string): string {
  const candidates = [
    explicitDir,
    process.env.OMNIWEB_DOCTRINE_DIR,
    fileURLToPath(new URL("../config/doctrine", import.meta.url)),
  ].filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("missing_market_family_doctrine_dir");
}

function toMarketFamilyDoctrine(
  value: unknown,
  expectedFamily: MarketTopicFamily,
): MarketFamilyDoctrine {
  const parsed = value as Partial<MarketFamilyDoctrineFile> | null;

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`invalid_market_family_doctrine:${expectedFamily}`);
  }

  if (parsed.family !== expectedFamily) {
    throw new Error(`mismatched_market_family_doctrine:${expectedFamily}`);
  }

  return {
    family: expectedFamily,
    baseline: readStringArray(parsed.baseline, `${expectedFamily}.baseline`),
    focus: readStringArray(parsed.focus, `${expectedFamily}.focus`),
    blocked: readStringArray(parsed.blocked, `${expectedFamily}.blocked`),
    requiresExtra: readClaimRequirements(parsed.requiresExtra, `${expectedFamily}.requiresExtra`),
    metricSemantics: readMetricSemantics(parsed.metrics, `${expectedFamily}.metrics`),
  };
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`invalid_market_family_doctrine_field:${field}`);
  }

  return value;
}

function readClaimRequirements(value: unknown, field: string): TopicClaimRequirement[] {
  if (!Array.isArray(value)) {
    throw new Error(`invalid_market_family_doctrine_field:${field}`);
  }

  return value.map((entry, index) => {
    const parsed = entry as Partial<TopicClaimRequirement> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.claim !== "string" ||
      parsed.claim.length === 0 ||
      !Array.isArray(parsed.requiredMetrics) ||
      parsed.requiredMetrics.some((metric) => typeof metric !== "string" || metric.length === 0) ||
      typeof parsed.reason !== "string" ||
      parsed.reason.length === 0
    ) {
      throw new Error(`invalid_market_family_doctrine_field:${field}[${index}]`);
    }

    return {
      claim: parsed.claim,
      requiredMetrics: parsed.requiredMetrics,
      reason: parsed.reason,
    };
  });
}

function readMetricSemantics(
  value: unknown,
  field: string,
): Record<string, TopicMetricSemantic> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_market_family_doctrine_field:${field}`);
  }

  const semantics = Object.create(null) as Record<string, TopicMetricSemantic>;
  for (const [metric, entry] of Object.entries(value)) {
    const parsed = entry as Partial<TopicMetricSemantic> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.means !== "string" ||
      parsed.means.length === 0 ||
      typeof parsed.doesNotMean !== "string" ||
      parsed.doesNotMean.length === 0 ||
      (parsed.comment != null && typeof parsed.comment !== "string")
    ) {
      throw new Error(`invalid_market_family_doctrine_field:${field}.${metric}`);
    }

    semantics[metric] = {
      means: parsed.means,
      doesNotMean: parsed.doesNotMean,
      ...(parsed.comment != null ? { comment: parsed.comment } : {}),
    };
  }

  return semantics;
}

export function clearMarketFamilyDoctrineCacheForTests(): void {
  cachedOracleDivergenceDoctrine = null;
}
