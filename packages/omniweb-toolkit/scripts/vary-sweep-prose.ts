#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getStringArg, hasFlag } from "./_shared.js";

export interface SweepDraftInput {
  id?: string;
  draft_id?: string;
  source?: string | null;
  category?: string | null;
  text: string;
}

export interface SweepVariationConfig {
  duplicateNgramSize: number;
  requiredDistinctDimensions: number;
  fillerAdverbs: string[];
  stockOpeners: string[];
}

export interface SweepVariationProfile {
  anchorOrder: "measurement-first" | "interpretation-first" | "contradiction-first" | "unknown";
  framingLens: "technical" | "policy" | "market" | "comparative" | "narrative" | "horizon" | "unknown";
  numericMode: "absolute" | "relative" | "ratio" | "mixed" | "none";
  temporalFrame: "current" | "sequential" | "horizon" | "timeless";
  numericProminence: "single-value" | "grid" | "derived" | "none";
  structuralShape: "observation" | "analysis" | "prediction" | "question" | "other";
}

export interface SweepDraftAnalysis {
  draft_id: string;
  source: string | null;
  category: string | null;
  text: string;
  length: number;
  opener: string;
  fillerAdverbs: string[];
  stockOpener: boolean;
  shieldLookalike: boolean;
  profile: SweepVariationProfile;
}

export interface SweepPairRisk {
  left_id: string;
  right_id: string;
  source: string | null;
  sameSource: boolean;
  sharedNgrams: string[];
  distinctDimensions: string[];
  risk: "low" | "medium" | "high";
  reasons: string[];
}

export interface SweepVariationReport {
  generatedAt: string;
  config: SweepVariationConfig;
  drafts: SweepDraftAnalysis[];
  pairs: SweepPairRisk[];
  summary: {
    totalDrafts: number;
    highRiskPairs: number;
    mediumRiskPairs: number;
    fillerViolations: number;
    stockOpenerViolations: number;
  };
}

export const DEFAULT_SWEEP_VARIATION_CONFIG: SweepVariationConfig = {
  duplicateNgramSize: 5,
  requiredDistinctDimensions: 2,
  fillerAdverbs: ["notably", "importantly", "critically", "clearly", "indeed", "interestingly"],
  stockOpeners: [
    "blockchain.info still prints",
    "coingecko still shows",
    "cboe's delayed quote endpoint is still showing",
    "defillama shows",
    "the treasury average interest-rate table",
  ],
};

export function analyzeSweepProse(
  drafts: SweepDraftInput[],
  override?: Partial<SweepVariationConfig>,
): SweepVariationReport {
  const config = {
    ...DEFAULT_SWEEP_VARIATION_CONFIG,
    ...override,
    fillerAdverbs: override?.fillerAdverbs ?? DEFAULT_SWEEP_VARIATION_CONFIG.fillerAdverbs,
    stockOpeners: override?.stockOpeners ?? DEFAULT_SWEEP_VARIATION_CONFIG.stockOpeners,
  };

  const analyses = drafts.map((draft, index) => analyzeDraft(draft, index, config));
  const pairs: SweepPairRisk[] = [];

  for (let leftIndex = 0; leftIndex < analyses.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < analyses.length; rightIndex += 1) {
      pairs.push(compareDrafts(analyses[leftIndex], analyses[rightIndex], config));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    config,
    drafts: analyses,
    pairs,
    summary: {
      totalDrafts: analyses.length,
      highRiskPairs: pairs.filter((pair) => pair.risk === "high").length,
      mediumRiskPairs: pairs.filter((pair) => pair.risk === "medium").length,
      fillerViolations: analyses.filter((draft) => draft.fillerAdverbs.length > 0).length,
      stockOpenerViolations: analyses.filter((draft) => draft.stockOpener).length,
    },
  };
}

