import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getLifecycle,
  listLifecycles,
  recordTestResult,
  recordTransition,
  upsertLifecycle,
} from "../../../src/toolkit/colony/source-lifecycle-store.js";
import { CURRENT_SCHEMA_VERSION, getSchemaVersion, initColonyCache } from "../../../src/toolkit/colony/schema.js";

describe("colony source lifecycle store", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("upserts and retrieves lifecycle records", () => {
    upsertLifecycle(db, "btc-hash-rate", {
      status: "active",
      rating: {
        overall: 78,
        uptime: 92,
        testCount: 5,
        successCount: 4,
        consecutiveFailures: 0,
      },
      lastTestAt: "2026-04-01T10:00:00.000Z",
      testCount: 5,
      successCount: 4,
      consecutiveFailures: 0,
      lastTransitionAt: "2026-04-01T09:55:00.000Z",
      transitionHistory: [
        {
          at: "2026-04-01T09:55:00.000Z",
          oldStatus: "quarantined",
          newStatus: "active",
          reason: "Promoted: 3 consecutive passes",
        },
      ],
    });

    expect(getLifecycle(db, "btc-hash-rate")).toEqual(expect.objectContaining({
      sourceId: "btc-hash-rate",
      status: "active",
      rating: {
        overall: 78,
        uptime: 92,
        testCount: 5,
        successCount: 4,
        consecutiveFailures: 0,
      },
      lastTestAt: "2026-04-01T10:00:00.000Z",
      testCount: 5,
      successCount: 4,
      consecutiveFailures: 0,
      lastTransitionAt: "2026-04-01T09:55:00.000Z",
      transitionHistory: [
        {
          at: "2026-04-01T09:55:00.000Z",
          oldStatus: "quarantined",
          newStatus: "active",
          reason: "Promoted: 3 consecutive passes",
        },
      ],
      updatedAt: expect.any(String),
    }));
  });

  it("records test results with the same counter semantics as lifecycle rating updates", () => {
    upsertLifecycle(db, "btc-hash-rate", {
      status: "active",
      rating: {
        overall: 80,
        testCount: 2,
        successCount: 2,
        consecutiveFailures: 0,
      },
      testCount: 2,
      successCount: 2,
      consecutiveFailures: 0,
      transitionHistory: [],
    });

    recordTestResult(db, "btc-hash-rate", true, 180);

    expect(getLifecycle(db, "btc-hash-rate")).toEqual(expect.objectContaining({
      testCount: 3,
      successCount: 3,
      consecutiveFailures: 0,
      rating: expect.objectContaining({
        overall: 80,
        testCount: 3,
        successCount: 3,
        consecutiveFailures: 0,
        lastResponseMs: 180,
        lastTestedAt: expect.any(String),
      }),
      lastTestAt: expect.any(String),
    }));

    recordTestResult(db, "btc-hash-rate", false, 900);

    expect(getLifecycle(db, "btc-hash-rate")).toEqual(expect.objectContaining({
      testCount: 4,
      successCount: 0,
      consecutiveFailures: 1,
      rating: expect.objectContaining({
        overall: 80,
        testCount: 4,
        successCount: 0,
        consecutiveFailures: 1,
        lastResponseMs: 900,
        lastTestedAt: expect.any(String),
      }),
      lastTestAt: expect.any(String),
    }));
  });

  it("records transitions by appending history and updating status", () => {
    upsertLifecycle(db, "btc-hash-rate", {
      status: "quarantined",
      transitionHistory: [],
    });

    recordTransition(
      db,
      "btc-hash-rate",
      "quarantined",
      "active",
      "Promoted: 3 consecutive passes",
    );
    recordTransition(
      db,
      "btc-hash-rate",
      "active",
      "degraded",
      "3 consecutive failures",
    );

    const lifecycle = getLifecycle(db, "btc-hash-rate");
    expect(lifecycle).toEqual(expect.objectContaining({
      sourceId: "btc-hash-rate",
      status: "degraded",
      lastTransitionAt: expect.any(String),
    }));
    expect(lifecycle?.transitionHistory).toHaveLength(2);
    expect(lifecycle?.transitionHistory[0]).toEqual({
      at: expect.any(String),
      oldStatus: "quarantined",
      newStatus: "active",
      reason: "Promoted: 3 consecutive passes",
    });
    expect(lifecycle?.transitionHistory[1]).toEqual({
      at: expect.any(String),
      oldStatus: "active",
      newStatus: "degraded",
      reason: "3 consecutive failures",
    });
  });

  it("lists all lifecycle records", () => {
    upsertLifecycle(db, "alpha", { status: "active" });
    upsertLifecycle(db, "beta", { status: "degraded" });

    expect(listLifecycles(db)).toEqual([
      expect.objectContaining({ sourceId: "alpha", status: "active" }),
      expect.objectContaining({ sourceId: "beta", status: "degraded" }),
    ]);
  });

  it("migrates a v8 database to create source_lifecycle", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "colony-source-lifecycle-"));
    const dbPath = join(tempDir, "cache.sqlite");

    try {
      const legacyDb = initColonyCache(dbPath);
      legacyDb.exec("DROP TABLE source_lifecycle");
      legacyDb.prepare("UPDATE _meta SET value = '8' WHERE key = 'schema_version'").run();
      legacyDb.close();

      const migratedDb = initColonyCache(dbPath);
      try {
        expect(getSchemaVersion(migratedDb)).toBe(CURRENT_SCHEMA_VERSION);

        const table = migratedDb.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = 'source_lifecycle'
        `).get() as { name: string } | undefined;
        expect(table?.name).toBe("source_lifecycle");
      } finally {
        migratedDb.close();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
