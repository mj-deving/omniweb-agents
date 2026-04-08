#!/usr/bin/env npx tsx
/**
 * Session Runner — Sentinel Phase 3 orchestrator
 *
 * Runs the full 8-phase Sentinel loop from a single command.
 * Supports three oversight levels: full (interactive), approve (semi-auto), autonomous (fully automated).
 * State persists between phases for --resume capability.
 *
 * Phase sequence: AUDIT → SCAN → ENGAGE → GATE → PUBLISH → VERIFY → REVIEW → HARDEN
 *
 * Usage:
 *   npx tsx tools/session-runner.ts [--env PATH] [--log PATH] [--oversight LEVEL] [--resume] [--skip-to PHASE] [--dry-run] [--pretty]
 *
 * Oversight levels:
 *   full       (default) GATE interactive, PUBLISH manual, REVIEW interactive
 *   approve    GATE auto-suggests from scan, PUBLISH manual, REVIEW auto-proposes
 *   autonomous GATE auto-picks, PUBLISH auto (LLM + attest + post), REVIEW auto-proposes
 */

import { resolve, dirname } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";
import { createInterface } from "node:readline/promises";
import { spawn, spawnSync } from "node:child_process";
import { stdin, stdout } from "node:process";

import { runTool, ToolError, parseToolJsonOutput, type ToolResult } from "../src/lib/util/subprocess.js";
import { calculateStrategyScore, logQualityData } from "../src/lib/scoring/quality-score.js";
import {
  startSession,
  loadState,
  saveState,
  findActiveSession,
  acquireLock,
  beginPhase,
  completePhase,
  failPhase,
  getNextPhase,
  getPhaseOrder,
  clearState,
  releaseLock,
  isV2,
  isV3,
  CORE_PHASE_ORDER,
  validateResumeVersion,
  type SessionState,
  type V2SessionState,
  type V3SessionState,
  type AnySessionState,
  type PhaseName,
  type CorePhase,
  type LoopVersion,
  type ActSubstageState,
  type SubstageStatus,
  type SessionPostRecord,
} from "../src/lib/state.js";
import { readSessionLog, appendSessionLog, resolveLogPath } from "../src/lib/util/log.js";
import { saveReviewFindings, loadLatestFindings } from "../src/lib/review-findings.js";
import { generatePost, type PostDraft } from "../src/actions/llm.js";
import { resolveProvider, type LLMProvider } from "../src/lib/llm/llm-provider.js";
import { apiCall, connectWallet, setLogAgent } from "../src/lib/network/sdk.js";
// ensureAuth removed — session loop is fully chain-only
import { attestDahr, attestTlsn, publishPost, type PublishResult, type AttestResult } from "../src/actions/publish-pipeline.js";
import { extractStructuredClaimsAuto } from "../src/lib/attestation/claim-extraction.js";
import { buildAttestationPlan, verifyAttestedValues, createUsageTracker, type SourceUsageTracker } from "../src/lib/attestation/attestation-planner.js";
import { executeAttestationPlan } from "../src/actions/attestation-executor.js";
import { loadDeclarativeProviderAdaptersSync } from "../src/lib/sources/providers/declarative-engine.js";
import { resolveAttestationPlan, type AttestationType } from "../src/lib/attestation/attestation-policy.js";
import { resolveAgentName, loadAgentConfig, type AgentConfig } from "../src/lib/agent-config.js";
import { initObserver, setObserverPhase, observe, type ObservationType, type ObserveOptions, type SubstageResult, type SubstageFailureCode } from "../src/lib/pipeline/observe.js";
import {
  loadExtensions,
  runBeforeSense,
  runBeforePublishDraft,
  runAfterPublishDraft,
  runAfterAct,
  runAfterConfirm,
  type ExtensionHookRegistry,
  type BeforeSenseContext,
  type HookLogger,
} from "../src/lib/util/extensions.js";
import type { PublishedPostRecord } from "../src/lib/state.js";
import { FileStateStore } from "../src/toolkit/state-store.js";
import { checkAndRecordWrite, getWriteRateRemaining } from "../src/toolkit/guards/write-rate-limit.js";
import { AUTH_PENDING_TOKEN, createSdkBridge } from "../src/toolkit/sdk-bridge.js";
import { type SignalSnapshot } from "../src/lib/pipeline/signals.js";
import {
  initStrategyBridge,
  sense as strategySense,
  plan as strategyPlan,
  computePerformance as strategyPerformance,
  summarizeActions,
  type StrategyBridge,
  type SenseResult,
  type PlanResult,
} from "./v3-strategy-bridge.js";
import { executeStrategyActions } from "./action-executor.js";
import { createStrategyTextGenerator } from "./strategy-text-generator.js";
import { runV3Loop } from "./v3-loop.js";
import {
  loadAgentSourceView,
  preflight as sourcesPreflight,
  selectSourceForTopicV2,
  type AgentSourceView,
} from "../src/lib/sources/index.js";
import {
  runSourceScan,
  deriveIntentsFromTopics,
  mergeAndDedup,
  type TopicSuggestion,
} from "../src/lib/pipeline/source-scanner.js";
import {
  loadBaselines,
  saveBaselines,
} from "../src/lib/pipeline/signal-detection.js";
import {
  createTranscriptContext,
  emitTranscriptEvent,
  extractTranscriptMetrics,
  pruneOldTranscripts,
  type SourceRelevanceEntry,
  type TranscriptContext,
} from "../src/lib/transcript.js";

// ── Transcript Metric Extraction ────────────────────

function getPostTxHash(post: string | SessionPostRecord): string {
  return typeof post === "string" ? post : String(post?.txHash || "");
}

/** Extract phase-specific data for transcript from phase result.
 * Paths verified against actual result shapes in session-runner.ts. */
