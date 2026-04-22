#!/usr/bin/env npx tsx

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
  getVerdictDelayMs,
} from "./_supervised-verdict-queue.ts";
import { isPredictionCheckSpec } from "./_prediction-check.ts";
import { getStringArg } from "./_shared.ts";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/record-pending-verdict.ts --from-run PATH [options]

Options:
  --from-run PATH             Path to a JSON run/report file containing one published result
  --queue PATH                Pending verdict queue path (default: docs/research/live-session-testing/pending-verdicts.json)
  --state-dir PATH            Stored with the queue entry for later verification
  --delay-ms N                Override the category default delay window
  --help, -h                  Show this help
`);
  process.exit(0);
}

const fromRun = getRequiredStringArg("--from-run");
const queuePath = getStringArg(args, "--queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const stateDir = getStringArg(args, "--state-dir");
const delayMs = getOptionalPositiveInt("--delay-ms");

const report = JSON.parse(await readFile(resolve(fromRun), "utf8")) as {
  checkedAt?: string;
  startedAt?: string;
  stateDir?: string;
  verdictSchedule?: {
    publishedAt?: string;
  };
  pendingVerdict?: {
    checkAt?: string;
  };
  decision?: {
    kind?: string;
    text?: string;
    category?: string;
    facts?: {
      predictionCheck?: unknown;
    };
  };
  outcome?: {
    status?: string;
    txHash?: string;
  };
  familyResults?: Array<{
    status?: string;
    draft?: { text?: string; category?: string };
    publish?: { txHash?: string };
  }>;
};
const publishedEntry = extractPublishedEntry(report, fromRun);
const checkAfterMs = inferPendingVerdictDelayMs(publishedEntry, delayMs);
const pendingEntry = buildPendingVerdictEntry({
  txHash: publishedEntry.txHash,
  category: publishedEntry.category,
  text: publishedEntry.text,
  startedAt: publishedEntry.startedAt,
  sourceRunPath: resolve(fromRun),
  stateDir: stateDir ?? report.stateDir,
  checkAfterMs,
  predictionCheck: publishedEntry.predictionCheck,
});

const queued = await enqueuePendingVerdict(pendingEntry, queuePath);

console.log(JSON.stringify({
  ok: true,
  queuePath,
  inserted: queued.inserted,
  pendingVerdict: queued.entry,
}, null, 2));

function getRequiredStringArg(flag: string): string {
  const value = getStringArg(args, flag);
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

function getOptionalPositiveInt(flag: string): number | undefined {
  const raw = getStringArg(args, flag);
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function extractPublishedEntry(
  report: {
    checkedAt?: string;
    startedAt?: string;
    verdictSchedule?: { publishedAt?: string };
    pendingVerdict?: { checkAt?: string };
    decision?: {
      kind?: string;
      text?: string;
      category?: string;
      facts?: {
        predictionCheck?: unknown;
      };
    };
    outcome?: { status?: string; txHash?: string };
    familyResults?: Array<{
      status?: string;
      draft?: { text?: string; category?: string };
      publish?: { txHash?: string };
    }>;
  },
  fromRunPath: string,
): {
  txHash: string;
  category: string;
  text: string;
  startedAt: string;
  predictionCheck: ReturnType<typeof extractPredictionCheck>;
} {
  const matrixPublished = (report.familyResults ?? []).filter((entry) =>
    entry?.status === "published" &&
    typeof entry.publish?.txHash === "string" &&
    typeof entry.draft?.text === "string" &&
    typeof entry.draft?.category === "string"
  );

  if (matrixPublished.length === 1) {
    const published = matrixPublished[0]!;
    return {
      txHash: published.publish!.txHash!,
      category: published.draft!.category!,
      text: published.draft!.text!,
      startedAt: inferMatrixPublishedAt(report, published.draft!.category!) ?? report.checkedAt ?? new Date().toISOString(),
      predictionCheck: null,
    };
  }

  if (
    report.outcome?.status === "published" &&
    typeof report.outcome.txHash === "string" &&
    report.decision?.kind === "publish" &&
    typeof report.decision.text === "string" &&
    typeof report.decision.category === "string"
  ) {
    return {
      txHash: report.outcome.txHash,
      category: report.decision.category,
      text: report.decision.text,
      startedAt: report.startedAt ?? report.checkedAt ?? new Date().toISOString(),
      predictionCheck: extractPredictionCheck(report.decision.facts?.predictionCheck),
    };
  }

  throw new Error(`Expected one published result in ${fromRunPath}; unable to match a supported report shape`);
}

function inferMatrixPublishedAt(
  report: {
    verdictSchedule?: { publishedAt?: string };
    pendingVerdict?: { checkAt?: string };
  },
  category: string,
): string | null {
  if (typeof report.verdictSchedule?.publishedAt === "string") {
    return report.verdictSchedule.publishedAt;
  }

  if (typeof report.pendingVerdict?.checkAt === "string") {
    const checkAtMs = Date.parse(report.pendingVerdict.checkAt);
    if (Number.isFinite(checkAtMs)) {
      return new Date(checkAtMs - getVerdictDelayMs(category)).toISOString();
    }
  }

  return null;
}

function extractPredictionCheck(value: unknown) {
  return isPredictionCheckSpec(value) ? value : null;
}

function inferPendingVerdictDelayMs(
  publishedEntry: {
    startedAt: string;
    predictionCheck: ReturnType<typeof extractPredictionCheck>;
  },
  delayOverride: number | undefined,
): number | undefined {
  if (delayOverride != null) {
    return delayOverride;
  }

  const deadlineAt = publishedEntry.predictionCheck?.deadlineAt;
  if (typeof deadlineAt !== "string") {
    return undefined;
  }

  const startedAtMs = Date.parse(publishedEntry.startedAt);
  const deadlineAtMs = Date.parse(deadlineAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(deadlineAtMs)) {
    return undefined;
  }

  return Math.max(0, deadlineAtMs - startedAtMs);
}
