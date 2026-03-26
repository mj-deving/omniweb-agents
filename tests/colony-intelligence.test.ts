import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, existsSync, rmSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  analyzeColony,
  persistColony,
  loadColony,
  type AgentProfile,
  type RelationshipEdge,
  type ColonySnapshot,
} from "../src/lib/colony-intelligence.js";

// ── Helpers ──────────────────────────────────────

function makePost(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    txHash: "0x" + Math.random().toString(16).slice(2, 10),
    author: "0xAgent1",
    timestamp: Date.now(),
    score: 80,
    reactions: { agree: 5, disagree: 1 },
    payload: {
      text: "Bitcoin price analysis shows bullish momentum.",
      tags: ["bitcoin", "analysis"],
      assets: ["BTC"],
      cat: "ANALYSIS",
      sourceAttestations: [{ source: "coingecko", url: "https://api.coingecko.com" }],
    },
    replyTo: undefined,
    ...overrides,
  };
}

// ── analyzeColony ───────────────────────────────

describe("analyzeColony", () => {
  it("returns valid ColonySnapshot from mixed feed data", () => {
    const posts = [
      makePost({ author: "0xAlpha", timestamp: 1710000000000 }),
      makePost({ author: "0xAlpha", timestamp: 1710001000000, payload: { text: "ETH update", tags: ["ethereum"], assets: ["ETH"], cat: "ANALYSIS", sourceAttestations: [{ source: "coingecko" }] } }),
      makePost({ author: "0xBeta", timestamp: 1710002000000, score: 90, payload: { text: "Macro outlook looks bearish", tags: ["macro"], assets: [], cat: "PREDICTION", sourceAttestations: [] } }),
      makePost({ author: "0xGamma", timestamp: 1710003000000, score: 60, payload: { text: "Question about DeFi", tags: ["defi"], assets: [], cat: "QUESTION" } }),
    ];

    const snapshot = analyzeColony(posts);

    expect(snapshot).toBeDefined();
    expect(snapshot.agents).toBeInstanceOf(Map);
    expect(snapshot.agents.size).toBe(3); // Alpha, Beta, Gamma
    expect(snapshot.feedSize).toBe(4);
    expect(snapshot.timestamp).toBeGreaterThan(0);

    // Alpha: 2 posts
    const alpha = snapshot.agents.get("0xalpha");
    expect(alpha).toBeDefined();
    expect(alpha!.postCount).toBe(2);
    expect(alpha!.address).toBe("0xalpha");
    expect(alpha!.topics.length).toBeGreaterThan(0);
    expect(alpha!.lastSeen).toBe(1710001000000);

    // Beta: 1 post, higher score
    const beta = snapshot.agents.get("0xbeta");
    expect(beta).toBeDefined();
    expect(beta!.postCount).toBe(1);
    expect(beta!.avgScore).toBe(90);

    // Gamma: 1 post, no attestation
    const gamma = snapshot.agents.get("0xgamma");
    expect(gamma).toBeDefined();
    expect(gamma!.attestationRate).toBe(0);
  });

  it("extracts topic distribution per agent", () => {
    const posts = [
      makePost({ author: "0xAlpha", payload: { text: "BTC analysis", tags: ["bitcoin", "price"], assets: ["BTC"], cat: "ANALYSIS", sourceAttestations: [{ source: "x" }] } }),
      makePost({ author: "0xAlpha", payload: { text: "ETH analysis", tags: ["ethereum", "defi"], assets: ["ETH"], cat: "ANALYSIS", sourceAttestations: [{ source: "x" }] } }),
      makePost({ author: "0xAlpha", payload: { text: "More BTC", tags: ["bitcoin"], assets: ["BTC"], cat: "PREDICTION", sourceAttestations: [{ source: "x" }] } }),
    ];

    const snapshot = analyzeColony(posts);
    const alpha = snapshot.agents.get("0xalpha")!;

    // Should have bitcoin and ethereum topics
    expect(alpha.topics).toContain("bitcoin");
    expect(alpha.topics).toContain("ethereum");
  });

  it("identifies reply relationships between agents", () => {
    const parentPost = makePost({ txHash: "0xParent123", author: "0xAlpha" });
    const replyPost = makePost({ author: "0xBeta", replyTo: "0xParent123" });

    const posts = [parentPost, replyPost];
    const snapshot = analyzeColony(posts);

    // Should have a relationship from Beta → Alpha
    expect(snapshot.relationships.length).toBeGreaterThan(0);
    const betaToAlpha = snapshot.relationships.find(
      r => r.source === "0xbeta" && r.target === "0xalpha"
    );
    expect(betaToAlpha).toBeDefined();
    expect(betaToAlpha!.interactions).toBe(1);
    expect(betaToAlpha!.types).toContain("reply");
  });

  it("returns valid empty snapshot for empty feed", () => {
    const snapshot = analyzeColony([]);

    expect(snapshot.agents.size).toBe(0);
    expect(snapshot.relationships).toEqual([]);
    expect(snapshot.feedSize).toBe(0);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it("handles posts with missing fields gracefully", () => {
    const posts = [
      { txHash: "0x1", author: "0xA", timestamp: Date.now(), score: 50 },
      { txHash: "0x2", author: "0xB" },
      makePost({ author: "0xC" }),
    ];

    const snapshot = analyzeColony(posts);
    expect(snapshot.agents.size).toBeGreaterThan(0);
    expect(snapshot.feedSize).toBe(3);
  });
});

// ── Persistence ─────────────────────────────────

describe("colony persistence", () => {
  const testDir = resolve(tmpdir(), `colony-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("persistColony writes and loadColony reads back identical data", () => {
    const posts = [
      makePost({ author: "0xAlpha", timestamp: 1710000000000 }),
      makePost({ author: "0xBeta", timestamp: 1710001000000, replyTo: undefined }),
    ];

    const original = analyzeColony(posts);
    const filePath = resolve(testDir, "colony-state.json");

    persistColony(original, filePath);

    expect(existsSync(filePath)).toBe(true);

    const loaded = loadColony(filePath);
    expect(loaded.agents.size).toBe(original.agents.size);
    expect(loaded.feedSize).toBe(original.feedSize);
    expect(loaded.relationships.length).toBe(original.relationships.length);

    // Deep check one agent
    const origAlpha = original.agents.get("0xalpha");
    const loadedAlpha = loaded.agents.get("0xalpha");
    expect(loadedAlpha).toBeDefined();
    expect(loadedAlpha!.postCount).toBe(origAlpha!.postCount);
    expect(loadedAlpha!.avgScore).toBe(origAlpha!.avgScore);
  });

  it("loadColony returns empty snapshot for non-existent file", () => {
    const loaded = loadColony(resolve(testDir, "nonexistent.json"));

    expect(loaded.agents.size).toBe(0);
    expect(loaded.relationships).toEqual([]);
    expect(loaded.feedSize).toBe(0);
  });

  it("loadColony returns empty snapshot for corrupt JSON file", () => {
    const corruptPath = resolve(testDir, "corrupt.json");
    const { writeFileSync } = require("node:fs");
    writeFileSync(corruptPath, "{ this is not valid json !!!", "utf-8");

    const loaded = loadColony(corruptPath);
    expect(loaded.agents.size).toBe(0);
    expect(loaded.relationships).toEqual([]);
    expect(loaded.feedSize).toBe(0);
  });

  it("persistColony creates parent directories if needed", () => {
    const deepPath = resolve(testDir, "nested", "deep", "colony-state.json");
    const snapshot = analyzeColony([]);

    persistColony(snapshot, deepPath);
    expect(existsSync(deepPath)).toBe(true);
  });
});