function extractPhaseData(phase: string, result: any, state: any): Record<string, unknown> | undefined {
  switch (phase) {
    case "audit": {
      const stats = result.stats || {};
      return {
        entriesAudited: stats.total_entries || 0,
        avgPredictionError: stats.avg_prediction_error,
        scoreDistribution: stats.score_distribution,
      };
    }
    case "scan":
      return {
        activityLevel: result.activity?.level,
        postsPerHour: result.activity?.posts_per_hour,
        gapCount: result.gaps?.topics?.length || 0,
        sourceSignals: result.sourceSignals,
      };
    case "engage":
      return { reactionsCast: result.reactions_cast || 0, agrees: result.agrees || 0, disagrees: result.disagrees || 0 };
    case "gate": {
      const posts = result.posts || [];
      return {
        topicCount: posts.length,
        topics: posts.map((p: any) => p.topic),
        passCount: posts.filter((p: any) => p.gateResult?.summary?.fail === 0).length,
        failCount: posts.filter((p: any) => p.gateResult?.summary?.fail > 0).length,
      };
    }
    case "publish":
      return {
        postCount: state.posts?.length || 0,
        posts: (state.posts || []).map((p: any) => ({
          txHash: getPostTxHash(p) || null,
          category: p.category || null,
          text: p.text || null,
          textLength: p.textLength || p.text?.length || 0,
          attestationType: p.attestation_type || p.attestationType || null,
          topic: p.topic || null,
        })),
      };
    case "verify": {
      const summary = result.summary || {};
      return { verified: summary.verified || 0, total: summary.total || 0 };
    }
    case "review": {
      const stats = result.stats || {};
      return {
        postsReviewed: stats.total_posts,
        avgScore: stats.avg_score,
        avgReactions: stats.avg_actual,
        suggestions: result.q2_suggestions?.map((s: any) => s.text || s) || [],
      };
    }
    case "harden":
      return {
        findingsCount: result.findings || 0,
        actionable: result.actionable || 0,
        proposed: result.proposed || 0,
        skipped: result.skipped || 0,
      };
    default:
      return undefined;
  }
}

// ── Constants ──────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const TMUX_ADAPTER_ENV = "SESSION_RUNNER_TMUX_ADAPTER";

// Resolved at runtime based on --agent flag
let IMPROVEMENTS_PATH = resolve(homedir(), ".sentinel-improvements.json");
let agentConfig: AgentConfig;
let runnerAgentName = "sentinel";
let runnerExecBackend: ExecBackend = "spawn";
let detectedTmuxAdapter: TmuxAdapter | null = null;
let cachedSourceView: AgentSourceView | null = null;

/** Load source view once per session, cached for gate + publish reuse */
function getSourceView(): AgentSourceView {
  if (cachedSourceView) return cachedSourceView;
  cachedSourceView = loadAgentSourceView(
    agentConfig.name as import("../src/lib/sources/catalog.js").AgentName,
    agentConfig.paths.sourceCatalog,
    agentConfig.paths.sourcesRegistry,
    agentConfig.sourceRegistryMode
  );
  return cachedSourceView;
}

type OversightLevel = "full" | "approve" | "autonomous";
type ExecBackend = "spawn" | "tmux";
type TmuxAdapter = "native" | "tmux-cli";

function getPhaseMode(phase: PhaseName, oversight: OversightLevel): string {
  if (oversight === "full") {
    switch (phase) {
      case "gate": return "interactive";
      case "publish": return "manual";
      case "review": return "interactive";
      case "harden": return "interactive";
      default: return "automatic";
    }
  }
  if (oversight === "approve") {
    switch (phase) {
      case "gate": return "auto-suggest";
      case "publish": return "manual";
      case "review": return "auto-propose";
      case "harden": return "auto-apply";
      default: return "automatic";
    }
  }
  // autonomous
  switch (phase) {
    case "gate": return "auto-pick";
    case "publish": return "auto (LLM + attest + post)";
    case "review": return "auto-propose";
    case "harden": return "automatic";
    default: return "automatic";
  }
}

// ── Arg Parsing ────────────────────────────────────

interface RunnerFlags {
  agent: string;
  env: string;
  log: string;
  resume: boolean;
  skipTo: PhaseName | CorePhase | null;
  forceSkipAudit: boolean;
  dryRun: boolean;
  pretty: boolean;
  oversight: OversightLevel;
  execBackend: ExecBackend;
  loopVersion: LoopVersion;
  shadow: boolean;
}

function parseArgs(): RunnerFlags {
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

  // Parse oversight level
  let oversight: OversightLevel = "autonomous";
  if (flags["oversight"]) {
    const val = flags["oversight"].toLowerCase();
    if (!["full", "approve", "autonomous"].includes(val)) {
      console.error(`Error: --oversight must be one of: full, approve, autonomous`);
      process.exit(1);
    }
    oversight = val as OversightLevel;
  }

  let execBackend: ExecBackend = "spawn";
  if (flags["exec-backend"]) {
    const val = flags["exec-backend"].toLowerCase();
    if (!["spawn", "tmux"].includes(val)) {
      console.error(`Error: --exec-backend must be one of: spawn, tmux`);
      process.exit(1);
    }
    execBackend = val as ExecBackend;
  }

  // Parse loop version
  let loopVersion: LoopVersion = 3;
  if (flags["loop-version"]) {
    const val = Number(flags["loop-version"]);
    if (val !== 1 && val !== 2 && val !== 3) {
      console.error(`Error: --loop-version must be 1, 2, or 3, got "${flags["loop-version"]}"`);
      process.exit(1);
    }
    loopVersion = val as LoopVersion;
  }
  if (flags["legacy-loop"] === "true") {
    loopVersion = 2;
  }

  let skipTo: PhaseName | CorePhase | null = null;
  if (flags["skip-to"]) {
    if (loopVersion === 2) {
      console.error("Error: --skip-to is not supported with --loop-version 2. Use --resume instead.");
      process.exit(1);
    }
    if (loopVersion === 3 && flags["skip-to"] !== "sense") {
      console.error("Error: V3 --skip-to only supports 'sense'. ACT and CONFIRM require a real SENSE payload from the strategy engine.");
      process.exit(1);
    }

    const validPhases = (loopVersion === 3 ? CORE_PHASE_ORDER : getPhaseOrder()) as string[];
    if (!validPhases.includes(flags["skip-to"])) {
      console.error(`Error: --skip-to must be one of: ${validPhases.join(", ")}`);
      process.exit(1);
    }
    skipTo = flags["skip-to"] as PhaseName | CorePhase;
  }

  // Parse shadow mode
  const shadow = flags["shadow"] === "true";
  if (shadow && loopVersion === 1) {
    console.error("Error: --shadow requires --loop-version 2 or 3");
    process.exit(1);
  }

  const agentName = resolveAgentName(flags);

  return {
    agent: agentName,
    env: resolve(flags.env || ".env"),
    log: resolveLogPath(flags.log, agentName),
    resume: flags.resume === "true",
    skipTo,
    forceSkipAudit: flags["force-skip-audit"] === "true",
    dryRun: flags["dry-run"] === "true",
    pretty: flags.pretty === "true",
    oversight,
    execBackend,
    loopVersion,
    shadow,
  };
}

