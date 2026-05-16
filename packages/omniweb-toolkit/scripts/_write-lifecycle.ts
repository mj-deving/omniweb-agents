import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

export const WRITE_LIFECYCLE_STATUSES = [
  "planned",
  "broadcasted",
  "pending-chain",
  "chain-confirmed",
  "pending-indexer",
  "indexed",
  "resolved",
  "degraded",
  "expired",
  "failed",
] as const;

export type WriteLifecycleStatus = typeof WRITE_LIFECYCLE_STATUSES[number];

export const WRITE_ACTION_FAMILIES = [
  "publish",
  "reply",
  "react",
  "tip",
  "vote",
  "bet-fixed",
  "bet-hl",
] as const;

export type WriteActionFamily = typeof WRITE_ACTION_FAMILIES[number];

export type WriteLifecycleSurface =
  | "chain-rpc"
  | "explorer"
  | "recent-feed"
  | "category-search"
  | "post-detail"
  | "parent-thread"
  | "reaction-envelope"
  | "post-tip-stats"
  | "recipient-tip-stats"
  | "balance"
  | "active-pool"
  | "winners-history";

export interface WriteLifecycleObservation {
  observedAt: string;
  surface: WriteLifecycleSurface | string;
  status: WriteLifecycleStatus;
  ok: boolean;
  summary: string;
  data?: unknown;
}

export interface WriteLifecycleTransition {
  at: string;
  from: WriteLifecycleStatus;
  to: WriteLifecycleStatus;
  reason: string;
}

export interface WriteLifecycleRecord {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  actionFamily: WriteActionFamily;
  status: WriteLifecycleStatus;
  walletAddress: string | null;
  command: string;
  commit: string | null;
  budget: {
    amount?: number;
    unit?: "DEM" | "write-rate-slot" | "none";
    ceiling?: number;
    spendStatus: "no-spend" | "planned" | "executed" | "unknown";
  };
  txHash?: string;
  attestationTxHash?: string;
  targetPostHash?: string;
  asset?: string;
  horizon?: string;
  roundEnd?: number;
  memo?: string;
  predictedPrice?: number;
  direction?: "higher" | "lower";
  expectedReadback: WriteLifecycleSurface[];
  nextRecheck: {
    afterMs: number;
    policy: "short-window" | "delayed-indexing" | "round-rollover" | "manual";
  };
  observations: WriteLifecycleObservation[];
  transitions: WriteLifecycleTransition[];
  finalVerdict?: {
    verdict: "pass" | "degraded" | "expired" | "failed";
    rationale: string;
    at: string;
  };
  metadata?: Record<string, unknown>;
}

export interface WriteLifecycleProofPacket {
  packetVersion: 1;
  generatedAt: string;
  recordId: string;
  command: string;
  commit: string | null;
  walletAddress: string | null;
  actionFamily: WriteActionFamily;
  actionKey: {
    txHash?: string;
    attestationTxHash?: string;
    targetPostHash?: string;
    asset?: string;
    horizon?: string;
    predictedPrice?: number;
    direction?: "higher" | "lower";
  };
  budget: WriteLifecycleRecord["budget"];
  status: WriteLifecycleStatus;
  chainState: WriteLifecycleObservation[];
  productReadbackState: WriteLifecycleObservation[];
  elapsedMs: number;
  blockDelta: number | null;
  finalVerdict: WriteLifecycleRecord["finalVerdict"] | null;
}

const PRODUCT_SURFACES = new Set<string>([
  "recent-feed",
  "category-search",
  "post-detail",
  "parent-thread",
  "reaction-envelope",
  "post-tip-stats",
  "recipient-tip-stats",
  "balance",
  "active-pool",
  "winners-history",
]);

export function getDefaultWriteLifecycleStateDir(): string {
  return resolve(homedir(), ".config", "demos");
}

