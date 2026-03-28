#!/usr/bin/env npx tsx
/**
 * Confidence Gate Checker — Sentinel Phase 2 tool
 *
 * Maps to strategy.yaml GATE phase (6+1 item checklist).
 * Automates checkable items, marks manual items as MANUAL in output.
 * No interactive prompts — pure CLI, fully agentic.
 *
 * Usage:
 *   npx tsx tools/gate.ts --topic TEXT [--text TEXT] [--category TEXT] [--confidence N] [--env PATH] [--pretty] [--json]
 */

import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { connectWallet, info, setLogAgent } from "../src/lib/network/sdk.js";
import { createSdkBridge, AUTH_PENDING_TOKEN } from "../src/toolkit/sdk-bridge.js";
import { resolveAgentName, loadAgentConfig } from "../src/lib/agent-config.js";

// ── Arg Parsing ────────────────────────────────────

function parseArgs(): { flags: Record<string, string> } {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    }
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }

  return { flags };
}

function printHelp(): void {
  console.log(`
Confidence Gate Checker — Agent GATE phase tool

USAGE:
  npx tsx tools/gate.ts --topic TEXT [flags]

FLAGS:
  --agent NAME       Agent name (default: sentinel)
  --topic TEXT        Topic to check (required)
  --text TEXT         Post text to check length (optional)
  --category TEXT     Post category (ANALYSIS/PREDICTION/OPINION; pioneer also allows QUESTION)
  --confidence N      Confidence value 0-100 (optional)
  --reply-to TX_HASH  Parent post txHash (checks reply target reactions)
  --scan-cache PATH   Path to session state JSON with scan rawPosts cache
  --scan-trusted       Skip topic activity check (topic came from scan's topic extraction)
  --env PATH          Path to .env file (default: .env in cwd)
  --pretty            Human-readable formatted output
  --json              Compact single-line JSON output
  --help, -h          Show this help

GATE ITEMS (from strategy.yaml):
  1. Topic activity / signal strength [AUTO — mode-dependent (standard/pioneer)]
  2. Unique data                     [MANUAL — operator confirms]
  3. Agent reference / novelty       [MANUAL or AUTO — mode-dependent]
  4. Category policy                 [AUTO — checks --category]
  5. >200 chars + confidence set     [AUTO — checks --text + --confidence]
  6. Not duplicate                   [AUTO — searches own posts; window from gate.duplicateWindowHours]
  7. Reply target reactions           [AUTO — checks --reply-to parent, if provided]

EXAMPLES:
  npx tsx tools/gate.ts --topic "bitcoin" --pretty
  npx tsx tools/gate.ts --topic "oil-prices" --text "My analysis of..." --category ANALYSIS --confidence 85 --pretty
  npx tsx tools/gate.ts --topic "eth-staking" --json
`);
}

// ── Types ──────────────────────────────────────────

type GateStatus = "pass" | "fail" | "manual" | "warning";

interface GateItem {
  number: number;
  name: string;
  status: GateStatus;
  detail: string;
}

interface GateResult {
  timestamp: string;
  topic: string;
  items: GateItem[];
  summary: {
    pass: number;
    fail: number;
    manual: number;
    warning: number;
    total: number;
    recommendation: string;
  };
}

type GateMode = "standard" | "pioneer";

/**
 * Pioneer Gate 1: signal strength threshold from scan phase output.
 * Uses explicit scan.signal.score when present, otherwise heuristic fallback.
 */
