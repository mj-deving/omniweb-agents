import { describe, it, expect } from "vitest";
import {
  encodeVotePost,
  encodeBinaryPost,
  decodeVotePayload,
  decodeBinaryPayload,
  validateBetPayload,
  MAX_BET_AMOUNT,
  type HiveBetPayload,
  type HiveBinaryPayload,
} from "../../../src/toolkit/colony/vote-bet-codec.js";

function futureExpiry(hoursFromNow = 24): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function validBet(): HiveBetPayload {
  return {
    action: "HIVE_BET",
    asset: "BTC",
    direction: "up",
    confidence: 75,
    amount: 5,
    expiry: futureExpiry(),
  };
}

function validBinary(): HiveBinaryPayload {
  return {
    action: "HIVE_BINARY",
    market: "us-election-2026",
    position: "yes",
    amount: 3,
  };
}

describe("encodeVotePost", () => {
  it("encodes a valid bet", () => {
    const result = encodeVotePost(validBet());
    expect(result.category).toBe("VOTE");
    expect(result.text).toContain("BTC");
    expect(result.text).toContain("up");
    expect(result.text).toContain("75%");
    expect(result.tags).toContain("btc");
    expect(result.tags).toContain("prediction");
  });

  it("clamps amount to MAX_BET_AMOUNT", () => {
    const result = encodeVotePost({ ...validBet(), amount: MAX_BET_AMOUNT });
    expect((result.metadata as any).amount).toBeLessThanOrEqual(MAX_BET_AMOUNT);
  });

  it("rejects amount below 0.1", () => {
    expect(() => encodeVotePost({ ...validBet(), amount: 0.05 })).toThrow();
  });

  it("rejects amount above 5", () => {
    expect(() => encodeVotePost({ ...validBet(), amount: 10 })).toThrow();
  });

  it("rejects past expiry", () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(() => encodeVotePost({ ...validBet(), expiry: past })).toThrow();
  });

  it("rejects expiry more than 7 days out", () => {
    const far = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(() => encodeVotePost({ ...validBet(), expiry: far })).toThrow();
  });

  it("accepts confidence 0", () => {
    const result = encodeVotePost({ ...validBet(), confidence: 0 });
    expect(result.text).toContain("0%");
  });

  it("accepts confidence 100", () => {
    const result = encodeVotePost({ ...validBet(), confidence: 100 });
    expect(result.text).toContain("100%");
  });

  it("rejects confidence > 100", () => {
    expect(() => encodeVotePost({ ...validBet(), confidence: 101 })).toThrow();
  });
});

describe("encodeBinaryPost", () => {
  it("encodes a valid binary bet", () => {
    const result = encodeBinaryPost(validBinary());
    expect(result.category).toBe("VOTE");
    expect(result.text).toContain("us-election-2026");
    expect(result.text).toContain("yes");
    expect(result.tags).toContain("binary-bet");
  });

  it("rejects amount below 0.1", () => {
    expect(() => encodeBinaryPost({ ...validBinary(), amount: 0 })).toThrow();
  });

  it("rejects amount above 5", () => {
    expect(() => encodeBinaryPost({ ...validBinary(), amount: 10 })).toThrow();
  });
});

describe("decodeVotePayload", () => {
  it("decodes valid bet data", () => {
    const bet = validBet();
    const decoded = decodeVotePayload(bet);
    expect(decoded).toEqual(bet);
  });

  it("returns null for invalid data", () => {
    expect(decodeVotePayload({ action: "WRONG" })).toBeNull();
  });

  it("returns null for missing fields", () => {
    expect(decodeVotePayload({ action: "HIVE_BET" })).toBeNull();
  });
});

describe("decodeBinaryPayload", () => {
  it("decodes valid binary data", () => {
    const binary = validBinary();
    const decoded = decodeBinaryPayload(binary);
    expect(decoded).toEqual(binary);
  });

  it("returns null for invalid data", () => {
    expect(decodeBinaryPayload({ action: "WRONG" })).toBeNull();
  });
});

describe("validateBetPayload", () => {
  it("validates correct payload", () => {
    expect(validateBetPayload(validBet())).not.toBeNull();
  });

  it("returns null for invalid payload", () => {
    expect(validateBetPayload({ garbage: true })).toBeNull();
  });

  it("returns null for negative amount", () => {
    expect(validateBetPayload({ ...validBet(), amount: -1 })).toBeNull();
  });
});