export function createWriteLifecycleStore(opts: { stateDir?: string } = {}) {
  const root = resolve(opts.stateDir ?? getDefaultWriteLifecycleStateDir(), "write-lifecycle");
  const recordsDir = resolve(root, "records");
  const proofDir = resolve(root, "proofs");

  return {
    root,
    recordsDir,
    proofDir,

    async create(input: {
      actionFamily: WriteActionFamily;
      walletAddress?: string | null;
      command?: string;
      commit?: string | null;
      budget?: Partial<WriteLifecycleRecord["budget"]>;
      txHash?: string;
      attestationTxHash?: string;
      targetPostHash?: string;
      asset?: string;
      horizon?: string;
      roundEnd?: number;
      memo?: string;
      predictedPrice?: number;
      direction?: "higher" | "lower";
      expectedReadback: WriteLifecycleSurface[];
      nextRecheck?: Partial<WriteLifecycleRecord["nextRecheck"]>;
      metadata?: Record<string, unknown>;
      status?: WriteLifecycleStatus;
    }): Promise<WriteLifecycleRecord> {
      const now = new Date().toISOString();
      const initialStatus = input.status ?? (input.txHash ? "broadcasted" : "planned");
      const record: WriteLifecycleRecord = {
        version: 1,
        id: `wl-${now.replace(/[^0-9TZ]/g, "")}-${randomUUID().slice(0, 8)}`,
        createdAt: now,
        updatedAt: now,
        actionFamily: input.actionFamily,
        status: initialStatus,
        walletAddress: input.walletAddress ?? null,
        command: input.command ?? process.argv.join(" "),
        commit: input.commit ?? null,
        budget: {
          spendStatus: "unknown",
          ...input.budget,
        },
        txHash: input.txHash,
        attestationTxHash: input.attestationTxHash,
        targetPostHash: input.targetPostHash,
        asset: input.asset,
        horizon: input.horizon,
        roundEnd: input.roundEnd,
        memo: input.memo,
        predictedPrice: input.predictedPrice,
        direction: input.direction,
        expectedReadback: input.expectedReadback,
        nextRecheck: {
          afterMs: 90_000,
          policy: "delayed-indexing",
          ...input.nextRecheck,
        },
        observations: [],
        transitions: [],
        metadata: input.metadata ? scrubSecrets(input.metadata) as Record<string, unknown> : undefined,
      };
      await persistRecord(recordsDir, record);
      return record;
    },

    async get(idOrTxHash: string): Promise<WriteLifecycleRecord | null> {
      await mkdir(recordsDir, { recursive: true });
      const direct = await readRecord(resolve(recordsDir, `${idOrTxHash}.json`));
      if (direct) return direct;
      const records = await this.list();
      return records.find((record) => record.txHash === idOrTxHash || record.attestationTxHash === idOrTxHash) ?? null;
    },

    async list(): Promise<WriteLifecycleRecord[]> {
      await mkdir(recordsDir, { recursive: true });
      const names = await readdir(recordsDir);
      const records = await Promise.all(
        names
          .filter((name) => name.endsWith(".json"))
          .map((name) => readRecord(resolve(recordsDir, name))),
      );
      return records
        .filter((record): record is WriteLifecycleRecord => record !== null)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async update(
      id: string,
      patch: Partial<Omit<WriteLifecycleRecord, "id" | "createdAt" | "version">> & {
        observation?: Omit<WriteLifecycleObservation, "observedAt"> & { observedAt?: string };
        transitionReason?: string;
      },
    ): Promise<WriteLifecycleRecord> {
      const existing = await this.get(id);
      if (!existing) throw new Error(`write lifecycle record not found: ${id}`);
      const now = new Date().toISOString();
      const nextStatus = patch.status ?? existing.status;
      const transitions = [...existing.transitions];
      if (nextStatus !== existing.status) {
        transitions.push({
          at: now,
          from: existing.status,
          to: nextStatus,
          reason: patch.transitionReason ?? "status update",
        });
      }
      const observations = [...existing.observations];
      if (patch.observation) {
        observations.push({
          observedAt: patch.observation.observedAt ?? now,
          surface: patch.observation.surface,
          status: patch.observation.status,
          ok: patch.observation.ok,
          summary: patch.observation.summary,
          data: scrubSecrets(patch.observation.data),
        });
      }
      const updated: WriteLifecycleRecord = {
        ...existing,
        ...scrubSecrets(patch),
        id: existing.id,
        version: 1,
        createdAt: existing.createdAt,
        updatedAt: now,
        status: nextStatus,
        observations,
        transitions,
      };
      delete (updated as Record<string, unknown>).observation;
      delete (updated as Record<string, unknown>).transitionReason;
      await persistRecord(recordsDir, updated);
      return updated;
    },

    async writeProofPacket(
      record: WriteLifecycleRecord,
      packet: WriteLifecycleProofPacket = buildWriteLifecycleProofPacket(record),
      outPath?: string,
    ): Promise<string> {
      const target = outPath ?? resolve(proofDir, `${record.id}.proof.json`);
      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, `${JSON.stringify(scrubSecrets(packet), null, 2)}\n`, "utf8");
      return target;
    },
  };
}