function printHelp(): void {
  console.log(`
Session Runner — Agent 8-phase loop orchestrator

USAGE:
  npx tsx tools/session-runner.ts [flags]

FLAGS:
  --agent NAME           Agent name (default: sentinel)
  --env PATH             Path to .env file (default: .env in cwd)
  --log PATH             Session log path (default: ~/.{agent}-session-log.jsonl)
  --oversight LEVEL      Oversight level: full|approve|autonomous (default: autonomous)
  --resume               Resume interrupted session from last completed phase
  --skip-to PHASE        Start from specific phase (v3: sense only, v1: audit|scan|engage|gate|publish|verify|review|harden)
  --force-skip-audit     Required with --skip-to when skipping AUDIT phase
  --loop-version 1|2|3   Loop version: 1 (8-phase), 2 (legacy 3-phase), 3 (default 3-phase strategy loop)
  --legacy-loop          Sugar for --loop-version 2
  --shadow               Shadow mode: skip action execution (requires --loop-version 2 or 3)
  --dry-run              Show what would run without executing
  --exec-backend MODE    Subprocess backend: spawn|tmux (default: spawn)
  --pretty               Human-readable output (default for interactive)
  --help, -h             Show this help

OVERSIGHT LEVELS:
  full        (default) GATE interactive, PUBLISH manual, REVIEW interactive
  approve     GATE auto-suggests topics from scan, PUBLISH manual, REVIEW auto-proposes improvements
  autonomous  GATE auto-picks topics, PUBLISH auto (LLM text gen + DAHR attest + post), REVIEW auto-proposes

  In ALL modes: strategy/persona files never auto-modified (AGENT.yaml hard rule).
  AUDIT always loads previous review findings and pending improvements.

PHASE SEQUENCE:
  Default loop (v3): SENSE → ACT → CONFIRM
  V3 is autonomous-only. Use --legacy-loop for the older interactive/manual v2 loop.

  Legacy v1 sequence:
  1. AUDIT    (auto)     — Audit previous posts, load review findings + pending improvements
  2. SCAN     (auto)     — Room temperature scan
  3. ENGAGE   (auto)     — Cast reactions (max 5)
  4. GATE     (varies)   — Quality gate check (interactive/auto-suggest/auto-pick)
  5. PUBLISH  (varies)   — Publish posts (manual/auto)
  6. VERIFY   (auto)     — Verify published posts in feed
  7. REVIEW   (varies)   — Session review + improvements (interactive/auto-propose)
  8. HARDEN   (varies)   — Classify and apply REVIEW findings via improvement lifecycle

EXAMPLES:
  npx tsx tools/session-runner.ts --pretty
  npx tsx tools/session-runner.ts --loop-version 3 --skip-to act --pretty
  npx tsx tools/session-runner.ts --legacy-loop --pretty
  npx tsx tools/session-runner.ts --legacy-loop --oversight approve --pretty
  npx tsx tools/session-runner.ts --oversight autonomous --pretty
  npx tsx tools/session-runner.ts --exec-backend tmux --oversight autonomous --pretty
  SESSION_RUNNER_TMUX_ADAPTER=tmux-cli npx tsx tools/session-runner.ts --exec-backend tmux --pretty
  npx tsx tools/session-runner.ts --resume --pretty
  npx tsx tools/session-runner.ts --dry-run --oversight autonomous
`);
}

// ── Display Helpers ────────────────────────────────

function banner(sessionNumber: number, oversight: OversightLevel, agentName: string): void {
  console.log("\n" + "═".repeat(50));
  console.log(`  ${agentName.toUpperCase()} SESSION ${sessionNumber}`);
  console.log(`  Oversight: ${oversight}`);
  console.log("═".repeat(50));
}

function phaseHeader(phase: PhaseName, oversight: OversightLevel): void {
  const phases = getPhaseOrder();
  const idx = phases.indexOf(phase) + 1;
  const mode = getPhaseMode(phase, oversight);
  console.log(`\nPhase ${idx}/${phases.length}: ${phase.toUpperCase()} (${mode})`);
}

