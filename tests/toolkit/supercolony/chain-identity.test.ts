/**
 * Tests for chain-identity -- SDK Identities wrapper via RPC.
 *
 * Since the SDK Identities class crashes (NAPI SIGSEGV), these wrappers
 * use JSON-RPC calls directly. Tests mock globalThis.fetch for RPC calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  lookupByTwitter,
  lookupByGithub,
  lookupByDiscord,
  lookupByTelegram,
  lookupByWeb2,
  lookupByWeb3,
  getIdentitiesForAddress,
} from "../../../src/toolkit/supercolony/chain-identity.js";

// ── Test Helpers ────────────────────────────────────

/** Mock a successful RPC response with accounts */
function mockRpcSuccess(result: unknown): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result }),
  }));
}

/** Mock an RPC error response */
function mockRpcError(message = "Not found"): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32000, message },
    }),
  }));
}

/** Mock a network-level fetch failure */
function mockNetworkError(): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")));
}

const TEST_RPC = "https://demosnode.discus.sh/";

const SAMPLE_ACCOUNTS = [
  {
    pubkey: "0xabc123",
    balance: "1000",
    nonce: 5,
    identities: {},
    points: {},
    referralInfo: {},
    assignedTxs: [],
    flagged: false,
    flaggedReason: "",
    reviewed: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-06-01",
  },
];

// ── Tests ───────────────────────────────────────────

describe("chain-identity lookups", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── lookupByTwitter ────────────────────────────

  describe("lookupByTwitter", () => {
    it("returns accounts for a known twitter username", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByTwitter(TEST_RPC, "elonmusk");
      expect(result).toHaveLength(1);
      expect(result[0].pubkey).toBe("0xabc123");
    });

    it("sends correct RPC method and params", async () => {
      mockRpcSuccess([]);
      await lookupByTwitter(TEST_RPC, "vitalik");

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.method).toBe("getDemosIdsByTwitter");
      expect(body.params).toContain("vitalik");
    });

    it("returns empty array on RPC error", async () => {
      mockRpcError();
      const result = await lookupByTwitter(TEST_RPC, "nonexistent");
      expect(result).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      mockNetworkError();
      const result = await lookupByTwitter(TEST_RPC, "test");
      expect(result).toEqual([]);
    });
  });

  // ── lookupByGithub ─────────────────────────────

  describe("lookupByGithub", () => {
    it("returns accounts for a known github username", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByGithub(TEST_RPC, "torvalds");
      expect(result).toHaveLength(1);
    });

    it("sends correct RPC method", async () => {
      mockRpcSuccess([]);
      await lookupByGithub(TEST_RPC, "user");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getDemosIdsByGithub");
    });
  });

  // ── lookupByDiscord ────────────────────────────

  describe("lookupByDiscord", () => {
    it("returns accounts for a known discord username", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByDiscord(TEST_RPC, "user#1234");
      expect(result).toHaveLength(1);
    });

    it("sends correct RPC method", async () => {
      mockRpcSuccess([]);
      await lookupByDiscord(TEST_RPC, "user");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getDemosIdsByDiscord");
    });
  });

  // ── lookupByTelegram ───────────────────────────

  describe("lookupByTelegram", () => {
    it("returns accounts for a known telegram username", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByTelegram(TEST_RPC, "teleuser");
      expect(result).toHaveLength(1);
    });

    it("sends correct RPC method", async () => {
      mockRpcSuccess([]);
      await lookupByTelegram(TEST_RPC, "user");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getDemosIdsByTelegram");
    });
  });

  // ── lookupByWeb2 (generic) ────────────────────

  describe("lookupByWeb2", () => {
    it("returns accounts for a generic web2 platform", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByWeb2(TEST_RPC, "twitter", "user123");
      expect(result).toHaveLength(1);
    });

    it("sends correct RPC method with context", async () => {
      mockRpcSuccess([]);
      await lookupByWeb2(TEST_RPC, "discord", "user");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getDemosIdsByWeb2Identity");
      expect(body.params).toContain("discord");
      expect(body.params).toContain("user");
    });
  });

  // ── lookupByWeb3 ──────────────────────────────

  describe("lookupByWeb3", () => {
    it("returns accounts for a web3 chain address", async () => {
      mockRpcSuccess(SAMPLE_ACCOUNTS);
      const result = await lookupByWeb3(TEST_RPC, "eth.mainnet", "0xdead");
      expect(result).toHaveLength(1);
    });

    it("sends correct RPC method with chain and address", async () => {
      mockRpcSuccess([]);
      await lookupByWeb3(TEST_RPC, "solana.mainnet", "So1111");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getDemosIdsByWeb3Identity");
      expect(body.params).toContain("solana.mainnet");
      expect(body.params).toContain("So1111");
    });

    it("returns empty array on network error", async () => {
      mockNetworkError();
      const result = await lookupByWeb3(TEST_RPC, "eth.mainnet", "0xdead");
      expect(result).toEqual([]);
    });
  });

  // ── getIdentitiesForAddress ───────────────────

  describe("getIdentitiesForAddress", () => {
    it("returns full identity data for an address", async () => {
      const identityData = {
        web2: { twitter: ["user1"] },
        xm: { "eth.mainnet": ["0xabc"] },
      };
      mockRpcSuccess(identityData);
      const result = await getIdentitiesForAddress(TEST_RPC, "0xabc123");
      expect(result).toEqual(identityData);
    });

    it("sends getIdentities RPC method", async () => {
      mockRpcSuccess({});
      await getIdentitiesForAddress(TEST_RPC, "0xabc");

      const body = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      );
      expect(body.method).toBe("getIdentities");
      expect(body.params).toContain("0xabc");
    });

    it("returns null on network error", async () => {
      mockNetworkError();
      const result = await getIdentitiesForAddress(TEST_RPC, "0xabc");
      expect(result).toBeNull();
    });

    it("returns null on RPC error", async () => {
      mockRpcError("unknown address");
      const result = await getIdentitiesForAddress(TEST_RPC, "0xabc");
      expect(result).toBeNull();
    });
  });
});
