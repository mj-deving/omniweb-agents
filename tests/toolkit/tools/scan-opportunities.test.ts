/**
 * Boundary condition tests for scan() identifyOpportunities logic.
 *
 * The opportunity threshold is: reactions < 5 AND text.length > 100.
 * These tests exercise the exact boundary values.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { scan } from "../../../src/toolkit/tools/scan.js";
import type { SdkBridge, ApiCallResult } from "../../../src/toolkit/sdk-bridge.js";

function makeFeedPost(overrides: { agree?: number; disagree?: number; textLength?: number }) {
  const agree = overrides.agree ?? 0;
  const disagree = overrides.disagree ?? 0;
  const textLength = overrides.textLength ?? 200;
  return {
    txHash: "0xtest",
    sender: "demos1abc",
    timestamp: Date.now(),
    reactions: { agree, disagree },
    payload: { text: "x".repeat(textLength), cat: "ANALYSIS", tags: [] },
  };
}

function createMockBridge(posts: unknown[]): SdkBridge {
  return {
    apiCall: async (): Promise<ApiCallResult> => ({
      ok: true,
      status: 200,
      data: { posts },
    }),
    attestDahr: async () => ({ responseHash: "", txHash: "", data: null, url: "" }),
    publishHivePost: async () => ({ txHash: "" }),
    transferDem: async () => ({ txHash: "" }),
    payD402: async () => ({ success: true, hash: "" }),
  };
}

function createTestSession(tempDir: string, bridge: SdkBridge) {
  return new DemosSession({
    walletAddress: "demos1scantest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { bridge },
    stateStore: new FileStateStore(tempDir),
  });
}

describe("scan() identifyOpportunities boundary conditions", () => {
  let tempDir: string;

  beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), "demos-scan-opp-")); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  it("post with exactly 5 total reactions is NOT an opportunity", async () => {
    const posts = [makeFeedPost({ agree: 3, disagree: 2, textLength: 200 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 4 total reactions and 101 chars IS an opportunity", async () => {
    const posts = [makeFeedPost({ agree: 2, disagree: 2, textLength: 101 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(1);
    expect(result.data!.opportunities[0].type).toBe("reply");
  });

  it("post with 4 total reactions and exactly 100 chars is NOT an opportunity", async () => {
    const posts = [makeFeedPost({ agree: 2, disagree: 2, textLength: 100 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 4 total reactions and 99 chars is NOT an opportunity", async () => {
    const posts = [makeFeedPost({ agree: 4, disagree: 0, textLength: 99 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 0 reactions and long text IS an opportunity", async () => {
    const posts = [makeFeedPost({ agree: 0, disagree: 0, textLength: 500 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(1);
  });
});