function phaseResult(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function phaseSkipped(msg: string): void {
  console.log(`  ⊘ ${msg}`);
}

function phaseError(msg: string): void {
  console.error(`  ✗ ${msg}`);
}

function info(msg: string): void {
  console.error(`[runner] ${msg}`);
}

/** Hook logger — bridges plugin hook output to session-runner CLI formatting */
const hookLogger: HookLogger = { info, result: phaseResult };

// ── Session Number ─────────────────────────────────

function getNextSessionNumber(): number {
  if (!existsSync(IMPROVEMENTS_PATH)) return 1;
  try {
    const data = JSON.parse(readFileSync(IMPROVEMENTS_PATH, "utf-8"));
    return data.nextSession || 1;
  } catch {
    return 1;
  }
}

function incrementSessionNumber(): void {
  try {
    let data: any = { version: 1, nextSession: 1, items: [] };
    if (existsSync(IMPROVEMENTS_PATH)) {
      data = JSON.parse(readFileSync(IMPROVEMENTS_PATH, "utf-8"));
    }
    data.nextSession = (data.nextSession || 1) + 1;
    writeFileSync(IMPROVEMENTS_PATH, JSON.stringify(data, null, 2));
    info(`Session number incremented to ${data.nextSession}`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    info(`Warning: could not increment session number: ${message}`);
  }
}

// ── Readline Helpers ───────────────────────────────

async function ask(
  rl: ReturnType<typeof createInterface>,
  prompt: string
): Promise<string> {
  try {
    const answer = await rl.question(prompt);
    return answer ?? "";
  } catch {
    return "";
  }
}

// ── Phase Handlers ─────────────────────────────────

function shellQuote(input: string): string {
  return `'${input.replace(/'/g, `'\"'\"'`)}'`;
}

function isSafeEnvKey(input: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(input);
}

function commandExists(command: string): boolean {
  const probe = spawnSync(command, ["--help"], { stdio: "ignore" });
  if (probe.error) {
    const err = probe.error as NodeJS.ErrnoException;
    return err.code !== "ENOENT";
  }
  return true;
}

function resolveTmuxAdapter(): TmuxAdapter {
  if (detectedTmuxAdapter) return detectedTmuxAdapter;

  const forced = (process.env[TMUX_ADAPTER_ENV] || "").trim().toLowerCase();
  if (forced === "native" || forced === "tmux-cli") {
    detectedTmuxAdapter = forced as TmuxAdapter;
    return detectedTmuxAdapter;
  }

  detectedTmuxAdapter = commandExists("tmux-cli") ? "tmux-cli" : "native";
  return detectedTmuxAdapter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

// ── Phase Budget Defaults ─────────────────────────

/** Default phase budgets in seconds. Configurable via strategy.yaml phaseBudgets. */
const DEFAULT_PHASE_BUDGETS: Record<PhaseName, number> = {
  audit: 30,      // 30s — API calls only, no LLM
  scan: 30,       // 30s — cached feed + source scan
  engage: 30,     // 30s — reactions are fast API calls
  gate: 30,       // 30s — local checks + 1 source fetch
  publish: 120,   // 2 min — LLM gen + DAHR attest + broadcast (no TLSN)
  verify: 30,     // 30s — single API check + 1 retry
  review: 30,     // 30s — local analysis
  harden: 30,     // 30s — LLM classify (capped at 10 findings)
};

/**
 * Get the budget for a phase in milliseconds.
 * Uses strategy.yaml phaseBudgets if available, otherwise defaults.
 * Returns 0 if no budget should be enforced.
 */
function getPhaseBudgetMs(phase: PhaseName, config: AgentConfig): number {
  const configBudgets = config.phaseBudgets;
  if (configBudgets && typeof configBudgets[phase] === "number") {
    return configBudgets[phase] * 1000;
  }
  const defaultSec = DEFAULT_PHASE_BUDGETS[phase];
  return defaultSec ? defaultSec * 1000 : 0;
}

// ── V2 State Accessors ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- V2 result shapes are untyped
function getScanResult(state: AnySessionState): any {
  if (isV3(state)) return undefined; // V3 uses strategyResults
  if (isV2(state)) return state.phases.sense?.result;
  return "scan" in state.phases ? state.phases.scan?.result : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- V2 result shapes are untyped
function getGateResult(state: AnySessionState): any {
  if (isV3(state)) return undefined; // V3 uses strategyResults
  if (isV2(state)) {
    const actResult = state.phases.act?.result as any;
    return actResult?.gate || (state as any).phases.gate?.result;
  }
  return "gate" in state.phases ? state.phases.gate?.result : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- V2 result shapes are untyped
function getEngageResult(state: AnySessionState): any {
  if (isV3(state)) return undefined; // V3 uses strategyResults
  if (isV2(state)) {
    const actResult = state.phases.act?.result as any;
    return actResult?.engage;
  }
  return "engage" in state.phases ? state.phases.engage?.result : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- V2 result shapes are untyped
function getVerifyResult(state: AnySessionState): any {
  if (isV3(state)) return undefined; // V3 uses strategyResults
  if (isV2(state)) return state.phases.confirm?.result;
  return "verify" in state.phases ? state.phases.verify?.result : undefined;
}

// ── V2 Phase Budgets ──────────────────────────────

const V2_PHASE_BUDGETS: Record<CorePhase, number> = {
  sense: 180,    // 3 min
  act: 1500,     // 25 min (sum of substages)
  confirm: 120,  // 2 min
};

function getV2PhaseBudgetMs(phase: CorePhase, config: AgentConfig): number {
  const configBudgets = config.phaseBudgets;
  if (configBudgets && typeof configBudgets[phase] === "number") {
    return configBudgets[phase] * 1000;
  }
  return (V2_PHASE_BUDGETS[phase] || 0) * 1000;
}

/** Check v2 phase budget and observe if exceeded */
function checkV2PhaseBudget(phase: CorePhase, durationMs: number): void {
  const budgetMs = getV2PhaseBudgetMs(phase, agentConfig);
  if (budgetMs > 0 && durationMs > budgetMs) {
    const overage = Math.round(((durationMs - budgetMs) / budgetMs) * 100);
    observe("inefficiency", `${phase.toUpperCase()} exceeded budget: ${Math.round(durationMs / 1000)}s vs ${Math.round(budgetMs / 1000)}s (+${overage}%)`, {
      phase, source: "session-runner.ts:phase-budget",
      data: { phase, durationMs, budgetMs, overage },
    });
  }
}

// ── V2 Substage Runner ────────────────────────────

function createSubstage(name: "engage" | "gate" | "publish"): ActSubstageState {
  return {
    substage: name,
    status: "pending" as SubstageStatus,
  };
}

function startSubstage(sub: ActSubstageState): void {
  sub.status = "running";
  sub.startedAt = new Date().toISOString();
}

function completeSubstage(sub: ActSubstageState, result?: any): void {
  sub.status = "completed";
  sub.completedAt = new Date().toISOString();
  sub.durationMs = sub.startedAt ? Date.now() - new Date(sub.startedAt).getTime() : 0;
  sub.result = result;
}

function failSubstage(sub: ActSubstageState, failureCode: string): void {
  sub.status = "failed";
  sub.completedAt = new Date().toISOString();
  sub.durationMs = sub.startedAt ? Date.now() - new Date(sub.startedAt).getTime() : 0;
  sub.failureCode = failureCode;
}

function skipSubstage(sub: ActSubstageState): void {
  sub.status = "skipped";
  sub.durationMs = 0;
}

async function runCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number; env?: Record<string, string | undefined> } = {}
): Promise<ToolResult> {
  const { cwd, timeout = 120_000, env = {} } = options;

  return new Promise<ToolResult>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    let exited = false;
    let settled = false;
    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const settleResolve = (result: ToolResult) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch { /* no-op */ }
      setTimeout(() => {
        if (!exited) {
          try { child.kill("SIGKILL"); } catch { /* no-op */ }
        }
      }, 2_000);
      settleReject(new ToolError(command, -1, `Timed out after ${timeout}ms`));
    }, timeout);

    child.on("error", (err) => {
      clearTimeout(timer);
      settleReject(new ToolError(command, -1, err.message));
    });

    child.on("close", (code) => {
      exited = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");
      const exitCode = code ?? 1;

      if (exitCode !== 0) {
        settleReject(new ToolError(command, exitCode, stderr));
        return;
      }
      settleResolve({ stdout, stderr, exitCode });
    });
  });
}

