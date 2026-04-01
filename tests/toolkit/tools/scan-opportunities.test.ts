/**
 * Boundary condition tests for scan() identifyOpportunities logic.
 *
 * The opportunity threshold is: reactions < 5 AND text.length > 100.
 * These tests exercise the exact boundary values using chain-first posts.
 * reactionsKnown: true posts use reaction-dependent heuristics.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { scan } from "../../../src/toolkit/tools/scan.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult, ApiAccessState } from "../../../src/toolkit/sdk-bridge.js";
import type { ScanPost } from "../../../src/toolkit/types.js";

function makePost(overrides: { agree?: number; disagree?: number; textLength?: number; reactionsKnown?: boolean }): ScanPost {
  return {
    txHash: "0xtest",
    author: "demos1abc",
    category: "ANALYSIS",
    timestamp: Date.now(),
    reactions: { agree: overrides.agree ?? 0, disagree: overrides.disagree ?? 0 },
    reactionsKnown: overrides.reactionsKnown ?? true,
    text: "x".repeat(overrides.textLength ?? 200),
    tags: [],
  };
}

function createMockBridge(posts: ScanPost[]): SdkBridge {
  return {
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({ ok: false, status: 0, data: "chain-only" })),
    attestDahr: vi.fn(async () => ({ responseHash: "", txHash: "", data: null, url: "" })),
    publishHivePost: vi.fn(async () => ({ txHash: "" })),
    transferDem: vi.fn(async () => ({ txHash: "" })),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "" })),
    getDemos: vi.fn(() => ({}) as any),
    apiAccess: "none" as ApiAccessState,
    verifyTransaction: vi.fn(async () => null),
    getHivePosts: vi.fn(async () => posts),
    resolvePostAuthor: vi.fn(async () => null),
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

  it("post with exactly 5 total reactions is NOT a reply opportunity", async () => {
    const posts = [makePost({ agree: 3, disagree: 2, textLength: 200 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 4 total reactions and 101 chars IS a reply opportunity", async () => {
    const posts = [makePost({ agree: 2, disagree: 2, textLength: 101 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(1);
    expect(result.data!.opportunities[0].type).toBe("reply");
  });

  it("post with 4 total reactions and exactly 100 chars is NOT an opportunity", async () => {
    const posts = [makePost({ agree: 2, disagree: 2, textLength: 100 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 4 total reactions and 99 chars is NOT an opportunity", async () => {
    const posts = [makePost({ agree: 4, disagree: 0, textLength: 99 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });

  it("post with 0 reactions and long text IS a reply opportunity", async () => {
    const posts = [makePost({ agree: 0, disagree: 0, textLength: 500 })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(1);
  });

  it("chain-only post (reactionsKnown: false) with long text IS a content opportunity", async () => {
    const posts = [makePost({ textLength: 200, reactionsKnown: false })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(1);
    expect(result.data!.opportunities[0].reason).toContain("unavailable");
  });

  it("chain-only post (reactionsKnown: false) with short text is NOT an opportunity", async () => {
    const posts = [makePost({ textLength: 50, reactionsKnown: false })];
    const bridge = createMockBridge(posts);
    const session = createTestSession(tempDir, bridge);

    const result = await scan(session);
    expect(result.ok).toBe(true);
    expect(result.data!.opportunities).toHaveLength(0);
  });
});
