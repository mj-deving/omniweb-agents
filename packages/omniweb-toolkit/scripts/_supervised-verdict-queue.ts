import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { REPO_ROOT } from "./_shared.ts";

export const DEFAULT_PENDING_VERDICT_PATH = resolve(
  REPO_ROOT,
  "docs",
  "research",
  "live-session-testing",
  "pending-verdicts.json",
);

export const DEFAULT_VERDICT_LOG_PATH = resolve(
  REPO_ROOT,
  "docs",
  "research",
  "live-session-testing",
  "verdict-log.jsonl",
);

const DEFAULT_ANALYSIS_DELAY_MS = 2 * 60 * 60 * 1000;
const DEFAULT_PREDICTION_DELAY_MS = 4 * 60 * 60 * 1000;
const DEFAULT_QUEUE_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_QUEUE_LOCK_RETRY_MS = 50;

export interface PendingVerdictEntry {
  version: 1;
  id: string;
  txHash: string;
  category: string;
  text: string;
  startedAt: string;
  recordedAt: string;
  checkAt: string;
  checkAfterMs: number;
  sourceRunPath: string | null;
  stateDir: string | null;
}

export interface VerdictLogEntry {
  version: 1;
  id: string;
  txHash: string;
  category: string;
  text: string;
  startedAt: string;
  recordedAt: string;
  checkAt: string;
  checkedAt: string;
  sourceRunPath: string | null;
  stateDir: string | null;
  verdict: unknown;
}

export interface BuildPendingVerdictEntryOptions {
  txHash: string;
  category: string;
  text: string;
  startedAt: string;
  recordedAt?: string;
  checkAfterMs?: number;
  sourceRunPath?: string | null;
  stateDir?: string | null;
}

export interface ResolveDuePendingVerdictsOptions {
  queuePath?: string;
  logPath?: string;
  now?: () => number;
  resolveEntry: (entry: PendingVerdictEntry) => Promise<{
    verdict: unknown;
    checkedAt?: string;
  }>;
}

export interface ResolveDuePendingVerdictsResult {
  resolved: VerdictLogEntry[];
  remaining: PendingVerdictEntry[];
  skipped: PendingVerdictEntry[];
  failures: Array<{
    entry: PendingVerdictEntry;
    error: string;
  }>;
}

export function getVerdictDelayMs(category: string): number {
  const normalized = category.trim().toUpperCase();
  if (normalized === "PREDICTION") {
    return DEFAULT_PREDICTION_DELAY_MS;
  }
  return DEFAULT_ANALYSIS_DELAY_MS;
}

export function buildPendingVerdictEntry(
  opts: BuildPendingVerdictEntryOptions,
): PendingVerdictEntry {
  const startedAtMs = Date.parse(opts.startedAt);
  if (!Number.isFinite(startedAtMs)) {
    throw new Error(`Invalid startedAt timestamp: ${opts.startedAt}`);
  }
  const recordedAt = opts.recordedAt ?? new Date().toISOString();
  const recordedAtMs = Date.parse(recordedAt);
  if (!Number.isFinite(recordedAtMs)) {
    throw new Error(`Invalid recordedAt timestamp: ${recordedAt}`);
  }
  const checkAfterMs = opts.checkAfterMs ?? getVerdictDelayMs(opts.category);
  const checkAt = new Date(startedAtMs + checkAfterMs).toISOString();
  return {
    version: 1,
    id: buildPendingVerdictId(opts.txHash, opts.category),
    txHash: opts.txHash,
    category: opts.category,
    text: opts.text,
    startedAt: opts.startedAt,
    recordedAt,
    checkAt,
    checkAfterMs,
    sourceRunPath: opts.sourceRunPath ?? null,
    stateDir: opts.stateDir ?? null,
  };
}

