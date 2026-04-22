#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getStringArg, hasFlag, loadPackageExport } from "./_shared.ts";
import {
  parsePredictionExpectedValue,
  type PredictionCheckOperator,
  type PredictionCheckSpec,
  type PredictionCheckValueType,
} from "./_prediction-check.ts";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-prediction.ts [options]

Options:
  --text TEXT                  Required prediction post body
  --attest-url URL             Required primary attestation URL used for publish()
  --deadline-at ISO            Required verification deadline timestamp
  --confidence N               Required confidence percentage (0-100)
  --falsifier TEXT             Required falsifier / invalidation condition
  --verify-url URL             Required JSON endpoint checked at the deadline
  --verify-json-path PATH      Required JSON path to the observed metric
  --verify-operator OP         Required operator: lt|lte|gt|gte|eq|neq|contains
  --verify-value VALUE         Required expected comparator value
  --verify-value-type TYPE     number|string|boolean (default: number)
  --verify-label TEXT          Optional human label for the observed metric
  --source-name TEXT           Optional source label for audit output
  --state-dir PATH             Forwarded to connect()/state persistence
  --allow-insecure             Forwarded to connect() for local debugging only
  --record-pending-verdict     Queue an async follow-up using the prediction deadline
  --pending-verdict-queue P    Override the pending verdict queue path
  --verify-timeout-ms N        Visibility verification timeout (default: 45000)
  --verify-poll-ms N           Visibility poll interval (default: 5000)
  --verify-limit N             Feed limit for visibility checks (default: 50)
  --dry-run                    Build the cycle record without spending DEM
  --out PATH                   Write the JSON report to a file as well as stdout
  --help, -h                   Show this help
`);
  process.exit(0);
}

const text = getRequiredArg("--text");
const attestUrl = getRequiredArg("--attest-url");
const deadlineAt = getRequiredArg("--deadline-at");
const confidence = getRequiredNumber("--confidence", 0, 100);
const falsifier = getRequiredArg("--falsifier");
const verifyUrl = getRequiredArg("--verify-url");
const verifyJsonPath = getRequiredArg("--verify-json-path");
const verifyOperator = getRequiredOperator("--verify-operator");
const verifyValueType = (getStringArg(args, "--verify-value-type") ?? "number") as PredictionCheckValueType;
const verifyValue = parsePredictionExpectedValue(getRequiredArg("--verify-value"), verifyValueType);
const verifyLabel = getStringArg(args, "--verify-label") ?? null;
const sourceName = getStringArg(args, "--source-name") ?? null;
const stateDir = getStringArg(args, "--state-dir");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const recordPendingVerdict = hasFlag(args, "--record-pending-verdict");
const pendingVerdictQueuePath = getStringArg(args, "--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);
const dryRun = hasFlag(args, "--dry-run");
const outputPath = getStringArg(args, "--out");

const buildMinimalAttestationPlanFromUrls = await loadPackageExport<
  (opts: {
    topic: string;
    agent: string;
    urls: string[];
  }) => unknown
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildMinimalAttestationPlanFromUrls",
);

const runMinimalAgentCycle = await loadPackageExport<
  (observe: () => Promise<{
    kind: "publish";
    category: string;
    text: string;
    attestUrl: string;
    confidence: number;
    attestationPlan: unknown;
    facts: Record<string, unknown>;
    audit: {
      promptPacket: Record<string, unknown>;
    };
  }>, opts: {
    stateDir?: string;
    dryRun?: boolean;
    connectOptions?: {
      stateDir?: string;
      allowInsecureUrls?: boolean;
    };
    verification?: {
      timeoutMs: number;
      pollMs: number;
      limit: number;
    };
  }) => Promise<any>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "runMinimalAgentCycle",
);

if (!Number.isFinite(Date.parse(deadlineAt))) {
  throw new Error(`Invalid --deadline-at value: ${deadlineAt}`);
}

const predictionCheck: PredictionCheckSpec = {
  version: 1,
  sourceUrl: verifyUrl,
  sourceName,
  jsonPath: verifyJsonPath,
  operator: verifyOperator,
  expected: verifyValue,
  expectedType: verifyValueType,
  observedLabel: verifyLabel,
  deadlineAt,
  confidence,
  falsifier,
};

const attestationPlan = buildMinimalAttestationPlanFromUrls({
  topic: "supervised-prediction",
  agent: "prediction-check",
  urls: [attestUrl],
});

const record = await runMinimalAgentCycle(
  async () => ({
    kind: "publish",
    category: "PREDICTION",
    text,
    attestUrl,
    confidence,
    attestationPlan,
    facts: {
      predictionCheck,
      predictionDeadlineAt: deadlineAt,
      predictionFalsifier: falsifier,
    },
    audit: {
      promptPacket: {
        objective: "Publish one supervised non-market prediction with explicit deadline, confidence, falsifier, and later self-verification metadata.",
        deadlineAt,
        confidence,
        falsifier,
        predictionCheck,
      },
    },
  }),
  {
    stateDir,
    dryRun,
    connectOptions: {
      stateDir,
      allowInsecureUrls,
    },
    verification: {
      timeoutMs: verifyTimeoutMs,
      pollMs: verifyPollMs,
      limit: verifyLimit,
    },
  },
);

let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && record.outcome.status === "published" && record.outcome.txHash) {
  const queued = await enqueuePendingVerdict(buildPendingVerdictEntry({
    txHash: record.outcome.txHash,
    category: "PREDICTION",
    text,
    startedAt: record.startedAt,
    sourceRunPath: null,
    stateDir: record.stateDir,
    checkAfterMs: Math.max(0, Date.parse(deadlineAt) - Date.parse(record.startedAt)),
    predictionCheck,
  }), pendingVerdictQueuePath);

  pendingVerdict = {
    id: queued.entry.id,
    queuePath: pendingVerdictQueuePath,
    checkAt: queued.entry.checkAt,
    inserted: queued.inserted,
  };
}

const report = {
  ok: record.outcome.status === "published" || record.outcome.status === "dry_run",
  checkedAt: new Date().toISOString(),
  verdictSchedule: scheduleSupervisedVerdict("PREDICTION", record.startedAt),
  predictionCheck,
  pendingVerdict,
  record,
};

if (outputPath) {
  const resolvedPath = resolve(outputPath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

function getRequiredArg(flag: string): string {
  const value = getStringArg(args, flag);
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

function getRequiredNumber(flag: string, min: number, max: number): number {
  const raw = getRequiredArg(flag);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getRequiredOperator(flag: string): PredictionCheckOperator {
  const operator = getRequiredArg(flag) as PredictionCheckOperator;
  if (!["lt", "lte", "gt", "gte", "eq", "neq", "contains"].includes(operator)) {
    throw new Error(`Invalid ${flag} value: ${operator}`);
  }
  return operator;
}
