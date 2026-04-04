import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPostVerificationGate, getVerifiedPostCountsByAuthor } from "../../../src/toolkit/colony/attestation-status.js";
import { type ColonyDatabase } from "../../../src/toolkit/colony/schema.js";
import { createTestDb, addPost } from "../../helpers/colony-test-utils.js";

function addAttestation(db: ColonyDatabase, postTxHash: string, attTxHash: string, chainVerified: number) {
  db.prepare(`
    INSERT INTO attestations (post_tx_hash, attestation_tx_hash, method, chain_verified)
    VALUES (?, ?, 'DAHR', ?)
  `).run(postTxHash, attTxHash, chainVerified);
}

describe("getPostVerificationGate", () => {
  let db: ColonyDatabase;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("returns no_attestation for post without attestations", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    expect(getPostVerificationGate(db, "0xPost1")).toBe("no_attestation");
  });

  it("returns verified when chain_verified=1", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", 1);
    expect(getPostVerificationGate(db, "0xPost1")).toBe("verified");
  });

  it("returns failed when chain_verified=-1", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", -1);
    expect(getPostVerificationGate(db, "0xPost1")).toBe("failed");
  });

  it("returns unresolved when chain_verified=0", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", 0);
    expect(getPostVerificationGate(db, "0xPost1")).toBe("unresolved");
  });

  it("returns verified when one verified + one failed (any verified wins)", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", -1);
    addAttestation(db, "0xPost1", "0xAtt2", 1);
    expect(getPostVerificationGate(db, "0xPost1")).toBe("verified");
  });

  it("returns failed when one failed + one unresolved", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", -1);
    addAttestation(db, "0xPost1", "0xAtt2", 0);
    expect(getPostVerificationGate(db, "0xPost1")).toBe("failed");
  });

  it("returns no_attestation for nonexistent post", () => {
    expect(getPostVerificationGate(db, "0xNonExistent")).toBe("no_attestation");
  });
});

describe("getVerifiedPostCountsByAuthor", () => {
  let db: ColonyDatabase;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("returns empty record for empty authors list", () => {
    expect(getVerifiedPostCountsByAuthor(db, [])).toEqual({});
  });

  it("returns 0 for authors with no verified posts", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addAttestation(db, "0xPost1", "0xAtt1", 0); // unresolved
    expect(getVerifiedPostCountsByAuthor(db, ["0xAuthor1"])).toEqual({
      "0xauthor1": 0,
    });
  });

  it("counts verified posts per author", () => {
    addPost(db, "0xPost1", "0xAuthor1");
    addPost(db, "0xPost2", "0xAuthor1");
    addPost(db, "0xPost3", "0xAuthor2");
    addAttestation(db, "0xPost1", "0xAtt1", 1);
    addAttestation(db, "0xPost2", "0xAtt2", 1);
    addAttestation(db, "0xPost3", "0xAtt3", -1); // failed
    expect(getVerifiedPostCountsByAuthor(db, ["0xAuthor1", "0xAuthor2"])).toEqual({
      "0xauthor1": 2,
      "0xauthor2": 0,
    });
  });

  it("handles case-insensitive author addresses", () => {
    addPost(db, "0xPost1", "0xAbCdEf");
    addAttestation(db, "0xPost1", "0xAtt1", 1);
    expect(getVerifiedPostCountsByAuthor(db, ["0xABCDEF"])).toEqual({
      "0xabcdef": 1,
    });
  });
});
