import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CURRENT_SCHEMA_VERSION, getCursor, getSchemaVersion, initColonyCache, setCursor } from "../../../src/toolkit/colony/schema.js";

describe("colony schema", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("initializes the schema metadata and core tables", () => {
    expect(getSchemaVersion(db)).toBe(CURRENT_SCHEMA_VERSION);
    expect(getCursor(db)).toBe(0);

    const tableNames = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all() as Array<{ name: string }>;

    expect(tableNames.map((row) => row.name)).toEqual(expect.arrayContaining([
      "_meta",
      "attestations",
      "claim_ledger",
      "dead_letters",
      "hive_reactions",
      "posts",
      "reaction_cache",
      "source_response_cache",
    ]));
  });

  it("schema v2 adds tx metadata columns to posts and hive_reactions table", () => {
    // Verify posts has the new columns
    const postCols = db.prepare("PRAGMA table_info(posts)").all() as Array<{ name: string }>;
    const colNames = postCols.map((c) => c.name);
    expect(colNames).toContain("tx_id");
    expect(colNames).toContain("from_ed25519");
    expect(colNames).toContain("nonce");
    expect(colNames).toContain("amount");
    expect(colNames).toContain("network_fee");
    expect(colNames).toContain("rpc_fee");
    expect(colNames).toContain("additional_fee");

    // Verify hive_reactions table exists with correct columns
    const rxCols = db.prepare("PRAGMA table_info(hive_reactions)").all() as Array<{ name: string }>;
    const rxColNames = rxCols.map((c) => c.name);
    expect(rxColNames).toContain("tx_hash");
    expect(rxColNames).toContain("tx_id");
    expect(rxColNames).toContain("target_tx_hash");
    expect(rxColNames).toContain("reaction_type");
    expect(rxColNames).toContain("author");
    expect(rxColNames).toContain("from_ed25519");
    expect(rxColNames).toContain("network_fee");
  });

  it("updates the scan cursor in metadata", () => {
    setCursor(db, 1980084);

    expect(getCursor(db)).toBe(1980084);
  });

  it("schema v3 creates posts_fts virtual table and sync triggers", () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'posts_fts'",
    ).all() as Array<{ name: string }>;
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe("posts_fts");

    const triggers = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'posts_fts_%' ORDER BY name",
    ).all() as Array<{ name: string }>;
    expect(triggers).toHaveLength(3);
    expect(triggers.map((t) => t.name)).toEqual(["posts_fts_ad", "posts_fts_ai", "posts_fts_au"]);
  });

  it("schema v4 creates agent_profiles and interactions tables", () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    const names = (tables as Array<{ name: string }>).map((r) => r.name);
    expect(names).toContain("agent_profiles");
    expect(names).toContain("interactions");

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'interactions'").all();
    const idxNames = (indexes as Array<{ name: string }>).map((i) => i.name);
    expect(idxNames).toContain("idx_interactions_address");
    expect(idxNames).toContain("idx_interactions_type");
  });

  it("schema v5 adds proof ingestion columns to attestations", () => {
    const cols = db.prepare("PRAGMA table_info(attestations)").all() as Array<{ name: string; dflt_value: string | null }>;
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("chain_verified");
    expect(colNames).toContain("chain_method");
    expect(colNames).toContain("chain_data");
    expect(colNames).toContain("resolved_at");

    // chain_verified defaults to 0
    const chainVerifiedCol = cols.find((c) => c.name === "chain_verified");
    expect(chainVerifiedCol?.dflt_value).toBe("0");

    // Partial index exists for efficient unresolved queries
    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'attestations'",
    ).all() as Array<{ name: string }>;
    const idxNames = indexes.map((i) => i.name);
    expect(idxNames).toContain("idx_attestations_unresolved");
  });

  it("schema v5 preserves existing attestation rows with chain_verified=0", () => {
    // Insert a post and attestation before checking defaults
    db.prepare(`
      INSERT INTO posts (tx_hash, author, block_number, timestamp, text, raw_data)
      VALUES ('0xpost', 'agent1', 1, '2026-01-01T00:00:00Z', 'test', '{}')
    `).run();
    db.prepare(`
      INSERT INTO attestations (post_tx_hash, attestation_tx_hash, source_url, method, data_snapshot, attested_at)
      VALUES ('0xpost', '0xattest', 'https://api.example.com', 'DAHR', '{}', '2026-01-01T00:00:00Z')
    `).run();

    const row = db.prepare("SELECT chain_verified, chain_method, chain_data, resolved_at FROM attestations WHERE attestation_tx_hash = '0xattest'")
      .get() as { chain_verified: number; chain_method: string | null; chain_data: string | null; resolved_at: string | null };
    expect(row.chain_verified).toBe(0);
    expect(row.chain_method).toBeNull();
    expect(row.chain_data).toBeNull();
    expect(row.resolved_at).toBeNull();
  });

  it("requests WAL mode and leaves in-memory sqlite in its supported journal mode", () => {
    const journalMode = String(db.pragma("journal_mode", { simple: true })).toLowerCase();

    expect(["wal", "memory"]).toContain(journalMode);
  });
});