async function runToolViaTmux(
  toolPath: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number; env?: Record<string, string | undefined> } = {}
): Promise<ToolResult> {
  const { cwd = REPO_ROOT, timeout = 120_000, env = {} } = options;
  const resolvedTool = resolve(cwd, toolPath);
  const tempDir = mkdtempSync(resolve(tmpdir(), "session-runner-tmux-"));
  const stdoutPath = resolve(tempDir, "stdout.log");
  const stderrPath = resolve(tempDir, "stderr.log");
  const exitPath = resolve(tempDir, "exit.code");
  const sessionName = `${runnerAgentName}-runner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  const quotedCommand = [process.execPath, "--import", "tsx", resolvedTool, ...args].map(shellQuote).join(" ");
  const envPrefix = Object.entries(env)
    .filter(([key, value]) => isSafeEnvKey(key) && value !== undefined)
    .map(([key, value]) => `${key}=${shellQuote(value as string)}`)
    .join(" ");
  const execCommand = envPrefix ? `${envPrefix} ${quotedCommand}` : quotedCommand;
  const shellCommand =
    `cd ${shellQuote(cwd)} && ` +
    `${execCommand} > ${shellQuote(stdoutPath)} 2> ${shellQuote(stderrPath)}; ` +
    `printf '%s' $? > ${shellQuote(exitPath)}`;

  try {
    await runCommand(
      "tmux",
      ["new-session", "-d", "-P", "-F", "#{session_name}", "-s", sessionName, shellCommand],
      { cwd, timeout: 10_000 }
    );

    const deadline = Date.now() + timeout;
    while (!existsSync(exitPath) && Date.now() < deadline) {
      await sleep(250);
    }

    if (!existsSync(exitPath)) {
      throw new ToolError(toolPath, -1, `Timed out after ${timeout}ms`);
    }

    const stdout = existsSync(stdoutPath) ? readFileSync(stdoutPath, "utf-8") : "";
    const stderr = existsSync(stderrPath) ? readFileSync(stderrPath, "utf-8") : "";
    const exitRaw = readFileSync(exitPath, "utf-8").trim();
    const exitCode = Number.parseInt(exitRaw, 10);
    if (Number.isNaN(exitCode)) {
      throw new ToolError(toolPath, -1, "tmux backend did not report an exit code");
    }
    if (exitCode !== 0) {
      throw new ToolError(toolPath, exitCode, stderr);
    }

    return { stdout, stderr, exitCode };
  } finally {
    try {
      await runCommand("tmux", ["kill-session", "-t", sessionName], { timeout: 5_000 });
    } catch {
      // Session may already have exited or been cleaned up.
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup.
    }
  }
}

async function runToolViaTmuxCli(
  toolPath: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number; env?: Record<string, string | undefined> } = {}
): Promise<ToolResult> {
  const { cwd = REPO_ROOT, timeout = 120_000, env = {} } = options;
  const resolvedTool = resolve(cwd, toolPath);
  const tempDir = mkdtempSync(resolve(tmpdir(), "session-runner-tmux-cli-"));
  const stdoutPath = resolve(tempDir, "stdout.log");
  const stderrPath = resolve(tempDir, "stderr.log");
  const exitPath = resolve(tempDir, "exit.code");

  const quotedCommand = [process.execPath, "--import", "tsx", resolvedTool, ...args].map(shellQuote).join(" ");
  const envPrefix = Object.entries(env)
    .filter(([key, value]) => isSafeEnvKey(key) && value !== undefined)
    .map(([key, value]) => `${key}=${shellQuote(value as string)}`)
    .join(" ");
  const execCommand = envPrefix ? `${envPrefix} ${quotedCommand}` : quotedCommand;
  const shellCommand =
    `cd ${shellQuote(cwd)} && ` +
    `${execCommand} > ${shellQuote(stdoutPath)} 2> ${shellQuote(stderrPath)}; ` +
    `printf '%s' $? > ${shellQuote(exitPath)}`;

  const timeoutSeconds = Math.max(1, Math.ceil(timeout / 1000));

  try {
    await runCommand("tmux-cli", ["execute", shellCommand, `--timeout=${timeoutSeconds}`], {
      cwd,
      timeout: timeout + 15_000,
    });

    const deadline = Date.now() + 2_000;
    while (!existsSync(exitPath) && Date.now() < deadline) {
      await sleep(100);
    }

    if (!existsSync(exitPath)) {
      throw new ToolError(toolPath, -1, `tmux-cli backend did not report an exit code`);
    }

    const stdout = existsSync(stdoutPath) ? readFileSync(stdoutPath, "utf-8") : "";
    const stderr = existsSync(stderrPath) ? readFileSync(stderrPath, "utf-8") : "";
    const exitRaw = readFileSync(exitPath, "utf-8").trim();
    const exitCode = Number.parseInt(exitRaw, 10);
    if (Number.isNaN(exitCode)) {
      throw new ToolError(toolPath, -1, "tmux-cli backend returned an invalid exit code");
    }
    if (exitCode !== 0) {
      throw new ToolError(toolPath, exitCode, stderr);
    }

    return { stdout, stderr, exitCode };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup.
    }
  }
}

async function runToolWithBackend(
  toolPath: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number; env?: Record<string, string | undefined> } = {}
): Promise<ToolResult> {
  if (runnerExecBackend === "tmux") {
    if (resolveTmuxAdapter() === "tmux-cli") {
      return runToolViaTmuxCli(toolPath, args, options);
    }
    return runToolViaTmux(toolPath, args, options);
  }
  return runTool(toolPath, args, options);
}

async function runToolAndParse(
  toolPath: string,
  args: string[],
  label: string
): Promise<any> {
  info(`Running ${label}...`);
  const result = await runToolWithBackend(toolPath, args, {
    cwd: REPO_ROOT,
    timeout: 180_000,
    env: { AGENT_NAME: runnerAgentName },
  });

  if (result.stderr.trim()) {
    for (const line of result.stderr.trim().split("\n")) {
      console.error(`  ${line}`);
    }
  }

  const stdout = result.stdout.trim();
  if (!stdout) return {};
  return parseToolJsonOutput(stdout, label);
}

// ── DEPRECATED: V1 8-Phase + V2 Loop ─────────────────
//
// V1 (8-phase: AUDIT→SCAN→ENGAGE→GATE→PUBLISH→VERIFY→REVIEW→HARDEN) and
// V2 (3-phase: SENSE→ACT→CONFIRM with legacy wiring) were removed in Phase 15e.
// All session-runner invocations now use V3 (the default since Phase 12).
// The removed code (~3000 lines) is preserved in git history at commit before this one.
//
// If you need V1/V2 behavior, check out the prior commit.

function v1v2DeprecationError(version: number): never {
  throw new Error(
    `Loop version ${version} has been retired (Phase 15e). ` +
    `Use --loop-version 3 (default) or remove --loop-version / --legacy-loop flags. ` +
    `V1/V2 code preserved in git history.`
  );
}

async function runAudit(_state: SessionState, _flags: RunnerFlags): Promise<void> { v1v2DeprecationError(1); }
function writeV3SessionReport(state: V3SessionState, oversight: OversightLevel, sessionsDir?: string): void {
  const sessDir = sessionsDir || resolve(homedir(), `.${state.agentName}`, "sessions");
  mkdirSync(sessDir, { recursive: true });
  const reportPath = resolve(sessDir, `session-${state.sessionNumber}-report.md`);

  const duration = ((Date.now() - new Date(state.startedAt).getTime()) / 60000).toFixed(1);
  const date = new Date(state.startedAt).toISOString().slice(0, 10);
  const lines: string[] = [];

  const sense = (state.phases.sense?.result || {}) as any;
  const act = (state.phases.act?.result || {}) as any;
  const confirm = (state.phases.confirm?.result || {}) as any;
  const plannedActions = (state.strategyResults?.planResult as any)?.actions || [];
  const executedActions = Array.isArray(act.executed) ? act.executed : [];
  const actionCounts = new Map<string, number>();

  for (const item of executedActions) {
    const type = item?.action?.type;
    if (typeof type === "string") {
      actionCounts.set(type, (actionCounts.get(type) || 0) + 1);
    }
  }

  lines.push(`# ${state.agentName.charAt(0).toUpperCase() + state.agentName.slice(1)} Session ${state.sessionNumber} — ${date} (v3)`);
  lines.push("");
  lines.push(`**Duration:** ${duration} min | **Posts:** ${state.posts.length} | **Oversight:** ${oversight} | **Loop:** v3${state.publishSuppressed ? " (shadow)" : ""}`);
  lines.push("");

  lines.push("## 1. SENSE");
  if (sense.scan?.activity) {
    lines.push(`- ${sense.scan.activity.level || "?"} activity (${sense.scan.activity.posts_per_hour ?? "?"} posts/hr)`);
  } else {
    lines.push("- No scan data");
  }
  if (sense.strategy?.evidence) {
    lines.push(`- ${(sense.strategy.evidence || []).length} evidence item(s) available`);
  }
  lines.push("");

  lines.push("## 2. ACT");
  lines.push(`- Planned actions: ${plannedActions.length}`);
  if (plannedActions.length > 0) {
    for (const a of plannedActions) {
      const target = a.target ? ` → ${String(a.target).slice(0, 16)}...` : "";
      lines.push(`  - **${a.type}** p=${a.priority}${target} — ${String(a.reason || "").slice(0, 100)}`);
    }
  }
  if (act.skipped === true) {
    lines.push(`- Skipped: ${act.reason || "unknown"}`);
  } else if (actionCounts.size > 0) {
    for (const [type, count] of actionCounts.entries()) {
      lines.push(`- ${type}: ${count}`);
    }
  } else {
    lines.push("- No actions executed");
  }
  // NEW-3: Include skip reasons for visibility
  const skippedActions = Array.isArray(act.skipped) ? act.skipped : [];
  if (skippedActions.length > 0) {
    lines.push(`- Skipped: ${skippedActions.length}`);
    for (const s of skippedActions.slice(0, 10)) {
      const type = s?.action?.type ?? "?";
      const reason = String(s?.reason ?? "unknown").slice(0, 100);
      lines.push(`  - ${type}: ${reason}`);
    }
  }
  lines.push("");

  lines.push("## 3. CONFIRM");
  if (confirm.skipped) {
    lines.push("- Skipped (no posts)");
  } else if (confirm.verify?.summary) {
    lines.push(`- ${confirm.verify.summary.verified || 0}/${confirm.verify.summary.total || 0} verified in feed`);
    lines.push(`- ${(confirm.performance || []).length} performance score(s) computed`);
  } else {
    lines.push("- No verification data");
  }
  lines.push("");

  // M6: Include errors from failed phases for post-mortem
  const failedPhases = Object.entries(state.phases)
    .filter(([, p]) => p?.status === "failed" && p?.error)
    .map(([name, p]) => `- **ERROR (${name}):** ${(p as any).error}`);
  if (failedPhases.length > 0) {
    lines.push("## Errors");
    lines.push(...failedPhases);
    lines.push("");
  }

  writeFileSync(reportPath, lines.join("\n"));
  info(`V3 session report written to ${reportPath}`);
}