function checkSignalStrength(
  topic: string,
  scanResult: any | undefined,
  signalStrengthThreshold: number,
  focusTopics: string[] = []
): GateItem {
  const threshold = Number.isFinite(signalStrengthThreshold) ? signalStrengthThreshold : 6;

  if (!scanResult || typeof scanResult !== "object") {
    return {
      number: 1,
      name: "Signal strength",
      status: "fail",
      detail: "No scan context provided — cannot compute pioneer signal score",
    };
  }

  const explicitScoreCandidates = [
    scanResult?.signal?.score,
    scanResult?.signals?.score,
    scanResult?.signalScore,
  ];
  for (const raw of explicitScoreCandidates) {
    const score = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(score)) {
      return {
        number: 1,
        name: "Signal strength",
        status: score >= threshold ? "pass" : "fail",
        detail: `Signal score ${score}/${threshold} from scan output`,
      };
    }
  }

  // Heuristic fallback for current scan-feed output shape.
  // Pioneer should reward *opportunity* (novel/underexplored topics) rather
  // than requiring swarm activity to already be high.
  let score = 0;
  const reasons: string[] = [];
  const topicLower = topic.toLowerCase();
  const now = Date.now();

  const topicTokens = new Set(topicLower.split(/[^a-z0-9]+/).filter((t) => t.length >= 2));
  const focusLower = Array.isArray(focusTopics) ? focusTopics.map((t) => String(t).toLowerCase()) : [];
  const focusTokens = new Set(
    focusLower.flatMap((ft) => ft.split(/[^a-z0-9]+/)).filter((t) => t.length >= 2)
  );

  let focusOverlap = 0;
  for (const tok of topicTokens) {
    if (focusTokens.has(tok)) focusOverlap++;
  }
  if (focusLower.includes(topicLower)) {
    score += 2;
    reasons.push("focus=2");
  } else if (focusOverlap > 0) {
    score += 1;
    reasons.push("focus=1");
  }

  // Topic-level opportunity signal from scan.topicIndex
  const topicIndex = scanResult?.topicIndex && typeof scanResult.topicIndex === "object"
    ? scanResult.topicIndex
    : {};

  // Exact key first, then fuzzy token overlap fallback.
  let topicStats: any = topicIndex[topicLower];
  if (!topicStats) {
    const entries = Object.entries(topicIndex);
    let best: { key: string; overlap: number; stats: any } | null = null;
    for (const [key, stats] of entries) {
      const keyTokens = String(key).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
      let overlap = 0;
      for (const tok of keyTokens) {
        if (topicTokens.has(tok)) overlap++;
      }
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { key: String(key), overlap, stats };
      }
    }
    if (best) topicStats = best.stats;
  }

  const topicCount = Number(topicStats?.count || 0);
  const topicReactions = Number(topicStats?.totalReactions || 0);
  const topicAttested = Number(topicStats?.attestedCount || 0);
  const topicNewestTs = Number(topicStats?.newestTimestamp || 0);
  const topicUniqueAuthors = Array.isArray(topicStats?.uniqueAuthors) ? topicStats.uniqueAuthors.length : 0;

  if (topicCount > 0) {
    // Underexplored topics are exactly pioneer opportunity.
    if (topicCount <= 2) {
      score += 3;
      reasons.push("underexplored=3");
    } else if (topicCount <= 5) {
      score += 2;
      reasons.push("underexplored=2");
    } else if (topicCount <= 10) {
      score += 1;
      reasons.push("underexplored=1");
    }

    // High reactions per mention = demand signal even when coverage is low.
    const reactionDensity = topicCount > 0 ? topicReactions / topicCount : 0;
    if (reactionDensity >= 12) {
      score += 2;
      reasons.push("reaction-density=2");
    } else if (reactionDensity >= 5) {
      score += 1;
      reasons.push("reaction-density=1");
    }

    // Missing attestations indicate verification opportunity.
    if (topicCount > 0) {
      const attestationRate = topicAttested / topicCount;
      if (topicAttested === 0) {
        score += 2;
        reasons.push("attestation-gap=2");
      } else if (attestationRate < 0.5) {
        score += 1;
        reasons.push("attestation-gap=1");
      }
    }

    // Fresh topic signal.
    const ageMs = topicNewestTs > 0 ? now - topicNewestTs : Number.POSITIVE_INFINITY;
    if (ageMs <= 6 * 60 * 60 * 1000) {
      score += 2;
      reasons.push("recency=2");
    } else if (ageMs <= 24 * 60 * 60 * 1000) {
      score += 1;
      reasons.push("recency=1");
    }

    // Mild reward for independent contributors, but don't require swarm.
    if (topicUniqueAuthors >= 4) {
      score += 1;
      reasons.push("source-diversity=1");
    }
  } else {
    // Unknown topic in index: frontier candidate.
    score += 2;
    reasons.push("frontier-unknown=2");
  }

  // Keep a small global-throughput bonus, but no longer dominant.
  const postsPerHour = Number(scanResult?.activity?.posts_per_hour || 0);
  if (postsPerHour >= 8) {
    score += 1;
    reasons.push("global-throughput=1");
  }

  // Legacy convergence can still contribute slightly.
  const convergenceAgents = Number(scanResult?.convergence?.agent_count || 0);
  if (convergenceAgents >= 3) {
    score += 1;
    reasons.push("convergence=1");
  }

  const gapTopics: string[] = Array.isArray(scanResult?.gaps?.topics)
    ? scanResult.gaps.topics.map((t: string) => String(t).toLowerCase())
    : [];
  if (gapTopics.includes(topicLower)) {
    score += 1;
    reasons.push("topic-gap=1");
  }

  const heatTopic = String(scanResult?.heat?.topic || "").toLowerCase();
  const heatReactions = Number(scanResult?.heat?.reactions || 0);
  if (heatTopic && heatTopic === topicLower) {
    const heatPoints = heatReactions >= 10 ? 1 : 0;
    score += heatPoints;
    if (heatPoints > 0) reasons.push(`topic-heat=${heatPoints}`);
  }

  const detail = reasons.length > 0
    ? `Heuristic signal score ${score}/${threshold} (${reasons.join(", ")})`
    : `Heuristic signal score ${score}/${threshold} (no signal components found)`;

  return {
    number: 1,
    name: "Signal strength",
    status: score >= threshold ? "pass" : "fail",
    detail,
  };
}

