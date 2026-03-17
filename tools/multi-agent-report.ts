#!/usr/bin/env npx tsx
/**
 * Multi-Agent Report — cross-agent dashboard for all SuperColony agents.
 *
 * Reads session reports, prediction stores, and audit data for sentinel, pioneer, crawler.
 * Outputs consolidated view: posts published, avg scores, failure rates, calibration offsets.
 *
 * Usage:
 *   npx tsx tools/multi-agent-report.ts --pretty    # Human-readable table
 *   npx tsx tools/multi-agent-report.ts --json      # Machine-readable JSON
 */

import { resolve } from "node:path";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";

// ── Types ──────────────────────────────────────────

interface AgentReport {
  agent: string;
  totalSessions: number;
  latestSession: number;
  totalPosts: number;
  totalReactions: number;
  avgReactionsPerSession: number;
  calibrationOffset: number;
  avgPredictionError: number;
  logEntries: number;
  latestSessionDate: string;
  latestPostCount: number;
  failedSessions: number;
}

interface MultiAgentReport {
  timestamp: string;
  agents: AgentReport[];
  summary: {
    totalSessions: number;
    totalPosts: number;
    totalReactions: number;
    avgPostsPerSession: number;
  };
}

// ── Helpers ────────────────────────────────────────

const AGENTS = ["sentinel", "pioneer", "crawler"] as const;
const REPORT_RE = /^session-(\d+)-report\.md$/;
const DURATION_RE = /\*\*Duration:\*\*\s*([\d.]+)\s*min/;
const POSTS_RE = /\*\*Posts:\*\*\s*(\d+)/;
const REACTIONS_RE = /Reactions:\s*(\d+)/;

function parseSessionReport(content: string): { posts: number; reactions: number; date: string } {
  const posts = content.match(POSTS_RE);
  const reactions = content.match(REACTIONS_RE);
  const dateMatch = content.match(/# \w+ Session \d+ — ([\d-]+)/);
  return {
    posts: posts ? Number(posts[1]) : 0,
    reactions: reactions ? Number(reactions[1]) : 0,
    date: dateMatch ? dateMatch[1] : "unknown",
  };
}

function buildAgentReport(agent: string): AgentReport {
  const sessionsDir = resolve(homedir(), `.${agent}`, "sessions");
  const logPath = resolve(homedir(), `.${agent}-session-log.jsonl`);
  const improvPath = resolve(homedir(), `.${agent}-improvements.json`);

  // Parse all session reports
  let totalSessions = 0;
  let latestSession = 0;
  let totalPosts = 0;
  let totalReactions = 0;
  let latestSessionDate = "none";
  let latestPostCount = 0;
  let failedSessions = 0;

  if (existsSync(sessionsDir)) {
    const files = readdirSync(sessionsDir).filter((f) => REPORT_RE.test(f));
    totalSessions = files.length;

    for (const f of files) {
      try {
        const num = Number(f.match(REPORT_RE)![1]);
        const content = readFileSync(resolve(sessionsDir, f), "utf-8");
        const parsed = parseSessionReport(content);
        totalPosts += parsed.posts;
        totalReactions += parsed.reactions;

        if (parsed.posts === 0) failedSessions++;

        if (num > latestSession) {
          latestSession = num;
          latestSessionDate = parsed.date;
          latestPostCount = parsed.posts;
        }
      } catch { /* skip unreadable report */ }
    }
  }

  // Read calibration from improvements file
  let calibrationOffset = 0;
  if (existsSync(improvPath)) {
    try {
      const data = JSON.parse(readFileSync(improvPath, "utf-8"));
      calibrationOffset = data.calibrationOffset || 0;
    } catch { /* ignore */ }
  }

  // Read session log for entry count and avg prediction error
  let logEntries = 0;
  let avgPredictionError = 0;
  if (existsSync(logPath)) {
    try {
      const lines = readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
      logEntries = lines.length;
      let errorSum = 0;
      let errorCount = 0;
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (typeof entry.predicted_reactions === "number" && typeof entry.actual_reactions === "number") {
            errorSum += entry.actual_reactions - entry.predicted_reactions;
            errorCount++;
          }
        } catch { /* skip */ }
      }
      avgPredictionError = errorCount > 0 ? Math.round((errorSum / errorCount) * 10) / 10 : 0;
    } catch { /* ignore */ }
  }

  return {
    agent,
    totalSessions,
    latestSession,
    totalPosts,
    totalReactions,
    avgReactionsPerSession: totalSessions > 0 ? Math.round((totalReactions / totalSessions) * 10) / 10 : 0,
    calibrationOffset,
    avgPredictionError,
    logEntries,
    latestSessionDate,
    latestPostCount,
    failedSessions,
  };
}

// ── Main ───────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const pretty = args.includes("--pretty");
  const json = args.includes("--json");

  const agents = AGENTS.map(buildAgentReport);

  const report: MultiAgentReport = {
    timestamp: new Date().toISOString(),
    agents,
    summary: {
      totalSessions: agents.reduce((s, a) => s + a.totalSessions, 0),
      totalPosts: agents.reduce((s, a) => s + a.totalPosts, 0),
      totalReactions: agents.reduce((s, a) => s + a.totalReactions, 0),
      avgPostsPerSession: 0,
    },
  };
  report.summary.avgPostsPerSession = report.summary.totalSessions > 0
    ? Math.round((report.summary.totalPosts / report.summary.totalSessions) * 100) / 100
    : 0;

  if (pretty) {
    console.log("\n" + "═".repeat(78));
    console.log("  MULTI-AGENT REPORT");
    console.log("═".repeat(78));
    console.log("");

    // Table header
    console.log("  Agent      Sessions  Posts  Reactions  Avg Rx  Offset  Pred Err  Latest");
    console.log("  " + "─".repeat(74));

    for (const a of agents) {
      const line = [
        a.agent.padEnd(10),
        String(a.totalSessions).padStart(5),
        String(a.totalPosts).padStart(7),
        String(a.totalReactions).padStart(7),
        String(a.avgReactionsPerSession).padStart(8),
        String(a.calibrationOffset).padStart(6),
        String(a.avgPredictionError).padStart(9),
        `  s${a.latestSession} (${a.latestPostCount}p)`,
      ].join("  ");
      console.log(`  ${line}`);
    }

    console.log("");
    console.log(`  Summary: ${report.summary.totalSessions} sessions, ${report.summary.totalPosts} posts, ${report.summary.totalReactions} reactions`);
    console.log(`  Avg posts/session: ${report.summary.avgPostsPerSession}`);

    // Failure rate
    const totalFailed = agents.reduce((s, a) => s + a.failedSessions, 0);
    const failRate = report.summary.totalSessions > 0
      ? Math.round((totalFailed / report.summary.totalSessions) * 100)
      : 0;
    console.log(`  Failure rate: ${failRate}% (${totalFailed}/${report.summary.totalSessions} sessions with 0 posts)`);

    console.log("\n" + "═".repeat(78));
  } else if (json) {
    console.log(JSON.stringify(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