export async function loadPendingVerdicts(
  path = DEFAULT_PENDING_VERDICT_PATH,
): Promise<PendingVerdictEntry[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPendingVerdictEntry) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function savePendingVerdicts(
  entries: PendingVerdictEntry[],
  path = DEFAULT_PENDING_VERDICT_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function enqueuePendingVerdict(
  entry: PendingVerdictEntry,
  path = DEFAULT_PENDING_VERDICT_PATH,
): Promise<{ entry: PendingVerdictEntry; inserted: boolean; queue: PendingVerdictEntry[] }> {
  return withPendingVerdictQueueLock(path, async () => {
    const queue = await loadPendingVerdicts(path);
    const existing = queue.find((candidate) => candidate.id === entry.id || candidate.txHash === entry.txHash);
    if (existing) {
      return { entry: existing, inserted: false, queue };
    }
    const nextQueue = [...queue, entry];
    await savePendingVerdicts(nextQueue, path);
    return { entry, inserted: true, queue: nextQueue };
  });
}

export async function appendVerdictLogEntry(
  entry: VerdictLogEntry,
  path = DEFAULT_VERDICT_LOG_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function resolveDuePendingVerdicts(
  opts: ResolveDuePendingVerdictsOptions,
): Promise<ResolveDuePendingVerdictsResult> {
  const queuePath = opts.queuePath ?? DEFAULT_PENDING_VERDICT_PATH;
  const logPath = opts.logPath ?? DEFAULT_VERDICT_LOG_PATH;
  const now = opts.now ?? Date.now;
  const queue = await loadPendingVerdicts(queuePath);
  const originalIds = new Set(queue.map((entry) => entry.id));
  const resolved: VerdictLogEntry[] = [];
  const remaining: PendingVerdictEntry[] = [];
  const skipped: PendingVerdictEntry[] = [];
  const failures: Array<{
    entry: PendingVerdictEntry;
    error: string;
  }> = [];

  for (const entry of queue) {
    if (Date.parse(entry.checkAt) > now()) {
      remaining.push(entry);
      continue;
    }

    try {
      const outcome = await opts.resolveEntry(entry);
      const logEntry: VerdictLogEntry = {
        version: 1,
        id: entry.id,
        txHash: entry.txHash,
        category: entry.category,
        text: entry.text,
        startedAt: entry.startedAt,
        recordedAt: entry.recordedAt,
        checkAt: entry.checkAt,
        checkedAt: outcome.checkedAt ?? new Date(now()).toISOString(),
        sourceRunPath: entry.sourceRunPath,
        stateDir: entry.stateDir,
        verdict: outcome.verdict,
      };
      await appendVerdictLogEntry(logEntry, logPath);
      resolved.push(logEntry);
    } catch (error) {
      remaining.push(entry);
      skipped.push(entry);
      failures.push({
        entry,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const mergedRemaining = await mergePendingVerdictsWithNewEntries(
    remaining,
    queuePath,
    originalIds,
  );
  await savePendingVerdicts(mergedRemaining, queuePath);
  return { resolved, remaining: mergedRemaining, skipped, failures };
}

export function buildPendingVerdictId(txHash: string, category: string): string {
  return `${category.trim().toUpperCase()}:${txHash}`;
}

function isPendingVerdictEntry(value: unknown): value is PendingVerdictEntry {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingVerdictEntry>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === "string" &&
    typeof candidate.txHash === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.text === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.recordedAt === "string" &&
    typeof candidate.checkAt === "string" &&
    typeof candidate.checkAfterMs === "number"
  );
}

async function mergePendingVerdictsWithNewEntries(
  remaining: PendingVerdictEntry[],
  path: string,
  originalIds: Set<string>,
): Promise<PendingVerdictEntry[]> {
  const latestQueue = await loadPendingVerdicts(path);
  const merged = new Map<string, PendingVerdictEntry>();

  for (const entry of remaining) {
    merged.set(entry.id, entry);
  }

  for (const entry of latestQueue) {
    if (!originalIds.has(entry.id)) {
      merged.set(entry.id, entry);
    }
  }

  return Array.from(merged.values());
}

async function withPendingVerdictQueueLock<T>(
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockPath = `${path}.lock`;
  const deadline = Date.now() + DEFAULT_QUEUE_LOCK_TIMEOUT_MS;

  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for queue lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_QUEUE_LOCK_RETRY_MS));
    }
  }

  try {
    return await fn();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}
