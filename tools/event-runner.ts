#!/usr/bin/env npx tsx
/**
 * Event Runner — long-lived process for reactive event handling.
 *
 * Runs alongside the cron-based session-runner.ts.
 * Polls SuperColony feed for replies, mentions, tips, and disagrees.
 * Dispatches to pure handlers that return EventActions.
 *
 * Process model: managed by systemd/pm2. NOT a cron job.
 *
 * Usage:
 *   npx tsx tools/event-runner.ts --agent sentinel [--dry-run] [--pretty]
 *
 * Budget: reactive posts are rate-limited separately from cron.
 *   Default: 4 reactive posts/day (configured in persona.yaml events.budget.dailyReactive)
 *
 * WS4: SuperColony Reactive Mode.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

import { resolveAgentName, loadAgentConfig } from "./lib/agent-config.js";
import { connectWallet, setLogAgent, apiCall, info, warn } from "./lib/sdk.js";
import { ensureAuth } from "./lib/auth.js";
import { initObserver, observe } from "./lib/observe.js";
import { loadWriteRateLedger, canPublish, recordPublish, saveWriteRateLedger } from "./lib/write-rate-limit.js";
import { createFileWatermarkStore } from "./lib/watermark-store.js";
import { startEventLoop, type SourceRegistration } from "./lib/event-loop.js";

import { createSocialReplySource, type ReplyPost } from "./lib/event-sources/social-replies.js";
import { createSocialMentionSource, type MentionPost } from "./lib/event-sources/social-mentions.js";
import { createTipReceivedSource, type TipRecord } from "./lib/event-sources/tip-received.js";
import { createDisagreeMonitorSource, type DisagreePost } from "./lib/event-sources/disagree-monitor.js";

import { createReplyHandler } from "./lib/event-handlers/reply-handler.js";
import { createMentionHandler } from "./lib/event-handlers/mention-handler.js";
import { createTipThanksHandler } from "./lib/event-handlers/tip-thanks-handler.js";
import { createDisagreeHandler } from "./lib/event-handlers/disagree-handler.js";

import type { AgentEvent, EventAction, EventHandler } from "../core/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// ── Arg Parsing ────────────────────────────────────

interface EventRunnerFlags {
  agent: string;
  env: string;
  dryRun: boolean;
  pretty: boolean;
}

function parseFlags(): EventRunnerFlags {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
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

  const agentName = resolveAgentName(flags);
  return {
    agent: agentName,
    env: flags.env || "",
    dryRun: flags["dry-run"] === "true",
    pretty: flags.pretty === "true",
  };
}

// ── Feed Helpers ───────────────────────────────────

function normalizePosts(payload: any): any[] {
  const posts =
    payload?.posts ??
    payload?.results ??
    payload?.items ??
    payload?.data?.posts ??
    payload?.data ??
    payload ??
    [];
  return Array.isArray(posts) ? posts : [];
}

async function fetchFeedPosts(token: string, limit: number = 50): Promise<any[]> {
  const res = await apiCall(`/api/feed?limit=${limit}`, token);
  if (!res.ok) return [];
  return normalizePosts(res.data);
}

// ── Main ───────────────────────────────────────────

async function main(): Promise<void> {
  const flags = parseFlags();
  setLogAgent(flags.agent);
  const config = loadAgentConfig(flags.agent);

  info("Event runner starting...");
  info(`Agent: ${flags.agent}, dry-run: ${flags.dryRun}`);

  // Connect wallet and authenticate
  const { demos, address } = await connectWallet(flags.env);
  const token = await ensureAuth(demos, flags.agent);

  // Initialize observer for event logging
  initObserver(flags.agent, -1); // -1 = event loop session

  // Watermark store
  const store = createFileWatermarkStore(flags.agent);

  // Budget config from persona.yaml (defaults)
  const dailyReactive = (config as any).events?.budget?.dailyReactive ?? 4;

  // Track agent's published TX hashes (load from session log)
  const ownTxHashes = new Set<string>(); // TODO: populate from session log

  // ── Create Sources ─────────────────────────────

  const replySrc = createSocialReplySource({
    fetchFeed: async () => {
      const posts = await fetchFeedPosts(token);
      return posts.map((p: any): ReplyPost => ({
        txHash: String(p?.txHash || ""),
        author: String(p?.author || p?.address || "").toLowerCase(),
        timestamp: Number(p?.timestamp || 0),
        text: String(p?.payload?.text || p?.text || ""),
        replyTo: String(p?.payload?.replyTo || p?.replyTo || ""),
      })).filter((p: ReplyPost) => p.txHash && p.replyTo);
    },
    ownTxHashes: () => ownTxHashes,
  });

  const mentionSrc = createSocialMentionSource({
    fetchFeed: async () => {
      const posts = await fetchFeedPosts(token);
      return posts.map((p: any): MentionPost => ({
        txHash: String(p?.txHash || ""),
        author: String(p?.author || p?.address || "").toLowerCase(),
        timestamp: Number(p?.timestamp || 0),
        text: String(p?.payload?.text || p?.text || ""),
      })).filter((p: MentionPost) => p.txHash);
    },
    agentAddress: address,
  });

  const tipSrc = createTipReceivedSource({
    fetchTips: async () => {
      // TODO: implement via SDK getTransactionHistory when available
      return [];
    },
  });

  const disagreeSrc = createDisagreeMonitorSource({
    fetchOwnPosts: async () => {
      // TODO: fetch agent's own posts and compute disagree ratios
      return [];
    },
    disagreeThreshold: 0.3,
  });

  // ── Create Handlers ────────────────────────────

  const handlers: EventHandler[] = [
    createReplyHandler(),
    createMentionHandler(),
    createTipThanksHandler(),
    createDisagreeHandler(),
  ];

  // ── Source Registrations ───────────────────────

  const sources: SourceRegistration[] = [
    { source: replySrc, intervalMs: 30_000, minIntervalMs: 15_000, maxIntervalMs: 300_000 },
    { source: mentionSrc, intervalMs: 60_000, minIntervalMs: 30_000, maxIntervalMs: 600_000 },
    { source: tipSrc, intervalMs: 120_000, minIntervalMs: 60_000, maxIntervalMs: 900_000 },
    { source: disagreeSrc, intervalMs: 300_000, minIntervalMs: 120_000, maxIntervalMs: 900_000 },
  ];

  // ── Action Executor ────────────────────────────

  async function executeAction(event: AgentEvent, action: EventAction): Promise<void> {
    observe("insight", `Event action: ${action.type}`, {
      phase: "event-loop",
      source: `event-runner:${event.sourceId}`,
      data: { eventId: event.id, action },
    });

    if (action.type === "log_only") {
      info(`[event] ${action.params.reason || "logged"}`);
      return;
    }

    if (flags.dryRun) {
      info(`[dry-run] Would execute: ${action.type} ${JSON.stringify(action.params)}`);
      return;
    }

    // Check reactive budget before publishing/replying
    if (action.type === "publish" || action.type === "reply") {
      const ledger = loadWriteRateLedger(address);
      const check = canPublish(ledger, { dailyLimit: dailyReactive, hourlyLimit: 2 });
      if (!check.allowed) {
        warn(`[event] Reactive budget exhausted: ${check.reason}`);
        observe("warning", `Reactive budget exhausted: ${check.reason}`, {
          phase: "event-loop",
          source: "event-runner:budget",
          data: { action, reason: check.reason },
        });
        return;
      }
    }

    // Execute the action (placeholder — actual SDK calls go here)
    switch (action.type) {
      case "react":
        info(`[event] React ${action.params.reaction} to ${action.params.txHash}`);
        // TODO: apiCall to react endpoint
        break;
      case "reply":
        info(`[event] Reply to ${action.params.parentTx}: ${String(action.params.question).slice(0, 50)}...`);
        // TODO: LLM generation + publish reply
        // Record the publish in the rate limit ledger
        recordPublish(ledger);
        saveWriteRateLedger(ledger, address);
        break;
      case "publish":
        info(`[event] Publish: ${String(action.params.text).slice(0, 50)}...`);
        // TODO: publish pipeline
        recordPublish(ledger);
        saveWriteRateLedger(ledger, address);
        break;
      case "tip":
        info(`[event] Tip ${action.params.amount} DEM to ${action.params.address}`);
        // TODO: SDK tip call
        break;
    }
  }

  // ── Start Loop ─────────────────────────────────

  const loop = startEventLoop(
    { agent: flags.agent },
    sources,
    handlers,
    store,
    executeAction,
    (event, error) => {
      warn(`[event-error] ${event.sourceId}: ${error.message}`);
      observe("failure", `Event handler error: ${error.message}`, {
        phase: "event-loop",
        source: `event-runner:${event.sourceId}`,
        data: { eventId: event.id, error: error.message },
      });
    },
  );

  info("Event loop started. Press Ctrl+C to stop.");
  info(`Sources: ${sources.map(s => s.source.id).join(", ")}`);
  info(`Handlers: ${handlers.map(h => h.name).join(", ")}`);
  info(`Reactive budget: ${dailyReactive}/day`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    info(`Received ${signal}, shutting down...`);
    await loop.stop();
    const stats = loop.stats();
    info(`Final stats: ${stats.totalEvents} events, ${stats.totalActions} actions, ${stats.totalErrors} errors`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(`[event-runner] Fatal: ${err.message}`);
  process.exit(1);
});
