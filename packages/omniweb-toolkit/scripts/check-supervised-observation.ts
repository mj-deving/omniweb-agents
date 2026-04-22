#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getStringArg, hasFlag, loadPackageExport } from "./_shared.ts";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-observation.ts [options]

Options:
  --text TEXT                  Required factual OBSERVATION post body
  --attest-url URL             Required primary attestation URL used for publish()
  --confidence N               Optional confidence percentage (0-100, default: 60)
  --source-name TEXT           Optional source label for audit output
  --state-dir PATH             Forwarded to connect()/state persistence
  --allow-insecure             Forwarded to connect() for local debugging only
  --record-pending-verdict     Queue a delayed follow-up using the OBSERVATION verdict schedule
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
const confidence = getOptionalNumber("--confidence", 60, 0, 100);
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

const attestationPlan = buildMinimalAttestationPlanFromUrls({
  topic: "supervised-observation",
  agent: "observation-check",
  urls: [attestUrl],
});

const record = await runMinimalAgentCycle(
  async () => ({
    kind: "publish",
    category: "OBSERVATION",
    text,
    attestUrl,
    confidence,
    attestationPlan,
    facts: {
      observationSourceName: sourceName,
    },
    audit: {
      promptPacket: {
        objective: "Publish one supervised factual OBSERVATION post from a single attested source.",
        sourceName,
        confidence,
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

const verdictSchedule = scheduleSupervisedVerdict("OBSERVATION", record.startedAt);
let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && record.outcome.status === "published" && record.outcome.txHash) {
  const queued = await enqueuePendingVerdict(buildPendingVerdictEntry({
    txHash: record.outcome.txHash,
    category: "OBSERVATION",
    text,
    startedAt: record.startedAt,
    sourceRunPath: null,
    stateDir: record.stateDir,
    checkAfterMs: verdictSchedule.followUpEarliestMs,
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
  verdictSchedule,
  pendingVerdict,
  sourceName,
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

function getOptionalNumber(flag: string, fallback: number, min: number, max: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
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