function analyzeDraft(
  draft: SweepDraftInput,
  index: number,
  config: SweepVariationConfig,
): SweepDraftAnalysis {
  const text = draft.text ?? "";
  const draftId = draft.draft_id ?? draft.id ?? `draft-${index + 1}`;
  const opener = extractOpener(text);
  const lower = normalize(text);

  return {
    draft_id: draftId,
    source: draft.source ?? null,
    category: draft.category ?? null,
    text,
    length: text.trim().length,
    opener,
    fillerAdverbs: config.fillerAdverbs.filter((word) => hasWord(lower, word)),
    stockOpener: config.stockOpeners.some((stock) => normalize(opener).includes(normalize(stock))),
    shieldLookalike: lower.includes("shield alert"),
    profile: {
      anchorOrder: classifyAnchorOrder(text),
      framingLens: classifyFramingLens(text),
      numericMode: classifyNumericMode(text),
      temporalFrame: classifyTemporalFrame(text),
      numericProminence: classifyNumericProminence(text),
      structuralShape: classifyStructuralShape(draft.category, text),
    },
  };
}

function compareDrafts(
  left: SweepDraftAnalysis,
  right: SweepDraftAnalysis,
  config: SweepVariationConfig,
): SweepPairRisk {
  const sameSource = normalize(left.source) !== "" && normalize(left.source) === normalize(right.source);
  const sharedNgrams = sharedNgramsFor(left, right, config.duplicateNgramSize);
  const distinctDimensions = differingDimensions(left.profile, right.profile);
  const reasons: string[] = [];
  let risk: SweepPairRisk["risk"] = "low";

  if (sharedNgrams.length > 0) {
    risk = "high";
    reasons.push(`shared_${config.duplicateNgramSize}gram_overlap`);
  }

  if (sameSource && distinctDimensions.length < config.requiredDistinctDimensions) {
    risk = risk === "high" ? "high" : "medium";
    reasons.push("same_source_insufficient_structural_variation");
  }

  if (normalize(left.opener) === normalize(right.opener)) {
    risk = risk === "high" ? "high" : "medium";
    reasons.push("reused_opener");
  }

  if (left.shieldLookalike || right.shieldLookalike) {
    risk = "high";
    reasons.push("shield_lookalike");
  }

  return {
    left_id: left.draft_id,
    right_id: right.draft_id,
    source: sameSource ? left.source : null,
    sameSource,
    sharedNgrams,
    distinctDimensions,
    risk,
    reasons,
  };
}

function differingDimensions(left: SweepVariationProfile, right: SweepVariationProfile): string[] {
  const names: Array<keyof SweepVariationProfile> = [
    "anchorOrder",
    "framingLens",
    "numericMode",
    "temporalFrame",
    "numericProminence",
    "structuralShape",
  ];
  return names.filter((name) => left[name] !== right[name]);
}

function sharedNgramsFor(
  left: SweepDraftAnalysis,
  right: SweepDraftAnalysis,
  size: number,
): string[] {
  const leftNgrams = ngrams(left.text, size);
  const rightNgrams = ngrams(right.text, size);
  const overlap = Array.from(leftNgrams).filter((gram) => rightNgrams.has(gram));
  return overlap.slice(0, 5);
}

function classifyAnchorOrder(text: string): SweepVariationProfile["anchorOrder"] {
  const opener = extractOpener(text).toLowerCase();
  if (/\bcontradicts?\b|\bdespite\b|\bargues against\b/.test(opener)) return "contradiction-first";
  if (/\bmeans\b|\bkeeps\b|\bshows\b/.test(opener) && !/\d/.test(opener.slice(0, 20))) return "interpretation-first";
  if (/\d/.test(opener) || /\$\d/.test(opener)) return "measurement-first";
  return "unknown";
}

function classifyFramingLens(text: string): SweepVariationProfile["framingLens"] {
  const lower = normalize(text);
  if (/\bnext\b|\bwithin\b|\bfrom publication\b|\bdeadline\b/.test(lower)) return "horizon";
  if (/\bversus\b|\bvs\b|\bbelow\b|\babove\b|\bcompared with\b/.test(lower)) return "comparative";
  if (/\bfed\b|\btreasury\b|\bpolicy\b|\bfunding\b/.test(lower)) return "policy";
  if (/\brisk\b|\bmarket\b|\bvolatility\b|\bpricing\b/.test(lower)) return "market";
  if (/\bdelta\b|\bspread\b|\brange\b|\bquote\b/.test(lower)) return "technical";
  if (/\bthrough\b|\bafter\b|\bwhile\b|\bwith\b/.test(lower)) return "narrative";
  return "unknown";
}

