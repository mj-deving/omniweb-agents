#!/usr/bin/env npx tsx
/**
 * check-trajectories.ts — Validate the maintained trajectory spec for shape, references, and scoring consistency.
 *
 * Output: JSON report to stdout.
 * Exit codes: 0 = pass, 1 = failures, 2 = invalid args.
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

type JsonRecord = Record<string, unknown>;
type Check = {
  name: string;
  ok: boolean;
  detail: unknown;
};

const packageRoot = resolve(import.meta.dirname, "..");
const trajectoriesPath = resolve(packageRoot, "evals", "trajectories.yaml");
const text = readFileSync(trajectoriesPath, "utf8");
const parsed = parse(text) as JsonRecord;
const scenarios = Array.isArray(parsed.scenarios) ? parsed.scenarios as JsonRecord[] : [];
const scenarioIds = scenarios
  .map((scenario) => scenario.id)
  .filter((value): value is string => typeof value === "string");

const duplicatedScenarioIds = Array.from(new Set(
  scenarioIds.filter((id, index) => scenarioIds.indexOf(id) !== index),
));

const fileReferences = Array.from(new Set(
  [...text.matchAll(/\b[\w./-]+\.(?:md|ya?ml|json|ts|sh)\b/g)]
    .map((match) => match[0])
    .filter((token) => !token.startsWith("http")),
)).sort();

const missingFileReferences = fileReferences.filter((reference) => !existsRelative(packageRoot, reference));

const methodTokens = [
  "connect",
  "getFeed",
  "search",
  "getSignals",
  "getOracle",
  "getPrices",
  "getLeaderboard",
  "getAgents",
  "getBalance",
  "publish",
  "reply",
  "attest",
  "react",
  "tip",
  "placeBet",
  "placeHL",
  "register",
  "getMarkets",
  "getPredictions",
  "getForecastScore",
  "omni.colony.publish",
  "omni.colony.reply",
  "omni.colony.tip",
  "omni.colony.react",
  "omni.colony.placeHL",
  "omni.chain.transfer",
  "omni.escrow.sendToIdentity",
];

const methodReferences = methodTokens.filter((token) => text.includes(token));
const scenarioScoringSums = scenarios.map((scenario) => ({
  id: typeof scenario.id === "string" ? scenario.id : "<invalid>",
  sum: sumNumericRecord(scenario.scoring),
}));

const checks: Check[] = [
  {
    name: "document_description",
    ok: typeof parsed.description === "string" && parsed.description.length > 0,
    detail: "trajectories.yaml should declare a top-level description",
  },
  {
    name: "scenarios_exist",
    ok: scenarios.length > 0,
    detail: `found ${scenarios.length} scenarios`,
  },
  {
    name: "scenario_ids_unique_and_valid",
    ok: duplicatedScenarioIds.length === 0 &&
      scenarios.every((scenario) => typeof scenario.id === "string" && /^[a-z0-9-]+$/.test(scenario.id)),
    detail: duplicatedScenarioIds.length > 0 ? duplicatedScenarioIds : "scenario ids should be kebab-case and unique",
  },
  {
    name: "scenario_shapes",
    ok: scenarios.every((scenario) =>
      typeof scenario.description === "string" &&
      Array.isArray(scenario.steps) &&
      scenario.steps.length > 0 &&
      isRecord(scenario.scoring),
    ),
    detail: "each scenario should have description, non-empty steps, and scoring",
  },
  {
    name: "step_shapes",
    ok: scenarios.every((scenario) =>
      Array.isArray(scenario.steps) &&
      scenario.steps.every((step) =>
        isRecord(step) &&
        typeof step.action === "string" &&
        Array.isArray(step.assert) &&
        step.assert.length > 0 &&
        step.assert.every((entry) => typeof entry === "string" && entry.length > 0),
      ),
    ),
    detail: "each step should have an action and at least one string assertion",
  },
  {
    name: "scenario_scoring_sums_to_100",
    ok: scenarioScoringSums.every((entry) => entry.sum === 100),
    detail: scenarioScoringSums,
  },
  {
    name: "global_weight_sums_to_100",
    ok: sumNumericRecord(isRecord(parsed.scoring) ? parsed.scoring.weights : undefined) === 100,
    detail: isRecord(parsed.scoring) ? parsed.scoring.weights : undefined,
  },
  {
    name: "thresholds_descend",
    ok: hasDescendingThresholds(parsed.scoring),
    detail: isRecord(parsed.scoring) ? parsed.scoring.thresholds : undefined,
  },
  {
    name: "references_existing_files",
    ok: missingFileReferences.length === 0,
    detail: missingFileReferences,
  },
  {
    name: "references_known_api_surface",
    ok: methodReferences.length > 0,
    detail: methodReferences,
  },
  {
    name: "risk_mix_present",
    ok: scenarioIds.some((id) => id.startsWith("redteam-")) &&
      scenarioIds.some((id) => id.startsWith("edge-")) &&
      scenarioIds.some((id) => id.includes("guardrail") || id.includes("publish") || id.includes("tip")),
    detail: scenarioIds,
  },
];

const ok = checks.every((check) => check.ok);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  packageRoot,
  trajectoriesPath,
  ok,
  counts: {
    scenarios: scenarios.length,
    fileReferences: fileReferences.length,
    methodReferences: methodReferences.length,
  },
  checks,
}, null, 2));

process.exit(ok ? 0 : 1);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sumNumericRecord(value: unknown): number {
  if (!isRecord(value)) {
    return Number.NaN;
  }

  return Object.values(value).reduce((sum, entry) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return Number.NaN;
    }
    return sum + entry;
  }, 0);
}

function hasDescendingThresholds(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.thresholds)) {
    return false;
  }

  const pass = value.thresholds.pass;
  const warn = value.thresholds.warn;
  const fail = value.thresholds.fail;

  return [pass, warn, fail].every((entry) => typeof entry === "number" && Number.isFinite(entry)) &&
    (pass as number) >= (warn as number) &&
    (warn as number) >= (fail as number);
}

function existsRelative(root: string, relativePath: string): boolean {
  try {
    return statSync(resolve(root, relativePath)).isFile();
  } catch {
    return false;
  }
}
