/**
 * Tests for react() tool — agree/disagree with a SuperColony post.
 *
 * Covers: success case, validation error, API failure.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { react } from "../../../src/toolkit/tools/react.js";
import type { SdkBridge, ApiCallResult } from "../../../src/toolkit/sdk-bridge.js";

function createMockBridge(
  apiCallFn: (path: string, init?: RequestInit) => Promise<ApiCallResult>,
): SdkBridge {
  return {
    attestDahr: vi.fn(),
    apiCall: apiCallFn as SdkBridge["apiCall"],
    signAndBroadcast: vi.fn(),
    publishHivePost: vi.fn(),
    transferDem: vi.fn(),
    payD402: vi.fn(),
    getDemos: vi.fn() as unknown as SdkBridge["getDemos"],
  };
}

function createTestSession(tempDir: string, bridge: SdkBridge) {
  return new DemosSession({
    walletAddress: "demos1react",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { bridge },
    stateStore: new FileStateStore(tempDir),
  });
}

describe("react()", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-react-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns success on valid agree reaction", async () => {
    const bridge = createMockBridge(async () => ({
      ok: true,
      status: 200,
      data: { success: true },
    }));

    const session = createTestSession(tempDir, bridge);
    const result = await react(session, { txHash: "0xabc123", type: "agree" });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ success: true });
    expect(result.provenance).toBeDefined();
    expect(result.provenance.path).toBe("local");
    expect(result.provenance.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns success on valid disagree reaction", async () => {
    const bridge = createMockBridge(async () => ({
      ok: true,
      status: 200,
      data: { success: true },
    }));

    const session = createTestSession(tempDir, bridge);
    const result = await react(session, { txHash: "0xdef456", type: "disagree" });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ success: true });
  });

  it("calls API with correct path and body", async () => {
    let capturedPath: string | undefined;
    let capturedBody: string | undefined;

    const bridge = createMockBridge(async (path, init) => {
      capturedPath = path;
      capturedBody = init?.body as string;
      return { ok: true, status: 200, data: {} };
    });

    const session = createTestSession(tempDir, bridge);
    await react(session, { txHash: "0xtest", type: "agree" });

    expect(capturedPath).toBe("/api/react");
    expect(JSON.parse(capturedBody!)).toEqual({ txHash: "0xtest", type: "agree" });
  });

  it("returns INVALID_INPUT error for missing txHash", async () => {
    const bridge = createMockBridge(async () => ({
      ok: true,
      status: 200,
      data: {},
    }));

    const session = createTestSession(tempDir, bridge);
    // Pass invalid options with missing txHash
    const result = await react(session, { txHash: "", type: "agree" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe("INVALID_INPUT");
    expect(result.error!.retryable).toBe(false);
  });

  it("returns INVALID_INPUT error for invalid type", async () => {
    const bridge = createMockBridge(async () => ({
      ok: true,
      status: 200,
      data: {},
    }));

    const session = createTestSession(tempDir, bridge);
    // @ts-expect-error — intentionally passing invalid type
    const result = await react(session, { txHash: "0xabc", type: "love" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe("INVALID_INPUT");
  });

  it("returns NETWORK_ERROR when API returns non-ok status", async () => {
    const bridge = createMockBridge(async () => ({
      ok: false,
      status: 500,
      data: null,
    }));

    const session = createTestSession(tempDir, bridge);
    const result = await react(session, { txHash: "0xabc123", type: "agree" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe("NETWORK_ERROR");
    expect(result.error!.message).toContain("500");
    expect(result.error!.retryable).toBe(true);
  });

  it("returns NETWORK_ERROR when API throws an exception", async () => {
    const bridge = createMockBridge(async () => {
      throw new Error("Connection refused");
    });

    const session = createTestSession(tempDir, bridge);
    const result = await react(session, { txHash: "0xabc123", type: "disagree" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe("NETWORK_ERROR");
    expect(result.error!.retryable).toBe(true);
  });
});
