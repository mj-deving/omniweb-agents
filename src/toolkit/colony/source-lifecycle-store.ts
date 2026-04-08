import type { SourceRecordV2, SourceStatus } from "../sources/catalog.js";
import type { ColonyDatabase } from "./schema.js";

export interface SourceLifecycleTransition {
  at: string;
  oldStatus: SourceStatus;
  newStatus: SourceStatus;
  reason: string;
}

export type SourceLifecycleRating = Partial<SourceRecordV2["rating"]> & {
  lastResponseMs?: number;
};

export interface SourceLifecycleRecord {
  sourceId: string;
  status: SourceStatus;
  rating: SourceLifecycleRating;
  lastTestAt: string | null;
  testCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastTransitionAt: string | null;
  transitionHistory: SourceLifecycleTransition[];
  updatedAt: string;
}

export interface SourceLifecycleInput {
  status?: SourceStatus;
  rating?: SourceLifecycleRating;
  lastTestAt?: string | null;
  testCount?: number;
  successCount?: number;
  consecutiveFailures?: number;
  lastTransitionAt?: string | null;
  transitionHistory?: SourceLifecycleTransition[];
}

interface SourceLifecycleRow {
  source_id: string;
  status: SourceStatus;
  rating_json: string;
  last_test_at: string | null;
  test_count: number;
  success_count: number;
  consecutive_failures: number;
  last_transition_at: string | null;
  transition_history_json: string;
  updated_at: string;
}

const SELECT_LIFECYCLE_SQL = `
  SELECT
    source_id,
    status,
    rating_json,
    last_test_at,
    test_count,
    success_count,
    consecutive_failures,
    last_transition_at,
    transition_history_json,
    updated_at
  FROM source_lifecycle
`;

function parseJsonValue<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapLifecycleRow(row: SourceLifecycleRow | undefined): SourceLifecycleRecord | null {
  if (!row) {
    return null;
  }

  const rating = parseJsonValue<SourceLifecycleRating>(row.rating_json, {});
  const transitionHistory = parseJsonValue<SourceLifecycleTransition[]>(
    row.transition_history_json,
    [],
  );

  return {
    sourceId: row.source_id,
    status: row.status,
    rating,
    lastTestAt: row.last_test_at,
    testCount: row.test_count,
    successCount: row.success_count,
    consecutiveFailures: row.consecutive_failures,
    lastTransitionAt: row.last_transition_at,
    transitionHistory: Array.isArray(transitionHistory) ? transitionHistory : [],
    updatedAt: row.updated_at,
  };
}

function mapLifecycleRows(rows: SourceLifecycleRow[]): SourceLifecycleRecord[] {
  return rows
    .map((row) => mapLifecycleRow(row))
    .filter((row): row is SourceLifecycleRecord => row !== null);
}

function toStoredInput(data: SourceLifecycleInput) {
  return {
    status: data.status ?? "quarantined",
    ratingJson: JSON.stringify(data.rating ?? {}),
    lastTestAt: data.lastTestAt ?? null,
    testCount: data.testCount ?? 0,
    successCount: data.successCount ?? 0,
    consecutiveFailures: data.consecutiveFailures ?? 0,
    lastTransitionAt: data.lastTransitionAt ?? null,
    transitionHistoryJson: JSON.stringify(data.transitionHistory ?? []),
  };
}

export function upsertLifecycle(
  db: ColonyDatabase,
  sourceId: string,
  data: SourceLifecycleInput,
): void {
  const stored = toStoredInput(data);

  db.prepare(`
    INSERT INTO source_lifecycle (
      source_id,
      status,
      rating_json,
      last_test_at,
      test_count,
      success_count,
      consecutive_failures,
      last_transition_at,
      transition_history_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_id) DO UPDATE SET
      status = excluded.status,
      rating_json = excluded.rating_json,
      last_test_at = excluded.last_test_at,
      test_count = excluded.test_count,
      success_count = excluded.success_count,
      consecutive_failures = excluded.consecutive_failures,
      last_transition_at = excluded.last_transition_at,
      transition_history_json = excluded.transition_history_json,
      updated_at = datetime('now')
  `).run(
    sourceId,
    stored.status,
    stored.ratingJson,
    stored.lastTestAt,
    stored.testCount,
    stored.successCount,
    stored.consecutiveFailures,
    stored.lastTransitionAt,
    stored.transitionHistoryJson,
  );
}

export function getLifecycle(db: ColonyDatabase, sourceId: string): SourceLifecycleRecord | null {
  const row = db.prepare(`
    ${SELECT_LIFECYCLE_SQL}
    WHERE source_id = ?
  `).get(sourceId) as SourceLifecycleRow | undefined;

  return mapLifecycleRow(row);
}

export function listLifecycles(db: ColonyDatabase): SourceLifecycleRecord[] {
  const rows = db.prepare(`
    ${SELECT_LIFECYCLE_SQL}
    ORDER BY source_id ASC
  `).all() as SourceLifecycleRow[];

  return mapLifecycleRows(rows);
}

export function recordTestResult(
  db: ColonyDatabase,
  sourceId: string,
  passed: boolean,
  responseMs: number,
): void {
  db.transaction(() => {
    const current = getLifecycle(db, sourceId);
    const now = new Date().toISOString();
    const nextTestCount = (current?.testCount ?? 0) + 1;
    const nextSuccessCount = passed ? (current?.successCount ?? 0) + 1 : 0;
    const nextConsecutiveFailures = passed ? 0 : (current?.consecutiveFailures ?? 0) + 1;

    upsertLifecycle(db, sourceId, {
      status: current?.status ?? "quarantined",
      rating: {
        ...(current?.rating ?? {}),
        lastTestedAt: now,
        testCount: nextTestCount,
        successCount: nextSuccessCount,
        consecutiveFailures: nextConsecutiveFailures,
        lastResponseMs: responseMs,
      },
      lastTestAt: now,
      testCount: nextTestCount,
      successCount: nextSuccessCount,
      consecutiveFailures: nextConsecutiveFailures,
      lastTransitionAt: current?.lastTransitionAt ?? null,
      transitionHistory: current?.transitionHistory ?? [],
    });
  })();
}

export function recordTransition(
  db: ColonyDatabase,
  sourceId: string,
  oldStatus: SourceStatus,
  newStatus: SourceStatus,
  reason: string,
): void {
  db.transaction(() => {
    const current = getLifecycle(db, sourceId);
    const now = new Date().toISOString();
    const nextTransition: SourceLifecycleTransition = {
      at: now,
      oldStatus,
      newStatus,
      reason,
    };

    upsertLifecycle(db, sourceId, {
      status: newStatus,
      rating: current?.rating ?? {},
      lastTestAt: current?.lastTestAt ?? null,
      testCount: current?.testCount ?? 0,
      successCount: current?.successCount ?? 0,
      consecutiveFailures: current?.consecutiveFailures ?? 0,
      lastTransitionAt: now,
      transitionHistory: [...(current?.transitionHistory ?? []), nextTransition],
    });
  })();
}