export function classifyLifecycleStatus(input: {
  txHash?: string | null;
  chainConfirmed?: boolean;
  indexed?: boolean;
  resolved?: boolean;
  degraded?: boolean;
  expired?: boolean;
  failed?: boolean;
}): WriteLifecycleStatus {
  if (input.failed) return "failed";
  if (input.expired) return "expired";
  if (input.resolved) return "resolved";
  if (input.degraded) return "degraded";
  if (input.indexed) return "indexed";
  if (input.chainConfirmed) return "pending-indexer";
  if (input.txHash) return "pending-chain";
  return "planned";
}

export function buildWriteLifecycleProofPacket(record: WriteLifecycleRecord): WriteLifecycleProofPacket {
  const chainState = record.observations.filter((observation) =>
    observation.surface === "chain-rpc" || observation.surface === "explorer"
  );
  const productReadbackState = record.observations.filter((observation) => PRODUCT_SURFACES.has(observation.surface));
  const blockNumbers = record.observations
    .map((observation) => readBlockNumber(observation.data))
    .filter((value): value is number => value !== null);

  return {
    packetVersion: 1,
    generatedAt: new Date().toISOString(),
    recordId: record.id,
    command: record.command,
    commit: record.commit,
    walletAddress: record.walletAddress,
    actionFamily: record.actionFamily,
    actionKey: {
      txHash: record.txHash,
      attestationTxHash: record.attestationTxHash,
      targetPostHash: record.targetPostHash,
      asset: record.asset,
      horizon: record.horizon,
      predictedPrice: record.predictedPrice,
      direction: record.direction,
    },
    budget: record.budget,
    status: record.status,
    chainState,
    productReadbackState,
    elapsedMs: Date.parse(record.updatedAt) - Date.parse(record.createdAt),
    blockDelta: blockNumbers.length >= 2 ? Math.max(...blockNumbers) - Math.min(...blockNumbers) : null,
    finalVerdict: record.finalVerdict ?? null,
  };
}

export function finalVerdictForStatus(status: WriteLifecycleStatus): NonNullable<WriteLifecycleRecord["finalVerdict"]>["verdict"] | null {
  if (status === "indexed" || status === "resolved") return "pass";
  if (status === "degraded") return "degraded";
  if (status === "expired") return "expired";
  if (status === "failed") return "failed";
  return null;
}

export function lifecycleFlagEnabled(args: string[]): boolean {
  return args.includes("--record-lifecycle") || args.includes("--proof-out");
}

export function lifecycleArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function readCurrentGitCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 12) ?? null;
  }
}

async function persistRecord(recordsDir: string, record: WriteLifecycleRecord): Promise<void> {
  await mkdir(recordsDir, { recursive: true });
  await writeFile(resolve(recordsDir, `${record.id}.json`), `${JSON.stringify(scrubSecrets(record), null, 2)}\n`, "utf8");
}

async function readRecord(path: string): Promise<WriteLifecycleRecord | null> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as WriteLifecycleRecord;
    return parsed?.version === 1 && typeof parsed.id === "string" ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function scrubSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (/mnemonic|private.?key|secret|token|credential|password|^auth($|_|-)|authorization/i.test(key)) {
      out[key] = "[redacted]";
    } else {
      out[key] = scrubSecrets(entry);
    }
  }
  return out;
}

function readBlockNumber(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const raw = record.blockNumber ?? record.block ?? record.confirmationBlock;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
