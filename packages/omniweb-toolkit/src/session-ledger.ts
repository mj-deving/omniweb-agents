import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface SessionLedgerResult {
  version: 1;
  session_id: string;
  started_at: string;
  finished_at: string;
  status: string;
  actions_taken: string[];
  dem_spent: number;
  scorecard_summary: Record<string, unknown> | null;
  stop_reasons: string[];
  tx_hash?: string;
  indexed_visible?: boolean;
  verification_path?: string | null;
}

export function getDefaultSessionLedgerDir(cwd?: string): string {
  return resolve(cwd ?? process.cwd(), "sessions");
}

export async function loadRecentSessionResults(
  sessionLedgerDir: string,
  limit = 3,
): Promise<SessionLedgerResult[]> {
  try {
    const entries = await readdir(sessionLedgerDir, { withFileTypes: true });
    const sessionDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
      .slice(0, limit);

    const results: SessionLedgerResult[] = [];
    for (const dirName of sessionDirs) {
      try {
        const raw = await readFile(resolve(sessionLedgerDir, dirName, "result.json"), "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (isSessionLedgerResult(parsed)) {
          results.push(parsed);
        }
      } catch {
        // Ignore malformed or missing results so one bad session does not break the next run.
      }
    }

    return results;
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }
    throw error;
  }
}

export async function writeSessionLedgerJson(
  sessionDir: string,
  relativePath: string,
  value: unknown,
): Promise<void> {
  const target = resolve(sessionDir, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function isSessionLedgerResult(value: unknown): value is SessionLedgerResult {
  return isRecord(value)
    && value.version === 1
    && typeof value.session_id === "string"
    && typeof value.started_at === "string"
    && typeof value.finished_at === "string"
    && typeof value.status === "string"
    && Array.isArray(value.actions_taken)
    && typeof value.dem_spent === "number"
    && Array.isArray(value.stop_reasons);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown): boolean {
  return Boolean(error)
    && typeof error === "object"
    && (error as { code?: unknown }).code === "ENOENT";
}
