#!/usr/bin/env npx tsx
/**
 * Confidence Gate Checker — Sentinel Phase 2 tool
 *
 * Maps to strategy.yaml GATE phase (6-item checklist).
 * Automates checkable items, marks manual items as MANUAL in output.
 * No interactive prompts — pure CLI, fully agentic.
 *
 * Usage:
 *   npx tsx tools/gate.ts --topic TEXT [--text TEXT] [--category TEXT] [--confidence N] [--env PATH] [--pretty] [--json]
 */

import { resolve } from "node:path";
import { connectWallet, apiCall, info } from "./lib/sdk.js";
import { ensureAuth } from "./lib/auth.js";
import { resolveAgentName, loadAgentConfig } from "./lib/agent-config.js";

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
Confidence Gate Checker — Sentinel GATE phase tool

USAGE:
  npx tsx tools/gate.ts --topic TEXT [flags]

FLAGS:
  --agent NAME       Agent name (default: sentinel)
  --topic TEXT        Topic to check (required)
  --text TEXT         Post text to check length (optional)
  --category TEXT     Post category: ANALYSIS or PREDICTION (optional)
  --confidence N      Confidence value 0-100 (optional)
  --env PATH          Path to .env file (default: .env in cwd)
  --pretty            Human-readable formatted output
  --json              Compact single-line JSON output
  --help, -h          Show this help

GATE ITEMS (from strategy.yaml):
  1. Topic activity ≥3 posts         [AUTO — searches feed]
  2. Unique data                     [MANUAL — operator confirms]
  3. Agent reference                 [MANUAL — operator confirms]
  4. ANALYSIS or PREDICTION category [AUTO — checks --category]
  5. >200 chars + confidence set     [AUTO — checks --text + --confidence]
  6. Not duplicate                   [AUTO — searches own posts]

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

// ── Gate Checks ────────────────────────────────────

/**
 * Gate 1: Topic activity ≥3 posts in feed.
 * Searches feed for posts with matching tags/assets.
 */
async function checkTopicActivity(
  topic: string,
  token: string
): Promise<GateItem> {
  const feedRes = await apiCall(`/api/feed?limit=50`, token);
  if (!feedRes.ok) {
    return {
      number: 1,
      name: "Topic activity",
      status: "warning",
      detail: `Feed request failed (${feedRes.status}) — cannot verify`,
    };
  }

  const rawPosts = feedRes.data?.posts ?? feedRes.data;
  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const topicLower = topic.toLowerCase();

  const matching = posts.filter((p: any) => {
    const tags = (p.payload?.tags || []).map((t: string) => t.toLowerCase());
    const assets = (p.payload?.assets || []).map((a: string) => a.toLowerCase());
    const text = (p.payload?.text || "").toLowerCase();
    return tags.includes(topicLower) || assets.includes(topicLower) || text.includes(topicLower);
  });

  const count = matching.length;
  if (count >= 3) {
    return {
      number: 1,
      name: "Topic activity",
      status: "pass",
      detail: `${count} posts found (threshold: 3)`,
    };
  } else {
    return {
      number: 1,
      name: "Topic activity",
      status: "fail",
      detail: `${count} posts found (need ≥3)`,
    };
  }
}

/**
 * Gate 2: Unique data — MANUAL check.
 */
function checkUniqueData(): GateItem {
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
 * Gate 4: Category is ANALYSIS or PREDICTION.
 */
function checkCategory(category?: string): GateItem {
  if (!category) {
    return {
      number: 4,
      name: "Category",
      status: "warning",
      detail: "Not provided (use --category ANALYSIS or PREDICTION)",
    };
  }
  const upper = category.toUpperCase();
  if (upper === "ANALYSIS" || upper === "PREDICTION") {
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
    detail: `"${category}" is not ANALYSIS or PREDICTION`,
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
 * Checks author feed for tag/asset overlap with topic.
 */
async function checkDuplicate(
  topic: string,
  token: string,
  address: string
): Promise<GateItem> {
  const feedRes = await apiCall(`/api/feed?author=${address}&limit=50`, token);
  if (!feedRes.ok) {
    return {
      number: 6,
      name: "Not duplicate",
      status: "warning",
      detail: `Author feed request failed (${feedRes.status}) — cannot verify`,
    };
  }

  const rawPosts = feedRes.data?.posts ?? feedRes.data;
  const posts = Array.isArray(rawPosts) ? rawPosts : [];
  const topicLower = topic.toLowerCase();

  const duplicates = posts.filter((p: any) => {
    const tags = (p.payload?.tags || []).map((t: string) => t.toLowerCase());
    const assets = (p.payload?.assets || []).map((a: string) => a.toLowerCase());
    const text = (p.payload?.text || "").toLowerCase();
    return tags.includes(topicLower) || assets.includes(topicLower) || text.includes(topicLower);
  });

  if (duplicates.length === 0) {
    return {
      number: 6,
      name: "Not duplicate",
      status: "pass",
      detail: "No matching posts found in your history",
    };
  }

  return {
    number: 6,
    name: "Not duplicate",
    status: "fail",
    detail: `${duplicates.length} existing post(s) match topic "${topic}" — check for overlap`,
  };
}

// ── Pretty Output ──────────────────────────────────

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

  // Connect and auth
  const { demos, address } = await connectWallet(envPath);
  const token = await ensureAuth(demos, address);

  // Run gate checks
  info("Running gate checks...");
  const items: GateItem[] = [];

  // Parallel API checks + sync checks
  const [topicActivity, duplicate] = await Promise.all([
    checkTopicActivity(topic, token),
    checkDuplicate(topic, token, address),
  ]);

  items.push(topicActivity);
  items.push(checkUniqueData());
  items.push(checkAgentReference());
  items.push(checkCategory(category));
  items.push(checkTextAndConfidence(text, confidence));
  items.push(duplicate);

  // Summary
  const pass = items.filter(i => i.status === "pass").length;
  const fail = items.filter(i => i.status === "fail").length;
  const manual = items.filter(i => i.status === "manual").length;
  const warning = items.filter(i => i.status === "warning").length;

  let recommendation: string;
  const autoCheckable = items.filter(i => i.status !== "manual");
  const autoPass = autoCheckable.filter(i => i.status === "pass").length;
  const autoTotal = autoCheckable.length;

  if (fail > 0) {
    recommendation = `HOLD — ${fail} check(s) failed. Fix before publishing.`;
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
