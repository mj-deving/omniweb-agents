/**
 * TDD tests for S6: tip recipient resolution via chain (RPC) over feed API.
 *
 * Problem: tip() resolves post author from feed API which is untrusted.
 * Fix: try RPC queryTransaction first, fall back to feed API with warning.
 *
 * Tests verify:
 * - RPC resolution is preferred over feed API
 * - When RPC returns address A but feed returns address B, tip goes to A
 * - When RPC fails, falls back to feed API
 * - When both fail, returns error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import type { SdkBridge, D402SettlementResult } from "../../../src/toolkit/sdk-bridge.js";
import { tip } from "../../../src/toolkit/tools/tip.js";

// ── Helpers ──────────────────────────────────────────

function mockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async () => ({ ok: true, status: 200, data: { posts: [] } })),
    signAndBroadcast: vi.fn(async () => ({ hash: "b" })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "tip-tx-123" })),
    getDemos: vi.fn(() => ({} as any)),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    queryTransaction: vi.fn(async () => null),
    ...overrides,
  };
}

function createSession(tempDir: string, bridge: SdkBridge) {
  return new DemosSession({
    walletAddress: "demos1tiptest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { demos: {}, bridge },
    stateStore: new FileStateStore(tempDir),
    tipPolicy: { maxPerTip: 10, maxPerPost: 5, cooldownMs: 0 },
  });
}

const TARGET_TX_HASH = "AABBCCDD1122334455667788";
const RPC_SENDER = "demos1rpc_resolved_author";
const FEED_SENDER = "demos1feed_untrusted_author";

// ── Tests ────────────────────────────────────────────

describe("tip() chain-first recipient resolution (S6)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-tip-s6-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("uses RPC-resolved address when queryTransaction succeeds", async () => {
    const bridge = mockBridge({
      queryTransaction: vi.fn(async () => ({ sender: RPC_SENDER })),
      apiCall: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { posts: [{ txHash: TARGET_TX_HASH, sender: FEED_SENDER }] },
      })),
    });
    const session = createSession(tempDir, bridge);

    const result = await tip(session, { txHash: TARGET_TX_HASH, amount: 2 });

    expect(result.ok).toBe(true);
    // Must have called transferDem with RPC address, NOT feed address
    expect(bridge.transferDem).toHaveBeenCalledWith(
      RPC_SENDER,
      2,
      expect.stringContaining(TARGET_TX_HASH),
    );
    // Feed API should NOT have been called since RPC succeeded
    expect(bridge.apiCall).not.toHaveBeenCalled();
  });

  it("falls back to feed API when queryTransaction returns null", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = mockBridge({
      queryTransaction: vi.fn(async () => null),
      apiCall: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { posts: [{ txHash: TARGET_TX_HASH, sender: FEED_SENDER }] },
      })),
    });
    const session = createSession(tempDir, bridge);

    const result = await tip(session, { txHash: TARGET_TX_HASH, amount: 2 });

    expect(result.ok).toBe(true);
    expect(bridge.transferDem).toHaveBeenCalledWith(
      FEED_SENDER,
      2,
      expect.stringContaining(TARGET_TX_HASH),
    );
    // Must log a warning about untrusted feed data
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("feed API"),
    );
    warnSpy.mockRestore();
  });

  it("falls back to feed API when queryTransaction throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = mockBridge({
      queryTransaction: vi.fn(async () => { throw new Error("RPC timeout"); }),
      apiCall: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { posts: [{ txHash: TARGET_TX_HASH, sender: FEED_SENDER }] },
      })),
    });
    const session = createSession(tempDir, bridge);

    const result = await tip(session, { txHash: TARGET_TX_HASH, amount: 2 });

    expect(result.ok).toBe(true);
    expect(bridge.transferDem).toHaveBeenCalledWith(
      FEED_SENDER,
      2,
      expect.any(String),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("feed API"),
    );
    warnSpy.mockRestore();
  });

  it("returns error when both RPC and feed API fail", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bridge = mockBridge({
      queryTransaction: vi.fn(async () => null),
      apiCall: vi.fn(async () => ({ ok: false, status: 0, data: "timeout" })),
    });
    const session = createSession(tempDir, bridge);

    const result = await tip(session, { txHash: TARGET_TX_HASH, amount: 2 });

    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe("NETWORK_ERROR");
    expect(bridge.transferDem).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("prefers RPC address over feed address even when both are available", async () => {
    const bridge = mockBridge({
      queryTransaction: vi.fn(async () => ({ sender: RPC_SENDER })),
      apiCall: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { posts: [{ txHash: TARGET_TX_HASH, sender: FEED_SENDER }] },
      })),
    });
    const session = createSession(tempDir, bridge);

    await tip(session, { txHash: TARGET_TX_HASH, amount: 1 });

    const transferCall = (bridge.transferDem as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(transferCall[0]).toBe(RPC_SENDER);
    expect(transferCall[0]).not.toBe(FEED_SENDER);
  });
});
