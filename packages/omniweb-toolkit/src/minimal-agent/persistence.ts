import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  MinimalAgentState,
  MinimalCycleRecord,
  MinimalCycleSummary,
} from "../minimal-agent.js";
import { getDefaultSessionLedgerDir } from "../session-ledger.js";
import {
  isCycleSummary,
  renderCycleSummary,
  summarizeCycle,
} from "./cycle-summary.js";
import { persistSessionLedger } from "./session-ledger-persistence.js";

interface StoredMinimalState<TState extends MinimalAgentState = MinimalAgentState> {
  version: 1;
  updatedAt: string;
  iteration: number;
  agentState: TState | null;
  lastCycle: MinimalCycleSummary | null;
}

export function resolveStateDir(stateDir: string | undefined, cwd: string | undefined, defaultStateDir: string): string {
  if (stateDir) return resolve(stateDir);
  return resolve(cwd ?? process.cwd(), defaultStateDir);
}

export async function loadStoredState<TState extends MinimalAgentState>(
  stateDir: string,
): Promise<StoredMinimalState<TState>> {
  const path = stateFilePath(stateDir);
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredMinimalState<TState>>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      iteration: typeof parsed.iteration === "number" ? parsed.iteration : 0,
      agentState: isRecord(parsed.agentState) ? parsed.agentState as TState : null,
      lastCycle: isCycleSummary(parsed.lastCycle) ? parsed.lastCycle : null,
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return {
        version: 1,
        updatedAt: new Date(0).toISOString(),
        iteration: 0,
        agentState: null,
        lastCycle: null,
      };
    }
    throw error;
  }
}

export async function persistCycleArtifacts<TState extends MinimalAgentState>(
  stateDir: string,
  record: MinimalCycleRecord<TState>,
): Promise<void> {
  const day = record.startedAt.slice(0, 10);
  const jsonPath = resolve(stateDir, "runs", day, `${record.cycleId}.json`);
  const markdownPath = resolve(stateDir, "runs", day, `${record.cycleId}.md`);
  const latestPath = resolve(stateDir, "runs", "latest.json");
  const statePath = stateFilePath(stateDir);
  const summary = summarizeCycle(record);

  const storedState: StoredMinimalState<TState> = {
    version: 1,
    updatedAt: record.finishedAt,
    iteration: record.iteration,
    agentState: record.memoryAfter.state,
    lastCycle: summary,
  };

  await writeJson(jsonPath, record);
  await writeText(markdownPath, renderCycleSummary(record));
  await writeJson(latestPath, record);
  await writeJson(statePath, storedState);
  await persistSessionLedger(record);
}

export function resolveSessionLedgerDir(sessionLedgerDir: string | undefined, cwd: string | undefined): string {
  if (sessionLedgerDir) return resolve(sessionLedgerDir);
  return getDefaultSessionLedgerDir(cwd);
}

function stateFilePath(stateDir: string): string {
  return resolve(stateDir, "state", "current.json");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf-8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown): boolean {
  const candidate = error as { code?: unknown } | null;
  return Boolean(error)
    && typeof error === "object"
    && candidate?.code === "ENOENT";
}
