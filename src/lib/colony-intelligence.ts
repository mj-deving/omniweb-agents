/**
 * Colony Intelligence — maps the SuperColony feed to track active agents,
 * their posting patterns, topic preferences, and inter-agent relationships.
 *
 * Pure library: no SDK imports, no side effects. Operates on raw feed post arrays.
 * Persistence via simple JSON files in ~/.{agent}/ directories.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ── Types ──────────────────────────────────────

export interface AgentProfile {
  address: string;
  postCount: number;
  avgScore: number;
  attestationRate: number;
  /** Most frequent tags across all posts */
  topics: string[];
  /** Unix ms timestamp of most recent post */
  lastSeen: number;
  /** Category distribution: { ANALYSIS: 3, PREDICTION: 1, ... } */
  categories: Record<string, number>;
}

export interface RelationshipEdge {
  /** The agent initiating the interaction (replier/tipper) */
  source: string;
  /** The agent receiving the interaction (post author) */
  target: string;
  /** Total number of interactions */
  interactions: number;
  /** Types of interaction observed */
  types: Array<"reply" | "tip" | "agree" | "disagree">;
  /** Unix ms timestamp of most recent interaction */
  lastInteraction: number;
}

export interface ColonySnapshot {
  /** Agent profiles keyed by lowercase address */
  agents: Map<string, AgentProfile>;
  /** Directed relationship edges between agents */
  relationships: RelationshipEdge[];
  /** Unix ms timestamp when snapshot was created */
  timestamp: number;
  /** Total number of posts analyzed */
  feedSize: number;
}

// ── Serialization types (JSON-safe) ────────────

interface SerializedSnapshot {
  agents: Array<[string, AgentProfile]>;
  relationships: RelationshipEdge[];
  timestamp: number;
  feedSize: number;
}

// ── Core Analysis ──────────────────────────────

/**
 * Analyze a feed of raw posts and produce a ColonySnapshot.
 *
 * Accepts the raw post shape from the SuperColony API:
 *   { txHash, author, timestamp, score, reactions, payload: { text, tags, assets, cat, sourceAttestations }, replyTo? }
 *
 * Handles missing fields gracefully — every field is optional except txHash/author.
 */
export function analyzeColony(posts: any[]): ColonySnapshot {
  const agentAcc = new Map<string, {
    totalScore: number;
    postCount: number;
    attestedCount: number;
    tagCounts: Map<string, number>;
    categories: Map<string, number>;
    lastSeen: number;
  }>();

  // txHash → author mapping for reply resolution
  const txToAuthor = new Map<string, string>();

  // First pass: build agent profiles + tx→author map
  for (const post of posts) {
    const author = (post.author || post.address || "").toLowerCase();
    if (!author) continue;

    const txHash = post.txHash || "";
    if (txHash) txToAuthor.set(txHash, author);

    const score = typeof post.score === "number" ? post.score : 0;
    const timestamp = typeof post.timestamp === "number" ? post.timestamp : 0;
    const payload = post.payload || {};
    const tags: string[] = Array.isArray(payload.tags) ? payload.tags : [];
    const category: string = payload.cat || "";
    const hasAttestation = Array.isArray(payload.sourceAttestations)
      ? payload.sourceAttestations.length > 0
      : false;

    const current = agentAcc.get(author) || {
      totalScore: 0,
      postCount: 0,
      attestedCount: 0,
      tagCounts: new Map<string, number>(),
      categories: new Map<string, number>(),
      lastSeen: 0,
    };

    current.totalScore += score;
    current.postCount += 1;
    current.attestedCount += hasAttestation ? 1 : 0;
    current.lastSeen = Math.max(current.lastSeen, timestamp);

    for (const tag of tags) {
      const t = tag.toLowerCase();
      current.tagCounts.set(t, (current.tagCounts.get(t) || 0) + 1);
    }

    if (category) {
      current.categories.set(category, (current.categories.get(category) || 0) + 1);
    }

    agentAcc.set(author, current);
  }

  // Build AgentProfile map
  const agents = new Map<string, AgentProfile>();
  for (const [address, acc] of agentAcc.entries()) {
    const avgScore = acc.postCount > 0 ? +(acc.totalScore / acc.postCount).toFixed(1) : 0;
    const attestationRate = acc.postCount > 0 ? +(acc.attestedCount / acc.postCount).toFixed(3) : 0;

    // Top tags by frequency
    const sortedTags = [...acc.tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    const categories: Record<string, number> = {};
    for (const [cat, count] of acc.categories.entries()) {
      categories[cat] = count;
    }

    agents.set(address, {
      address,
      postCount: acc.postCount,
      avgScore,
      attestationRate,
      topics: sortedTags,
      lastSeen: acc.lastSeen,
      categories,
    });
  }

  // Second pass: extract relationships from replies
  const edgeKey = (src: string, tgt: string) => `${src}→${tgt}`;
  const edgeMap = new Map<string, RelationshipEdge>();

  for (const post of posts) {
    const replyTo = post.replyTo;
    if (!replyTo) continue;

    const source = (post.author || post.address || "").toLowerCase();
    if (!source) continue;

    const target = txToAuthor.get(replyTo);
    if (!target || target === source) continue; // skip self-replies

    const key = edgeKey(source, target);
    const existing = edgeMap.get(key);
    const timestamp = typeof post.timestamp === "number" ? post.timestamp : Date.now();

    if (existing) {
      existing.interactions += 1;
      existing.lastInteraction = Math.max(existing.lastInteraction, timestamp);
      if (!existing.types.includes("reply")) existing.types.push("reply");
    } else {
      edgeMap.set(key, {
        source,
        target,
        interactions: 1,
        types: ["reply"],
        lastInteraction: timestamp,
      });
    }
  }

  return {
    agents,
    relationships: [...edgeMap.values()],
    timestamp: Date.now(),
    feedSize: posts.length,
  };
}

// ── Persistence ────────────────────────────────

/**
 * Write a ColonySnapshot to disk as JSON.
 * Creates parent directories if needed.
 */
export function persistColony(snapshot: ColonySnapshot, filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const serialized: SerializedSnapshot = {
    agents: [...snapshot.agents.entries()],
    relationships: snapshot.relationships,
    timestamp: snapshot.timestamp,
    feedSize: snapshot.feedSize,
  };

  writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
}

/**
 * Load a ColonySnapshot from disk.
 * Returns an empty snapshot if the file doesn't exist.
 */
export function loadColony(filePath: string): ColonySnapshot {
  if (!existsSync(filePath)) {
    return {
      agents: new Map(),
      relationships: [],
      timestamp: 0,
      feedSize: 0,
    };
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as SerializedSnapshot;
  return {
    agents: new Map(raw.agents),
    relationships: raw.relationships,
    timestamp: raw.timestamp,
    feedSize: raw.feedSize,
  };
}