/**
 * Pioneer Gate 3: novelty check (topic mentions in last 50 feed posts).
 * Passes when mentions are below threshold (default: <3).
 */
  return {
    number: 2,
    name: "Unique data",
    status: "manual",
    detail: "MANUAL — do you have data no one else has attested?",
  };
}

/**
 * Gate 3: Agent reference — MANUAL check.
 */
function checkAgentReference(): GateItem {
  return {
    number: 3,
    name: "Agent reference",
    status: "manual",
    detail: "MANUAL — which agent(s) will you cite?",
  };
}

/**
 * Gate 4: Category policy.
 * Standard mode: ANALYSIS or PREDICTION.
 * Pioneer mode: ANALYSIS, PREDICTION, or QUESTION.
 */
function checkCategory(category: string | undefined, mode: GateMode): GateItem {
  const allowed = mode === "pioneer"
    ? ["ANALYSIS", "PREDICTION", "QUESTION", "OPINION"]
    : ["ANALYSIS", "PREDICTION", "OPINION"];

  if (!category) {
    return {
      number: 4,
      name: "Category",
      status: "warning",
      detail: `Not provided (use --category ${allowed.join(" or ")})`,
    };
  }
  const upper = category.toUpperCase();
  if (allowed.includes(upper)) {
    return {
      number: 4,
      name: "Category",
      status: "pass",
      detail: `${upper} (strategic policy compliance)`,
    };
  }
  return {
    number: 4,
    name: "Category",
    status: "fail",
    detail: `"${category}" is not one of ${allowed.join(", ")}`,
  };
}

/**
 * Gate 5: Text >200 chars + confidence set.
 */
function checkTextAndConfidence(text?: string, confidence?: string): GateItem {
  const issues: string[] = [];

  if (!text) {
    issues.push("text not provided (use --text)");
  } else if (text.length <= 200) {
    issues.push(`text is ${text.length} chars (need >200)`);
  }

  if (!confidence) {
    issues.push("confidence not provided (use --confidence)");
  } else {
    if (!/^\d+$/.test(confidence)) {
      issues.push(`confidence "${confidence}" invalid (need integer 0-100)`);
    } else {
      const val = Number(confidence);
      if (val < 0 || val > 100) {
        issues.push(`confidence ${val} out of range (need 0-100)`);
      }
    }
  }

  if (issues.length > 0) {
    if (!text && !confidence) {
      return { number: 5, name: "Text + confidence", status: "warning", detail: issues.join("; ") };
    }
    return { number: 5, name: "Text + confidence", status: "fail", detail: issues.join("; ") };
  }

  return {
    number: 5,
    name: "Text + confidence",
    status: "pass",
    detail: `${text!.length} chars, confidence ${confidence}`,
  };
}

/**
 * Gate 6: Not a duplicate of own recent posts.
 * Uses author feed (search API lacks author filter). Retries once on 502.
 */

