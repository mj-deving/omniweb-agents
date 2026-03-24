#!/usr/bin/env npx tsx
/**
 * Transcript Query CLI — analyze session transcripts.
 *
 * Usage:
 *   npx tsx cli/transcript-query.ts --agent sentinel --pretty
 *   npx tsx cli/transcript-query.ts --agent sentinel --session 42 --pretty
 *   npx tsx cli/transcript-query.ts --agent sentinel --last 5 --pretty
 *   npx tsx cli/transcript-query.ts --agent sentinel --json
 */

import { resolve } from "node:path";
import { homedir } from "node:os";
import { readdirSync } from "node:fs";
import { readTranscript, type TranscriptEvent } from "../src/lib/transcript.js";

// ── Arg Parsing ──────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

const agent = getFlag("agent") || "sentinel";
const sessionFilter = getFlag("session");
const lastN = getFlag("last");
const pretty = hasFlag("pretty");
const json = hasFlag("json");

// ── Main ──────────────────────────────────────────────

const transcriptDir = resolve(homedir(), ".config", "demos", "transcripts", agent);

// Find transcript files
let files: string[];
try {
  files = readdirSync(transcriptDir)
    .filter(f => f.endsWith(".jsonl"))
    .sort((a, b) => {
      // Sort by session number extracted from filename
      const numA = parseInt(a.match(/session-(\d+)/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/session-(\d+)/)?.[1] || "0", 10);
      return numA - numB;
    });
} catch {
  console.error(`No transcripts found for agent "${agent}" at ${transcriptDir}`);
  process.exit(1);
}

// Filter
if (sessionFilter) {
  files = files.filter(f => f.includes(`session-${sessionFilter}.`));
}
if (lastN) {
  files = files.slice(-parseInt(lastN, 10));
}

if (files.length === 0) {
  console.error("No matching transcript files found.");
  process.exit(1);
}

// Process each file
interface SessionSummary {
  sessionId: string;
  startTime: string;
  durationMs: number;
  phases: Array<{
    name: string;
    durationMs: number;
    metrics?: Record<string, unknown>;
  }>;
  errors: string[];
  totalPosts: number;
}

const summaries: SessionSummary[] = [];

for (const file of files) {
  const events = readTranscript(resolve(transcriptDir, file));
  if (events.length === 0) continue;

  const sessionStart = events.find(e => e.type === "session-start");
  const sessionComplete = events.find(e => e.type === "session-complete");
  const phaseCompletes = events.filter(e => e.type === "phase-complete");
  const phaseErrors = events.filter(e => e.type === "phase-error");

  summaries.push({
    sessionId: sessionStart?.sessionId || file.replace(".jsonl", ""),
    startTime: sessionStart?.timestamp || "",
    durationMs: sessionComplete?.durationMs || 0,
    phases: phaseCompletes.map(e => ({
      name: e.phase || "unknown",
      durationMs: e.durationMs || 0,
      metrics: e.metrics as Record<string, unknown> | undefined,
    })),
    errors: phaseErrors.map(e => `${e.phase}: ${(e.data as any)?.error || "unknown"}`),
    totalPosts: (sessionComplete?.data as any)?.posts || 0,
  });
}

// Output
if (json) {
  console.log(JSON.stringify(summaries, null, 2));
} else if (pretty) {
  for (const s of summaries) {
    const durationMin = (s.durationMs / 60000).toFixed(1);
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  ${s.sessionId} — ${s.startTime ? new Date(s.startTime).toLocaleString() : "unknown"}`);
    console.log(`  Duration: ${durationMin} min | Posts: ${s.totalPosts} | Errors: ${s.errors.length}`);
    console.log(`${"─".repeat(50)}`);

    // Phase latency breakdown
    console.log("  Phase Latency:");
    for (const p of s.phases) {
      const sec = (p.durationMs / 1000).toFixed(1);
      const bar = "█".repeat(Math.min(40, Math.round(p.durationMs / 1000)));
      console.log(`    ${p.name.padEnd(10)} ${sec.padStart(6)}s ${bar}`);
    }

    // Metrics summary
    const gateMetrics = s.phases.find(p => p.name === "gate")?.metrics;
    const publishMetrics = s.phases.find(p => p.name === "publish")?.metrics;
    const scanMetrics = s.phases.find(p => p.name === "scan")?.metrics;

    if (gateMetrics || publishMetrics || scanMetrics) {
      console.log("  Metrics:");
      if (gateMetrics) console.log(`    Gate: ${gateMetrics.gatePass || 0} pass / ${gateMetrics.gateFail || 0} fail`);
      if (publishMetrics) console.log(`    Attestation: ${publishMetrics.attestationSuccess || 0} success / ${publishMetrics.attestationFailed || 0} failed`);
      if (scanMetrics) console.log(`    Source scan: ${scanMetrics.sourcesFetched || 0} fetched, ${scanMetrics.signalsDetected || 0} signals`);
    }

    if (s.errors.length > 0) {
      console.log("  Errors:");
      for (const err of s.errors) console.log(`    ❌ ${err}`);
    }
  }

  // Aggregate stats across sessions
  if (summaries.length > 1) {
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  AGGREGATE (${summaries.length} sessions)`);
    console.log(`${"─".repeat(50)}`);
    const avgDuration = summaries.reduce((s, x) => s + x.durationMs, 0) / summaries.length;
    const totalPosts = summaries.reduce((s, x) => s + x.totalPosts, 0);
    const totalErrors = summaries.reduce((s, x) => s + x.errors.length, 0);
    console.log(`  Avg duration: ${(avgDuration / 60000).toFixed(1)} min`);
    console.log(`  Total posts: ${totalPosts}`);
    console.log(`  Total errors: ${totalErrors}`);

    // Per-phase avg latency
    const phaseLatencies = new Map<string, number[]>();
    for (const s of summaries) {
      for (const p of s.phases) {
        if (!phaseLatencies.has(p.name)) phaseLatencies.set(p.name, []);
        phaseLatencies.get(p.name)!.push(p.durationMs);
      }
    }
    console.log("  Avg phase latency:");
    for (const [name, times] of phaseLatencies) {
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      console.log(`    ${name.padEnd(10)} ${(avg / 1000).toFixed(1).padStart(6)}s`);
    }
  }
} else {
  // Compact output
  for (const s of summaries) {
    console.log(`${s.sessionId}: ${(s.durationMs / 60000).toFixed(1)}m, ${s.totalPosts} posts, ${s.errors.length} errors`);
  }
}
