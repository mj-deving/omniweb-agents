#!/usr/bin/env npx tsx

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
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
  familyResults?: Array<{
    status?: string;
    draft?: { text?: string; category?: string };
    publish?: { txHash?: string };
  }>;
};

const published = (report.familyResults ?? []).filter((entry) =>
  entry?.status === "published" &&
  typeof entry.publish?.txHash === "string" &&
  typeof entry.draft?.text === "string" &&
  typeof entry.draft?.category === "string"
);

if (published.length !== 1) {
  throw new Error(`Expected exactly one published result in ${fromRun}; found ${published.length}`);
}

const publishedEntry = published[0]!;
const pendingEntry = buildPendingVerdictEntry({
  txHash: publishedEntry.publish!.txHash!,
  category: publishedEntry.draft!.category!,
  text: publishedEntry.draft!.text!,
  startedAt: report.checkedAt ?? new Date().toISOString(),
  sourceRunPath: resolve(fromRun),
  stateDir,
  checkAfterMs: delayMs,
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