function prettyPrint(result: GateResult): void {
  console.log(`\nGATE — Confidence Checklist for "${result.topic}"\n`);

  for (const item of result.items) {
    let icon: string;
    switch (item.status) {
      case "pass": icon = "✅"; break;
      case "fail": icon = "❌"; break;
      case "manual": icon = "❓"; break;
      case "warning": icon = "⚠️ "; break;
    }
    console.log(`  ${icon} ${item.number}. ${item.name}: ${item.detail}`);
  }

  const s = result.summary;
  console.log(`\n  RESULT: ${s.pass}/${s.total} pass, ${s.fail} fail, ${s.manual} manual, ${s.warning} warning`);
  console.log(`  ${s.recommendation}\n`);
}

// ── Main ───────────────────────────────────────────

async function main(): Promise<void> {
  const { flags } = parseArgs();

  const agentName = resolveAgentName(flags);
  setLogAgent(agentName);
  const config = loadAgentConfig(agentName);
  const topic = flags["topic"];
  if (!topic) {
    console.error("[gate] ERROR: --topic is required");
    process.exit(1);
  }

  const envPath = flags["env"] || resolve(process.cwd(), ".env");
  const text = flags["text"];
  const category = flags["category"];
  const confidence = flags["confidence"];
  const replyTo = flags["reply-to"];
  const scanCachePath = flags["scan-cache"];
  const scanTrusted = flags["scan-trusted"] === "true";
  const mode: GateMode = config.gate.mode === "pioneer" ? "pioneer" : "standard";

  // Load cached scan payload/posts if available
  let scanResult: any | undefined;
  let cachedPosts: any[] | undefined;
  if (scanCachePath) {
    try {
      const stateData = JSON.parse(readFileSync(resolve(scanCachePath), "utf-8"));
      scanResult = stateData?.phases?.scan?.result ?? stateData?.phases?.sense?.result ?? stateData?.scan ?? stateData;
      cachedPosts = Array.isArray(scanResult?.rawPosts) ? scanResult.rawPosts : undefined;
      if (cachedPosts) {
        info(`Loaded ${cachedPosts.length} cached posts from scan phase`);
      }
    } catch {
      info("Could not load scan cache — will use API only");
    }
  }

  // Connect wallet — chain-only, no API auth needed
  const { demos, address } = await connectWallet(envPath);
  const bridge = createSdkBridge(demos, undefined, AUTH_PENDING_TOKEN);

  // Fetch chain posts once for all gate checks
  const chainPosts = await bridge.getHivePosts(100);

  // Run gate checks
  info("Running gate checks...");
  const items: GateItem[] = [];

  // Chain-based topic activity check (replaces API search)
  function checkTopicActivityChain(topicStr: string): GateItem {
    if (scanTrusted) {
      return { number: 1, name: "Topic activity", status: "pass", detail: "Scan-trusted topic (activity validated during scan phase)" };
    }
    const topicLower = topicStr.toLowerCase();
    const matches = chainPosts.filter(p =>
      p.tags?.some(t => t.toLowerCase().includes(topicLower)) ||
      p.text.toLowerCase().includes(topicLower)
    );
    if (matches.length >= 3) {
      return { number: 1, name: "Topic activity", status: "pass", detail: `${matches.length} posts found on chain (threshold: 3)` };
    }
    return { number: 1, name: "Topic activity", status: "fail", detail: `Only ${matches.length} posts found on chain for "${topicStr}" (need ≥3)` };
  }

  // Chain-based novelty check
  function checkTopicNoveltyChain(topicStr: string, threshold: number): GateItem {
    const topicLower = topicStr.toLowerCase();
    const mentions = chainPosts.filter(p =>
      p.tags?.some(t => t.toLowerCase().includes(topicLower)) ||
      p.text.toLowerCase().includes(topicLower)
    );
    if (mentions.length <= threshold) {
      return { number: 3, name: "Novelty", status: "pass", detail: `${mentions.length} existing mentions (threshold: ${threshold})` };
    }
    return { number: 3, name: "Novelty", status: "warning", detail: `${mentions.length} mentions exceed novelty threshold (${threshold})` };
  }

  // Chain-based duplicate check (uses session log + chain posts)
  function checkDuplicateChain(topicStr: string, authorAddr: string, windowHours: number): GateItem {
    const topicLower = topicStr.toLowerCase();
    const windowMs = windowHours * 60 * 60 * 1000;
    const windowStart = Date.now() - windowMs;
    const myPosts = chainPosts.filter(p => p.author === authorAddr);
    const duplicates = myPosts.filter(p => {
      const ts = typeof p.timestamp === "number" ? p.timestamp * (p.timestamp < 1e12 ? 1000 : 1) : 0;
      if (ts < windowStart) return false;
      return p.tags?.some(t => t.toLowerCase().includes(topicLower)) ?? false;
    });
    if (duplicates.length === 0) {
      return { number: 6, name: "Not duplicate", status: "pass", detail: `No posts on "${topicStr}" in last ${windowHours}h` };
    }
    return { number: 6, name: "Not duplicate", status: "fail", detail: `${duplicates.length} post(s) on "${topicStr}" in last ${windowHours}h` };
  }

  // Chain-based reply target check
  async function checkReplyTargetChain(replyToHash: string, minReactions: number): Promise<GateItem> {
    const reactionMap = await bridge.getHiveReactions([replyToHash]);
    const rx = reactionMap.get(replyToHash);
    const reactions = rx ? rx.agree + rx.disagree : 0;
    if (reactions >= minReactions) {
      return { number: 7, name: "Reply target", status: "pass", detail: `Parent has ${reactions} reactions (threshold: ${minReactions})` };
    }
    return { number: 7, name: "Reply target", status: "fail", detail: `Parent has ${reactions} reactions (need ≥${minReactions})` };
  }

  const gate1Promise = mode === "pioneer"
    ? Promise.resolve(
        checkSignalStrength(
          topic,
          scanResult,
          config.gate.signalStrengthThreshold ?? 6,
          [...config.topics.primary, ...config.topics.secondary]
        )
      )
    : Promise.resolve(checkTopicActivityChain(topic));

  const gate3Promise = mode === "pioneer"
    ? (config.gate.noveltyCheck === false
      ? Promise.resolve<GateItem>({
          number: 3,
          name: "Novelty",
          status: "manual",
          detail: "MANUAL — noveltyCheck disabled in gate config",
        })
      : Promise.resolve(checkTopicNoveltyChain(topic, config.gate.noveltyMentionThreshold ?? 3)))
    : Promise.resolve(checkAgentReference());

  const duplicatePromise = Promise.resolve(checkDuplicateChain(topic, address, config.gate.duplicateWindowHours));
  const replyPromise = replyTo
    ? checkReplyTargetChain(replyTo, config.engagement.replyMinParentReactions)
    : Promise.resolve<GateItem | null>(null);

  const [gate1, gate3, duplicate, replyTarget] = await Promise.all([
    gate1Promise,
    gate3Promise,
    duplicatePromise,
    replyPromise,
  ]);

  items.push(gate1);
  items.push(checkUniqueData());
  items.push(gate3);
  items.push(checkCategory(category, mode));
  items.push(checkTextAndConfidence(text, confidence));
  items.push(duplicate);
  if (replyTarget) items.push(replyTarget);

  // Summary
  const pass = items.filter(i => i.status === "pass").length;
  const fail = items.filter(i => i.status === "fail").length;
  const manual = items.filter(i => i.status === "manual").length;
  const warning = items.filter(i => i.status === "warning").length;

  let recommendation: string;
  const autoCheckable = items.filter(i => i.status !== "manual");
  const autoPass = autoCheckable.filter(i => i.status === "pass").length;
  const autoTotal = autoCheckable.length;

  if (fail >= 2) {
    recommendation = `HOLD — ${fail} checks failed. Don't publish — wait for better conditions.`;
  } else if (fail === 1) {
    recommendation = `REVIEW — 1 check failed. Evaluate if borderline and publish if justified.`;
  } else if (warning > 0 && autoPass < autoTotal) {
    recommendation = `REVIEW — ${warning} check(s) need data. Provide missing flags for full evaluation.`;
  } else if (autoPass === autoTotal) {
    recommendation = `GO — all automated checks pass. Confirm ${manual} manual item(s) and publish.`;
  } else {
    recommendation = `REVIEW — ${autoPass}/${autoTotal} automated checks pass.`;
  }

  const result: GateResult = {
    timestamp: new Date().toISOString(),
    topic,
    items,
    summary: { pass, fail, manual, warning, total: items.length, recommendation },
  };

  // Output
  if (flags["pretty"] === "true") {
    prettyPrint(result);
  } else if (flags["json"] === "true") {
    console.log(JSON.stringify(result));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  console.error(`[gate] ERROR: ${err.message}`);
  process.exit(1);
});