function classifyNumericMode(text: string): SweepVariationProfile["numericMode"] {
  const lower = normalize(text);
  const hasAbsolute = /\$\s?\d|\b\d[\d,.]*(?:\.\d+)?(?:\s?(?:%|k|m|b|t|bp|bps|percent|usd|btc|eth|sol|million|billion|trillion))?\b/i.test(text);
  const hasRelative = /\bfrom\b.+\bto\b|\bup\b|\bdown\b|\brose\b|\bfell\b|\bchanged\b/.test(lower);
  const hasRatio = /\bwhile\b|\bversus\b|\bvs\b|\bspread\b|\brelative to\b/.test(lower);
  const count = [hasAbsolute, hasRelative, hasRatio].filter(Boolean).length;
  if (count > 1) return "mixed";
  if (hasRatio) return "ratio";
  if (hasRelative) return "relative";
  if (hasAbsolute) return "absolute";
  return "none";
}

function classifyTemporalFrame(text: string): SweepVariationProfile["temporalFrame"] {
  const lower = normalize(text);
  if (/\bright now\b|\btoday\b|\blatest\b/.test(lower)) return "current";
  if (/\bover\b|\bfrom\b.+\bto\b|\bprints\b|\bwindow\b/.test(lower)) return "sequential";
  if (/\bwithin\b|\bnext\b|\bminutes?\b|\bhours?\b|\bdeadline\b/.test(lower)) return "horizon";
  return "timeless";
}

function classifyNumericProminence(text: string): SweepVariationProfile["numericProminence"] {
  const lower = normalize(text);
  const numberMatches = Array.from(text.matchAll(/\b\d+(?:\.\d+)?(?:%|k|m|b|t)?\b/gi)).length;
  if (/\bbuy\b.*\bsell\b|\blast\b.*\bbuy\b/.test(lower)) return "grid";
  if (/\bspread\b|\bdelta\b|\bcushion\b|\bbelow\b|\babove\b/.test(lower)) return "derived";
  if (numberMatches >= 1) return "single-value";
  return "none";
}

function classifyStructuralShape(
  category: string | null | undefined,
  text: string,
): SweepVariationProfile["structuralShape"] {
  const upper = (category ?? "").toUpperCase();
  if (upper === "PREDICTION" || /\bprediction\b|\binvalid if\b|\bconfidence\b/.test(normalize(text))) return "prediction";
  if (upper === "QUESTION" || text.trim().endsWith("?")) return "question";
  if (upper === "OBSERVATION") return "observation";
  if (upper === "ANALYSIS" || /\bwhich means\b|\bargues against\b|\bcontradicts\b/.test(normalize(text))) return "analysis";
  return "other";
}

function extractOpener(text: string): string {
  const trimmed = text.trim();
  const protectedText = protectAbbreviationDots(trimmed);
  const opener = (
    protectedText.split(/(?<=[.!?])\s+(?=(?:["'(<[]?[A-Z]|$))/)[0] ?? protectedText
  ).slice(0, 120).trim();
  return restoreAbbreviationDots(opener);
}

function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9%$.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function protectAbbreviationDots(text: string): string {
  return text.replace(/\b(?:[A-Z]\.){2,}/g, (match) => match.replaceAll(".", "<DOT>"));
}

function restoreAbbreviationDots(text: string): string {
  return text.replaceAll("<DOT>", ".");
}

function hasWord(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function ngrams(text: string, size: number): Set<string> {
  const tokens = normalize(text).split(/\s+/).filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help", "-h")) {
    console.log(`Usage: npx tsx scripts/vary-sweep-prose.ts --in PATH [--out PATH]

Analyze sweep drafts for duplicate-risk and structural variation.

Options:
  --in PATH    Input JSON array of draft objects
  --out PATH   Also write the JSON report to PATH
  --help, -h   Show this help
`);
    process.exit(0);
  }

  const inputPath = getStringArg(args, "--in");
  const outPath = getStringArg(args, "--out");
  if (!inputPath) {
    console.error("Error: --in PATH is required");
    process.exit(2);
  }

  const drafts = JSON.parse(readFileSync(resolve(inputPath), "utf8")) as SweepDraftInput[];
  if (!Array.isArray(drafts)) {
    throw new Error("Input must be a JSON array");
  }

  const report = analyzeSweepProse(drafts);
  const body = JSON.stringify(report, null, 2);

  if (outPath) {
    const resolved = resolve(outPath);
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${body}\n`, "utf8");
  }

  console.log(body);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
