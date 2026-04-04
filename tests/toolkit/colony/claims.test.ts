import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findContradictions, findDuplicateClaims, getClaimsByAuthor, getClaimsByPost, insertClaim, reconcileClaimVerification } from "../../../src/toolkit/colony/claims.js";
import { insertPost } from "../../../src/toolkit/colony/posts.js";
import { initColonyCache } from "../../../src/toolkit/colony/schema.js";

describe("colony claims", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");

    insertPost(db, {
      txHash: "0xpost-1",
      author: "demos1alice",
      blockNumber: 100,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["bitcoin"],
      text: "BTC is at 877.9 EH/s",
      rawData: { id: 1 },
    });
    insertPost(db, {
      txHash: "0xpost-2",
      author: "demos1bob",
      blockNumber: 101,
      timestamp: "2026-03-31T10:20:00.000Z",
      replyTo: null,
      tags: ["bitcoin"],
      text: "BTC is closer to 880 EH/s",
      rawData: { id: 2 },
    });
    insertPost(db, {
      txHash: "0xpost-3",
      author: "demos1alice",
      blockNumber: 102,
      timestamp: "2026-03-31T11:00:00.000Z",
      replyTo: null,
      tags: ["bitcoin"],
      text: "BTC is still 877.9 EH/s",
      rawData: { id: 3 },
    });
  });

  afterEach(() => {
    db.close();
  });

  it("inserts claims and reads them back by post and author", () => {
    const firstId = insertClaim(db, {
      subject: "bitcoin",
      metric: "hash_rate",
      value: 877.9,
      unit: "EH/s",
      direction: "up",
      chain: "bitcoin",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: "2026-03-31T09:55:00.000Z",
      postTxHash: "0xpost-1",
      author: "demos1alice",
      claimedAt: "2026-03-31T10:00:00.000Z",
      attestationTxHash: "0xatt-1",
      verified: true,
      verificationResult: "matched tlsn payload",
      stale: false,
    });
    insertClaim(db, {
      subject: "bitcoin",
      metric: "hash_rate",
      value: 880.1,
      unit: "EH/s",
      direction: "up",
      chain: "bitcoin",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: "2026-03-31T10:15:00.000Z",
      postTxHash: "0xpost-2",
      author: "demos1bob",
      claimedAt: "2026-03-31T10:20:00.000Z",
      attestationTxHash: null,
      verified: false,
      verificationResult: null,
      stale: false,
    });

    const byPost = getClaimsByPost(db, "0xpost-1");
    expect(byPost).toHaveLength(1);
    expect(byPost[0].id).toBe(firstId);
    expect(byPost[0].verified).toBe(true);

    const byAuthor = getClaimsByAuthor(db, "demos1alice", 1);
    expect(byAuthor).toHaveLength(1);
    expect(byAuthor[0].postTxHash).toBe("0xpost-1");
  });

  it("finds duplicate claims and contradictions within a time window", () => {
    insertClaim(db, {
      subject: "bitcoin",
      metric: "hash_rate",
      value: 877.9,
      unit: "EH/s",
      direction: "up",
      chain: "bitcoin",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: "2026-03-31T09:55:00.000Z",
      postTxHash: "0xpost-1",
      author: "demos1alice",
      claimedAt: "2026-03-31T10:00:00.000Z",
      attestationTxHash: "0xatt-1",
      verified: true,
      verificationResult: "ok",
      stale: false,
    });
    insertClaim(db, {
      subject: "bitcoin",
      metric: "hash_rate",
      value: 880.1,
      unit: "EH/s",
      direction: "up",
      chain: "bitcoin",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: "2026-03-31T10:15:00.000Z",
      postTxHash: "0xpost-2",
      author: "demos1bob",
      claimedAt: "2026-03-31T10:20:00.000Z",
      attestationTxHash: null,
      verified: false,
      verificationResult: null,
      stale: false,
    });
    insertClaim(db, {
      subject: "bitcoin",
      metric: "hash_rate",
      value: 877.9,
      unit: "EH/s",
      direction: "up",
      chain: "bitcoin",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: "2026-03-31T10:55:00.000Z",
      postTxHash: "0xpost-3",
      author: "demos1alice",
      claimedAt: "2026-03-31T11:00:00.000Z",
      attestationTxHash: "0xatt-2",
      verified: true,
      verificationResult: "ok",
      stale: false,
    });

    const duplicates = findDuplicateClaims(
      db,
      "bitcoin",
      "hash_rate",
      60 * 60 * 1000,
      "2026-03-31T10:00:00.000Z",
    );
    expect(duplicates.map((claim) => claim.postTxHash)).toEqual([
      "0xpost-3",
      "0xpost-2",
      "0xpost-1",
    ]);

    const contradictions = findContradictions(
      db,
      "bitcoin",
      "hash_rate",
      60 * 60 * 1000,
      "2026-03-31T10:00:00.000Z",
    );
    expect(contradictions.map((claim) => claim.postTxHash)).toEqual([
      "0xpost-3",
      "0xpost-2",
      "0xpost-1",
    ]);
  });
});

describe("reconcileClaimVerification", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
    insertPost(db, {
      txHash: "0xpost-r1",
      author: "demos1alice",
      blockNumber: 100,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: [],
      text: "Reconcile test",
      rawData: {},
    });
  });

  afterEach(() => {
    db.close();
  });

  it("downgrades verified claims when attestation chain_verified is -1", () => {
    insertClaim(db, {
      subject: "bitcoin",
      metric: "price",
      value: 100,
      unit: "USD",
      direction: null,
      chain: "eth:1",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: null,
      postTxHash: "0xpost-r1",
      author: "demos1alice",
      claimedAt: "2026-03-31T10:00:00.000Z",
      attestationTxHash: "0xatt-fail",
      verified: true,
      verificationResult: "matched",
      stale: false,
    });

    // Insert a failed attestation
    db.prepare(`
      INSERT INTO attestations (post_tx_hash, attestation_tx_hash, method, chain_verified)
      VALUES (?, ?, 'DAHR', -1)
    `).run("0xpost-r1", "0xatt-fail");

    const count = reconcileClaimVerification(db);
    expect(count).toBe(1);

    // Verify the claim was downgraded
    const rows = db.prepare(
      "SELECT verified FROM claim_ledger WHERE attestation_tx_hash = ?",
    ).all("0xatt-fail") as Array<{ verified: number }>;
    expect(rows[0].verified).toBe(0);
  });

  it("does not touch claims with successful attestations", () => {
    insertClaim(db, {
      subject: "bitcoin",
      metric: "price",
      value: 100,
      unit: "USD",
      direction: null,
      chain: "eth:1",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: null,
      postTxHash: "0xpost-r1",
      author: "demos1alice",
      claimedAt: "2026-03-31T10:00:00.000Z",
      attestationTxHash: "0xatt-ok",
      verified: true,
      verificationResult: "matched",
      stale: false,
    });

    db.prepare(`
      INSERT INTO attestations (post_tx_hash, attestation_tx_hash, method, chain_verified)
      VALUES (?, ?, 'DAHR', 1)
    `).run("0xpost-r1", "0xatt-ok");

    const count = reconcileClaimVerification(db);
    expect(count).toBe(0);

    const rows = db.prepare(
      "SELECT verified FROM claim_ledger WHERE attestation_tx_hash = ?",
    ).all("0xatt-ok") as Array<{ verified: number }>;
    expect(rows[0].verified).toBe(1);
  });

  it("returns 0 when no claims need reconciliation", () => {
    const count = reconcileClaimVerification(db);
    expect(count).toBe(0);
  });
});
