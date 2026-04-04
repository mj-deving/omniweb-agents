import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readSSESense, type SSESenseResult } from "../../cli/sse-sense-adapter.js";
import { type ColonyDatabase } from "../../src/toolkit/colony/schema.js";
import { getPost } from "../../src/toolkit/colony/posts.js";
import { createTestDb } from "../helpers/colony-test-utils.js";

// ── Test helpers ──────────────────────────────────

function mockApiCall(response: { ok: boolean; data?: unknown }) {
  return vi.fn().mockResolvedValue(response);
}

function mockObserve() {
  return vi.fn();
}

function makePost(txHash: string, author = "0xAgent1", text = "Test post") {
  return { txHash, author, timestamp: Date.now(), text, category: "ANALYSIS" };
}

// ── Tests ─────────────────────────────────────────

describe("readSSESense", () => {
  let db: ColonyDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("returns skipped when API not available", async () => {
    const api = mockApiCall({ ok: false });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.source).toBe("skipped");
    expect(result.postsReceived).toBe(0);
    expect(result.postsIngested).toBe(0);
  });

  it("ingests valid posts into colony DB", async () => {
    const posts = [makePost("0xABC"), makePost("0xDEF")];
    const api = mockApiCall({ ok: true, data: { posts } });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.postsReceived).toBe(2);
    expect(result.postsIngested).toBe(2);
    expect(result.source).toBe("poll-fallback");
    expect(getPost(db, "0xABC")).toBeTruthy();
    expect(getPost(db, "0xDEF")).toBeTruthy();
  });

  it("deduplicates posts already in DB", async () => {
    const posts = [makePost("0xABC")];
    const api = mockApiCall({ ok: true, data: { posts } });

    // First read
    await readSSESense(db, api, mockObserve());
    // Second read — same post
    const result = await readSSESense(db, api, mockObserve());

    expect(result.postsReceived).toBe(1);
    expect(result.postsIngested).toBe(0); // Already exists
  });

  it("skips invalid posts without crashing", async () => {
    const posts = [
      { txHash: "", author: "0x1", timestamp: 123, text: "no hash" },
      { invalid: true },
      makePost("0xVALID"),
    ];
    const api = mockApiCall({ ok: true, data: { posts } });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.postsReceived).toBe(1); // Only valid post counted
    expect(result.postsIngested).toBe(1);
  });

  it("respects maxEvents cap", async () => {
    const posts = Array.from({ length: 10 }, (_, i) => makePost(`0x${i}`));
    const api = mockApiCall({ ok: true, data: { posts } });
    const result = await readSSESense(db, api, mockObserve(), { maxEvents: 3 });

    expect(result.postsReceived).toBeLessThanOrEqual(3);
    expect(result.postsIngested).toBeLessThanOrEqual(3);
  });

  it("handles empty feed response", async () => {
    const api = mockApiCall({ ok: true, data: { posts: [] } });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.postsReceived).toBe(0);
    expect(result.postsIngested).toBe(0);
    expect(result.source).toBe("poll-fallback");
  });

  it("handles API error gracefully", async () => {
    const api = vi.fn().mockRejectedValue(new Error("Network error"));
    const observe = mockObserve();
    const result = await readSSESense(db, api, observe);

    expect(result.source).toBe("skipped");
    expect(observe).toHaveBeenCalledWith("warning", expect.stringContaining("Network error"), expect.any(Object));
  });

  it("reports elapsed time", async () => {
    const api = mockApiCall({ ok: true, data: { posts: [] } });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.elapsedMs).toBeLessThan(5000);
  });

  it("handles flat array response (no posts wrapper)", async () => {
    const posts = [makePost("0xFLAT")];
    const api = mockApiCall({ ok: true, data: posts });
    const result = await readSSESense(db, api, mockObserve());

    expect(result.postsReceived).toBe(1);
    expect(result.postsIngested).toBe(1);
  });
});