function dryRunV3(sessionNumber: number, flags: RunnerFlags, startPhase: CorePhase | null): void {
  banner(sessionNumber, flags.oversight, flags.agent);
  console.log(`  MODE: dry-run (v3 loop, 3 phases)${flags.shadow ? " [SHADOW]" : ""}\n`);

  let started = startPhase === null;
  for (let i = 0; i < CORE_PHASE_ORDER.length; i++) {
    const phase = CORE_PHASE_ORDER[i];
    if (!started && phase === startPhase) started = true;
    if (!started) {
      console.log(`  ${i + 1}. ${phase.toUpperCase()} — SKIPPED`);
      continue;
    }
    console.log(`  ${i + 1}. ${phase.toUpperCase()}`);
  }
  console.log();
}

// ── Dry Run ────────────────────────────────────────

function dryRun(_sessionNumber: number, _flags: RunnerFlags, _startPhase: PhaseName | null): void {
  v1v2DeprecationError(1);
}

// ── Main Orchestrator ──────────────────────────────

async function main(): Promise<void> {
  const flags = parseArgs();
  runnerAgentName = flags.agent;
  runnerExecBackend = flags.execBackend;
  if (runnerExecBackend === "tmux") {
    info(`tmux backend adapter: ${resolveTmuxAdapter()}`);
  }
  setLogAgent(flags.agent);

  agentConfig = loadAgentConfig(flags.agent);
  IMPROVEMENTS_PATH = agentConfig.paths.improvementsFile;
  const sessionsDir = agentConfig.paths.sessionDir;

  let state: AnySessionState;
  let sessionNumber: number;
  let startPhase: PhaseName | CorePhase | null = null;

  if (flags.resume) {
    const active = findActiveSession(sessionsDir, flags.agent);
    if (!active) {
      console.error("Error: no active session to resume. Start a new session without --resume.");
      process.exit(1);
    }

    // Resume guard: block cross-version resume (Codex #6)
    try {
      validateResumeVersion(active, flags.loopVersion);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `Error: ${message}\n` +
        `Cross-version resume is not supported.`
      );
      process.exit(1);
    }

    state = active;
    sessionNumber = state.sessionNumber;

    try {
      acquireLock(sessionNumber, sessionsDir, flags.agent);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("is locked by PID")) {
        console.error(`Error: ${message}`);
        process.exit(1);
      }
      throw e;
    }

    state.pid = process.pid;
    saveState(state, sessionsDir);

    startPhase = getNextPhase(state) as PhaseName | CorePhase | null;
    if (!startPhase) {
      console.log("Session already complete — nothing to resume.");
      clearState(sessionNumber, sessionsDir, flags.agent);
      process.exit(0);
    }
    info(`Resuming session ${sessionNumber} from ${startPhase.toUpperCase()}`);
  } else {
    sessionNumber = getNextSessionNumber();

    if (flags.skipTo) {
      const phases = (flags.loopVersion === 3 ? CORE_PHASE_ORDER : getPhaseOrder()) as string[];
      const auditIdx = phases.indexOf("audit");
      const skipIdx = phases.indexOf(flags.skipTo);

      if (flags.loopVersion === 1 && skipIdx > auditIdx && !flags.forceSkipAudit) {
        console.error(
          `Error: --skip-to ${flags.skipTo} skips AUDIT phase.\n` +
          `AGENT.yaml hard rule: "Never skip audit phase."\n` +
          `Add --force-skip-audit to explicitly acknowledge skipping AUDIT.`
        );
        process.exit(1);
      }
      startPhase = flags.skipTo;
    }

    if (flags.dryRun) {
      if (flags.loopVersion !== 3) v1v2DeprecationError(flags.loopVersion);
      dryRunV3(sessionNumber, flags, startPhase as CorePhase | null);
      process.exit(0);
    }

    state = startSession(sessionNumber, flags.agent, sessionsDir, flags.loopVersion);
    info(`Started session ${sessionNumber} (loop v${flags.loopVersion})`);

    if (startPhase && !isV2(state)) {
      const phases = getPhaseOrder(state);
      for (const phase of phases) {
        if (phase === startPhase) break;
        completePhase(state, phase as PhaseName | CorePhase, { skipped: true, reason: `--skip-to ${startPhase}` }, sessionsDir);
      }
    }
  }

  // Initialize observation logging for this session
  initObserver(flags.agent, sessionNumber);

  // Build extension hook registry from plugin files (Phase 5 — skill loader).
  // Dynamic imports keep SDK transitive deps out of the extensions.ts module graph.
  const extensionRegistry = await loadExtensions({
    enabledExtensions: agentConfig.loopExtensions,
    runTool: runToolAndParse,
  });

  banner(sessionNumber, flags.oversight, flags.agent);
  if (isV3(state)) {
    console.log(`  Loop: v3 (SENSE → ACT → CONFIRM)${flags.shadow ? " [SHADOW]" : ""}`);
  } else if (isV2(state)) {
    console.log(`  Loop: v2 (SENSE → ACT → CONFIRM)${flags.shadow ? " [SHADOW]" : ""}`);
  }

  // H1: Configurable session timeout — default 300s for multi-publish sessions
  const SESSION_TIMEOUT_MS = ((agentConfig as any).sessionTimeoutSec ?? 300) * 1000;
  const sessionTimer = setTimeout(() => {
    console.error(`\n  ⏰ SESSION TIMEOUT (${SESSION_TIMEOUT_MS / 1000}s) — saving state and exiting`);
    saveState(state, sessionsDir);
    try { if (isV3(state)) writeV3SessionReport(state, flags.oversight, sessionsDir); } catch { /* best-effort */ }
    try { releaseLock(sessionNumber, sessionsDir, flags.agent); } catch { /* best-effort */ }
    console.error(`  Resume with: npx tsx cli/session-runner.ts --agent ${flags.agent} --resume --pretty`);
    process.exit(2);
  }, SESSION_TIMEOUT_MS);
  sessionTimer.unref(); // Don't prevent clean exit

  let shuttingDown = false;
  process.on("SIGINT", () => {
    if (shuttingDown) process.exit(1);
    shuttingDown = true;
    console.log("\n\n  ⚠️ Interrupted — saving state...");
    saveState(state, sessionsDir);
    console.log(`  Resume with: npx tsx tools/session-runner.ts --agent ${flags.agent} --resume${isV2(state) ? " --loop-version 2" : ""} --pretty`);
    console.log();
    process.exit(0);
  });

  // Only create readline for modes that need it
  const needsReadline = flags.oversight !== "autonomous";
  const rl = needsReadline
    ? createInterface({ input: stdin, output: stdout })
    : null;

  try {
    if (isV3(state)) {
      await runV3Loop(state as V3SessionState, {
        agent: flags.agent,
        env: flags.env,
        log: flags.log,
        dryRun: flags.dryRun,
        pretty: flags.pretty,
        shadow: flags.shadow,
        oversight: flags.oversight,
      }, sessionsDir, extensionRegistry, {
        runSubprocess: runToolAndParse,
        connectWallet,
        resolveProvider,
        agentConfig,
        getSourceView,
        observe: (type, msg, meta) => observe(type as ObservationType, msg, meta as ObserveOptions),
      });

      rl?.close();

      const duration = ((Date.now() - new Date(state.startedAt).getTime()) / 60000).toFixed(1);
      console.log("\n" + "═".repeat(50));
      console.log("  SESSION COMPLETE (v3)");
      console.log("═".repeat(50));
      console.log(`  Session: ${sessionNumber}`);
      console.log(`  Oversight: ${flags.oversight}`);
      console.log(`  Duration: ${duration} min`);
      console.log(`  Posts: ${state.posts.length}`);

      const actResult = (state.phases.act?.result || {}) as any;
      if (actResult.skipped === true) {
        console.log(`  Act: skipped (${actResult.reason || "unknown"})`);
      } else {
        console.log(`  Act: ${Array.isArray(actResult.executed) ? actResult.executed.length : 0} executed, ${Array.isArray(actResult.skipped) ? actResult.skipped.length : 0} skipped`);
      }

      const confirmResult = (state.phases.confirm?.result || {}) as any;
      if (!confirmResult.skipped && confirmResult.verify?.summary) {
        console.log(`  Verified: ${confirmResult.verify.summary.verified || 0}/${confirmResult.verify.summary.total || 0}`);
      }
      console.log("═".repeat(50) + "\n");

      try {
        writeV3SessionReport(state, flags.oversight, sessionsDir);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        info(`Warning: could not write session report: ${message}`);
      }
    } else {
      v1v2DeprecationError(isV2(state) ? 2 : 1);
    }

    clearTimeout(sessionTimer);
    incrementSessionNumber();
    clearState(sessionNumber, sessionsDir, flags.agent);
    info("Session state cleared.");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    rl?.close();
    saveState(state, sessionsDir);
    // C1: Write report even on failure so post-mortem is possible
    try {
      if (isV3(state)) writeV3SessionReport(state, flags.oversight, sessionsDir);
    } catch { /* non-fatal — report is best-effort on error path */ }
    console.error(`\nFATAL: ${message}`);
    console.error(`Session state saved. Resume with: npx tsx cli/session-runner.ts --agent ${flags.agent} --resume --pretty`);
    process.exit(1);
  } finally {
    // H2: Always release lock — prevent stale locks blocking future sessions
    clearTimeout(sessionTimer);
    try { releaseLock(sessionNumber, sessionsDir, flags.agent); } catch { /* best-effort */ }
  }
}

main().catch((e) => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
