import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { PublishResult, ReactionType, ToolResult } from "../../../src/toolkit/types.js";
import { connect } from "./connect.js";
import type { ConnectOptions, OmniWeb } from "./colony.js";
import { runDirectAttestedWrite } from "./direct-attested-write.js";
import type { MinimalAttestationPlan } from "./minimal-attestation-plan.js";
import { getPrimaryAttestUrl } from "./minimal-attestation-plan.js";
import type { PublishVisibilityResult } from "./publish-visibility.js";
import { verifyPublishVisibility } from "./publish-visibility.js";
import {
  getDefaultSessionLedgerDir,
  loadRecentSessionResults,
  writeSessionLedgerJson,
  type SessionLedgerResult,
} from "./session-ledger.js";

export type MinimalAgentState = Record<string, unknown>;
export type MinimalAuditSection = Record<string, unknown>;

export interface MinimalAuditPayload {
  inputs?: MinimalAuditSection;
  selectedEvidence?: MinimalAuditSection;
  promptPacket?: MinimalAuditSection;
  notes?: string[];
}

export interface MinimalCycleSummary {
  id: string;
  iteration: number;
  startedAt: string;
  finishedAt: string;
  decisionKind: MinimalObserveResult["kind"];
  actionType?: MinimalActionType | "skip";
  status: MinimalCycleStatus;
  txHash?: string;
  attestationTxHash?: string;
  attestationResponseHash?: string;
  verificationPath?: PublishVisibilityResult["verificationPath"] | MinimalReactionVerification["verificationPath"];
  visible?: boolean;
  indexedVisible?: boolean;
  observedScore?: number;
  errorStage?: MinimalErrorStage;
  errorMessage?: string;
}

export interface MinimalAgentMemory<TState extends MinimalAgentState = MinimalAgentState> {
  state: TState | null;
  lastCycle: MinimalCycleSummary | null;
}

export interface MinimalCycleContext {
  id: string;
  iteration: number;
  startedAt: string;
  stateDir: string;
  sessionId: string;
  sessionDir: string;
  dryRun: boolean;
}

export interface MinimalSessionLedgerContext {
  sessionId: string;
  sessionDir: string;
  recentResults: SessionLedgerResult[];
}

export interface MinimalObserveContext<TState extends MinimalAgentState = MinimalAgentState> {
  omni: OmniWeb;
  cycle: MinimalCycleContext;
  memory: MinimalAgentMemory<TState>;
  ledger: MinimalSessionLedgerContext;
}

interface BaseDecision<TState extends MinimalAgentState = MinimalAgentState> {
  facts?: Record<string, unknown>;
  audit?: MinimalAuditPayload;
  attestationPlan?: MinimalAttestationPlan;
  nextState?: TState;
}

export type MinimalActionType = "publish" | "reply" | "react" | "tip" | "bet";

export interface MinimalActionIntent {
  type: MinimalActionType;
  category?: string;
  text?: string;
  attestUrl?: string;
  tags?: string[];
  confidence?: number;
  parentTxHash?: string;
  targetTxHash?: string;
  reaction?: Exclude<ReactionType, null>;
  amount?: number;
  marketId?: string;
}

export interface MinimalActionReadiness {
  requiresWallet?: boolean;
  requiresAttestation?: boolean;
  requiresTargetPost?: boolean;
  requiresMarketContext?: boolean;
}

export interface ActionIntentDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "action";
  action: MinimalActionIntent;
  readiness?: MinimalActionReadiness;
}

export interface SkipDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "skip";
  reason: string;
}

export interface PublishDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "publish";
  category: string;
  text: string;
  attestUrl: string;
  tags?: string[];
  confidence?: number;
}

export interface ReplyDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "reply";
  parentTxHash: string;
  text: string;
  attestUrl: string;
  category?: string;
}

export interface ReactDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "react";
  targetTxHash: string;
  reaction: Exclude<ReactionType, null>;
}

export type MinimalObserveResult<TState extends MinimalAgentState = MinimalAgentState> =
  | SkipDecision<TState>
  | PublishDecision<TState>
  | ReplyDecision<TState>
  | ReactDecision<TState>
  | ActionIntentDecision<TState>;

export type MinimalObserveFn<TState extends MinimalAgentState = MinimalAgentState> = (
  ctx: MinimalObserveContext<TState>,
) => Promise<MinimalObserveResult<TState>>;

export type MinimalCycleStatus = "skipped" | "dry_run" | "published" | "replied" | "reacted" | "failed";

export interface MinimalReactionVerification {
  attempted: boolean;
  visible: boolean;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
  txHash: string;
  verificationPath: "reaction_counts";
  reactionType: Exclude<ReactionType, null>;
  before: {
    agree: number;
    disagree: number;
    flag: number;
    myReaction?: string | null;
  } | null;
  after: {
    agree: number;
    disagree: number;
    flag: number;
    myReaction?: string | null;
  } | null;
  error?: string;
}

export type MinimalErrorStage = "connect" | "observe" | "execute" | "verify";

export interface MinimalVerificationOptions {
  timeoutMs?: number;
  pollMs?: number;
  limit?: number;
}

interface MinimalRuntimeSharedOptions<TState extends MinimalAgentState = MinimalAgentState> {
  connectOptions?: ConnectOptions;
  connectFn?: (opts?: ConnectOptions) => Promise<OmniWeb>;
  stateDir?: string;
  sessionLedgerDir?: string;
  sessionSlug?: string;
  cwd?: string;
  dryRun?: boolean;
  verification?: MinimalVerificationOptions;
  now?: () => number;
}

export interface RunMinimalAgentCycleOptions<TState extends MinimalAgentState = MinimalAgentState>
  extends MinimalRuntimeSharedOptions<TState> {
  cycleId?: string;
  omni?: OmniWeb;
}

export interface RunMinimalAgentLoopOptions<TState extends MinimalAgentState = MinimalAgentState>
  extends MinimalRuntimeSharedOptions<TState> {
  intervalMs?: number;
  maxIterations?: number;
  omni?: OmniWeb;
  sleep?: (ms: number) => Promise<void>;
}

export interface MinimalCycleRecord<TState extends MinimalAgentState = MinimalAgentState> {
  version: 1;
  cycleId: string;
  sessionId: string;
  iteration: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  dryRun: boolean;
  stateDir: string;
  sessionDir: string;
  decision: MinimalObserveResult<TState>;
  memoryBefore: MinimalAgentMemory<TState>;
  memoryAfter: MinimalAgentMemory<TState>;
  outcome: {
    status: MinimalCycleStatus;
    txHash?: string;
    attestationTxHash?: string;
    attestationResponseHash?: string;
    demSpendEstimate?: number;
    verification?: PublishVisibilityResult | MinimalReactionVerification;
    publishResult?: ToolResult<PublishResult>;
    reactionResult?: { ok: boolean; error?: unknown };
    error?: {
      stage: MinimalErrorStage;
      message: string;
      code?: string;
      retryable?: boolean;
    };
  };
}

type MinimalVerificationResult = NonNullable<MinimalCycleRecord["outcome"]["verification"]>;

interface StoredMinimalState<TState extends MinimalAgentState = MinimalAgentState> {
  version: 1;
  updatedAt: string;
  iteration: number;
  agentState: TState | null;
  lastCycle: MinimalCycleSummary | null;
}

const DEFAULT_INTERVAL_MS = 300_000;
const DEFAULT_STATE_DIR = ".omniweb-agent";
const DEFAULT_VERIFICATION_TIMEOUT_MS = 45_000;
const DEFAULT_VERIFICATION_POLL_MS = 5_000;
const DEFAULT_VERIFICATION_LIMIT = 50;
const PLACEHOLDER_ATTEST_HOSTS = new Set(["example.com", "www.example.com"]);

export function normalizeDecisionToActionIntent<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): ActionIntentDecision<TState> | null {
  if (decision.kind === "skip") return null;

  if (decision.kind === "action") {
    return decision;
  }

  if (decision.kind === "react") {
    return null;
  }

  if (decision.kind === "publish") {
    return {
      kind: "action",
      action: {
        type: "publish",
        category: decision.category,
        text: decision.text,
        attestUrl: decision.attestUrl,
        tags: decision.tags,
        confidence: decision.confidence,
      },
      facts: decision.facts,
      audit: decision.audit,
      attestationPlan: decision.attestationPlan,
      nextState: decision.nextState,
      readiness: {
        requiresWallet: true,
        requiresAttestation: true,
      },
    };
  }

  return {
    kind: "action",
    action: {
      type: "reply",
      parentTxHash: decision.parentTxHash,
      text: decision.text,
      attestUrl: decision.attestUrl,
      category: decision.category,
    },
    facts: decision.facts,
    audit: decision.audit,
    attestationPlan: decision.attestationPlan,
    nextState: decision.nextState,
    readiness: {
      requiresWallet: true,
      requiresAttestation: true,
      requiresTargetPost: true,
    },
  };
}

export function getDefaultMinimalStateDir(cwd?: string): string {
  return resolve(cwd ?? process.cwd(), DEFAULT_STATE_DIR);
}

export async function runMinimalAgentCycle<TState extends MinimalAgentState = MinimalAgentState>(
  observe: MinimalObserveFn<TState>,
  opts: RunMinimalAgentCycleOptions<TState> = {},
): Promise<MinimalCycleRecord<TState>> {
  const now = opts.now ?? Date.now;
  const stateDir = resolveStateDir(opts.stateDir, opts.cwd);
  const sessionLedgerDir = resolveSessionLedgerDir(opts.sessionLedgerDir, opts.cwd);
  const previous = await loadStoredState<TState>(stateDir);
  const recentResults = await loadRecentSessionResults(sessionLedgerDir, 3);
  const memoryBefore: MinimalAgentMemory<TState> = {
    state: previous.agentState,
    lastCycle: previous.lastCycle,
  };
  const iteration = previous.iteration + 1;
  const startedAtMs = now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cycleId = opts.cycleId ?? buildCycleId(iteration, startedAtMs);
  const sessionId = buildSessionId(iteration, startedAtMs, resolveSessionSlug(opts));
  const sessionDir = resolve(sessionLedgerDir, sessionId);
  const cycle: MinimalCycleContext = {
    id: cycleId,
    iteration,
    startedAt,
    stateDir,
    sessionId,
    sessionDir,
    dryRun: opts.dryRun === true,
  };

  let omni = opts.omni;
  if (!omni) {
    try {
      omni = await (opts.connectFn ?? connect)(opts.connectOptions);
    } catch (error) {
      const record = buildFailureRecord({
        cycle,
        startedAtMs,
        now,
        memoryBefore,
        decision: {
          kind: "skip",
          reason: "connect_failed",
          facts: {},
        } as MinimalObserveResult<TState>,
        error,
        stage: "connect",
      });
      await persistCycleArtifacts(stateDir, record);
      return record;
    }
  }

  let decision: MinimalObserveResult<TState>;
  try {
    decision = await observe({
      omni,
      cycle,
      memory: memoryBefore,
      ledger: {
        sessionId,
        sessionDir,
        recentResults,
      },
    });
  } catch (error) {
    const record = buildFailureRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      decision: {
        kind: "skip",
        reason: "observe_failed",
        facts: {},
      } as MinimalObserveResult<TState>,
      error,
      stage: "observe",
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (decision.kind === "skip") {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "skipped",
        demSpendEstimate: 0,
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (cycle.dryRun) {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "dry_run",
        demSpendEstimate: 0,
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  const actionDecision = normalizeDecisionToActionIntent(decision);

  const attestationGuardError = validateAttestationDecision(decision);
  if (attestationGuardError) {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "failed",
        demSpendEstimate: 0,
        error: {
          stage: "execute",
          message: attestationGuardError,
          retryable: false,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (decision.kind === "react" || actionDecision?.action.type === "react") {
    const targetTxHash = decision.kind === "react"
      ? decision.targetTxHash
      : actionDecision!.action.targetTxHash;
    const reactionType = decision.kind === "react"
      ? decision.reaction
      : actionDecision!.action.reaction ?? "agree";

    if (!targetTxHash) {
      const record = buildCompletedRecord({
        cycle,
        startedAtMs,
        now,
        memoryBefore,
        nextState: decision.nextState ?? memoryBefore.state,
        decision,
        outcome: {
          status: "failed",
          demSpendEstimate: 0,
          error: {
            stage: "execute",
            message: "missing_reaction_target",
            retryable: false,
          },
        },
      });
      await persistCycleArtifacts(stateDir, record);
      return record;
    }

    const beforeResult = await omni.colony.getReactions(targetTxHash);
    const before = normalizeReactionEnvelope(beforeResult?.ok === true ? beforeResult.data : undefined);
    const reactionResult = await omni.colony.react(targetTxHash, reactionType);
    const afterResult = await omni.colony.getReactions(targetTxHash);
    const after = normalizeReactionEnvelope(afterResult?.ok === true ? afterResult.data : undefined);
    const verification: MinimalReactionVerification = {
      attempted: true,
      visible: reactionResult?.ok === true,
      indexedVisible: reactionResult?.ok === true,
      polls: 1,
      elapsedMs: 0,
      txHash: targetTxHash,
      verificationPath: "reaction_counts",
      reactionType,
      before,
      after,
      error: reactionReadbackSatisfied(before, after, reactionType)
        ? undefined
        : reactionResult?.ok === true
          ? "reaction_readback_unconfirmed"
          : readApiErrorMessage(reactionResult?.error) ?? "reaction_failed",
    };

    if (reactionResult?.ok !== true) {
      const record = buildCompletedRecord({
        cycle,
        startedAtMs,
        now,
        memoryBefore,
        nextState: decision.nextState ?? memoryBefore.state,
        decision,
        outcome: {
          status: "failed",
          demSpendEstimate: 0,
          reactionResult: { ok: false, error: reactionResult?.error },
          verification,
          error: {
            stage: "execute",
            message: readApiErrorMessage(reactionResult?.error) ?? "reaction_failed",
            retryable: true,
          },
        },
      });
      await persistCycleArtifacts(stateDir, record);
      return record;
    }

    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "reacted",
        demSpendEstimate: 0,
        reactionResult: { ok: true },
        verification,
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (!actionDecision || (actionDecision.action.type !== "publish" && actionDecision.action.type !== "reply")) {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "failed",
        demSpendEstimate: 0,
        error: {
          stage: "execute",
          message: `unsupported_action_type:${actionDecision?.action.type ?? "unknown"}`,
          retryable: false,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  const directWrite = await runDirectAttestedWrite({
    omni,
    kind: actionDecision.action.type,
    draft: actionDecision.action.type === "publish"
      ? {
          text: actionDecision.action.text ?? "",
          category: actionDecision.action.category,
          attestUrl: actionDecision.action.attestUrl ?? "",
          tags: actionDecision.action.tags,
          confidence: actionDecision.action.confidence,
        }
      : {
          parentTxHash: actionDecision.action.parentTxHash,
          text: actionDecision.action.text ?? "",
          attestUrl: actionDecision.action.attestUrl ?? "",
          category: actionDecision.action.category,
        },
    verifyPublishVisibility,
    verification: {
      timeoutMs: opts.verification?.timeoutMs ?? DEFAULT_VERIFICATION_TIMEOUT_MS,
      pollMs: opts.verification?.pollMs ?? DEFAULT_VERIFICATION_POLL_MS,
      limit: opts.verification?.limit ?? DEFAULT_VERIFICATION_LIMIT,
    },
  });

  const publishResult = directWrite.result;

  if (!directWrite.accepted || !publishResult?.ok) {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        status: "failed",
        publishResult,
        demSpendEstimate: 0,
        error: {
          stage: "execute",
          message: publishResult?.error?.message ?? directWrite.error?.message ?? "publish_failed",
          code: publishResult?.error?.code ?? directWrite.error?.code,
          retryable: publishResult?.error?.retryable ?? directWrite.error?.retryable,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  const txHash = directWrite.txHash;
  const attestationTxHash = directWrite.attestationTxHash;
  const attestationResponseHash = directWrite.attestationResponseHash;
  const verification = directWrite.visibility as PublishVisibilityResult | undefined;

  const record = buildCompletedRecord({
    cycle,
    startedAtMs,
    now,
    memoryBefore,
    nextState: decision.nextState ?? memoryBefore.state,
    decision,
    outcome: {
      status: actionDecision.action.type === "publish" ? "published" : "replied",
      txHash,
      attestationTxHash,
      attestationResponseHash,
      demSpendEstimate: 1,
      publishResult,
      verification,
    },
  });
  await persistCycleArtifacts(stateDir, record);
  return record;
}

export async function runMinimalAgentLoop<TState extends MinimalAgentState = MinimalAgentState>(
  observe: MinimalObserveFn<TState>,
  opts: RunMinimalAgentLoopOptions<TState> = {},
): Promise<void> {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxIterations = opts.maxIterations ?? Number.POSITIVE_INFINITY;
  const sleep = opts.sleep ?? defaultSleep;
  const sharedOmni = opts.omni ?? await (opts.connectFn ?? connect)(opts.connectOptions);
  let running = true;

  const shutdown = () => {
    running = false;
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    let completed = 0;
    while (running && completed < maxIterations) {
      completed += 1;
      await runMinimalAgentCycle(observe, {
        ...opts,
        omni: sharedOmni,
      });
      if (running && completed < maxIterations) {
        await sleep(intervalMs);
      }
    }
  } finally {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  }
}

function resolveStateDir(stateDir: string | undefined, cwd: string | undefined): string {
  if (stateDir) return resolve(stateDir);
  return getDefaultMinimalStateDir(cwd);
}

async function loadStoredState<TState extends MinimalAgentState>(
  stateDir: string,
): Promise<StoredMinimalState<TState>> {
  const path = stateFilePath(stateDir);
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredMinimalState<TState>>;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      iteration: typeof parsed.iteration === "number" ? parsed.iteration : 0,
      agentState: isRecord(parsed.agentState) ? parsed.agentState as TState : null,
      lastCycle: isCycleSummary(parsed.lastCycle) ? parsed.lastCycle : null,
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return {
        version: 1,
        updatedAt: new Date(0).toISOString(),
        iteration: 0,
        agentState: null,
        lastCycle: null,
      };
    }
    throw error;
  }
}

async function persistCycleArtifacts<TState extends MinimalAgentState>(
  stateDir: string,
  record: MinimalCycleRecord<TState>,
): Promise<void> {
  const day = record.startedAt.slice(0, 10);
  const jsonPath = resolve(stateDir, "runs", day, `${record.cycleId}.json`);
  const markdownPath = resolve(stateDir, "runs", day, `${record.cycleId}.md`);
  const latestPath = resolve(stateDir, "runs", "latest.json");
  const statePath = stateFilePath(stateDir);
  const summary = summarizeCycle(record);

  const storedState: StoredMinimalState<TState> = {
    version: 1,
    updatedAt: record.finishedAt,
    iteration: record.iteration,
    agentState: record.memoryAfter.state,
    lastCycle: summary,
  };

  await writeJson(jsonPath, record);
  await writeText(markdownPath, renderCycleSummary(record));
  await writeJson(latestPath, record);
  await writeJson(statePath, storedState);
  await persistSessionLedger(record);
}

function buildCompletedRecord<TState extends MinimalAgentState>(args: {
  cycle: MinimalCycleContext;
  startedAtMs: number;
  now: () => number;
  memoryBefore: MinimalAgentMemory<TState>;
  nextState: TState | null;
  decision: MinimalObserveResult<TState>;
  outcome: MinimalCycleRecord<TState>["outcome"];
}): MinimalCycleRecord<TState> {
  const finishedAtMs = args.now();
  const finishedAt = new Date(finishedAtMs).toISOString();
  const summary = summarizeCycleFields({
    cycle: args.cycle,
    finishedAt,
    decision: args.decision,
    outcome: args.outcome,
  });

  return {
    version: 1,
    cycleId: args.cycle.id,
    sessionId: args.cycle.sessionId,
    iteration: args.cycle.iteration,
    startedAt: args.cycle.startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedAtMs - args.startedAtMs),
    dryRun: args.cycle.dryRun,
    stateDir: args.cycle.stateDir,
    sessionDir: args.cycle.sessionDir,
    decision: args.decision,
    memoryBefore: args.memoryBefore,
    memoryAfter: {
      state: args.nextState,
      lastCycle: summary,
    },
    outcome: args.outcome,
  };
}

function buildFailureRecord<TState extends MinimalAgentState>(args: {
  cycle: MinimalCycleContext;
  startedAtMs: number;
  now: () => number;
  memoryBefore: MinimalAgentMemory<TState>;
  decision: MinimalObserveResult<TState>;
  error: unknown;
  stage: MinimalErrorStage;
  nextState?: TState | null;
}): MinimalCycleRecord<TState> {
  const message = args.error instanceof Error ? args.error.message : String(args.error);
  return buildCompletedRecord({
    cycle: args.cycle,
    startedAtMs: args.startedAtMs,
    now: args.now,
    memoryBefore: args.memoryBefore,
    nextState: args.nextState ?? args.memoryBefore.state,
    decision: args.decision,
    outcome: {
      status: "failed",
      demSpendEstimate: 0,
      error: {
        stage: args.stage,
        message,
      },
    },
  });
}

function summarizeCycle<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): MinimalCycleSummary {
  return summarizeCycleFields({
    cycle: {
      id: record.cycleId,
      iteration: record.iteration,
      startedAt: record.startedAt,
      stateDir: record.stateDir,
      sessionId: record.sessionId,
      sessionDir: record.sessionDir,
      dryRun: record.dryRun,
    },
    finishedAt: record.finishedAt,
    decision: record.decision,
    outcome: record.outcome,
  });
}

function summarizeCycleFields<TState extends MinimalAgentState>(args: {
  cycle: MinimalCycleContext;
  finishedAt: string;
  decision: MinimalObserveResult<TState>;
  outcome: MinimalCycleRecord<TState>["outcome"];
}): MinimalCycleSummary {
  return {
    id: args.cycle.id,
    iteration: args.cycle.iteration,
    startedAt: args.cycle.startedAt,
    finishedAt: args.finishedAt,
    decisionKind: args.decision.kind,
    actionType: getDecisionActionType(args.decision),
    status: args.outcome.status,
    txHash: args.outcome.txHash,
    attestationTxHash: args.outcome.attestationTxHash,
    attestationResponseHash: args.outcome.attestationResponseHash,
    verificationPath: args.outcome.verification?.verificationPath,
    visible: args.outcome.verification?.visible,
    indexedVisible: args.outcome.verification?.indexedVisible,
    observedScore: getObservedScore(args.outcome.verification),
    errorStage: args.outcome.error?.stage,
    errorMessage: args.outcome.error?.message,
  };
}

function renderCycleSummary<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): string {
  const lines = [
    `# Cycle ${record.cycleId}`,
    "",
    `- Iteration: ${record.iteration}`,
    `- Started: ${record.startedAt}`,
    `- Finished: ${record.finishedAt}`,
    `- DurationMs: ${record.durationMs}`,
    `- DecisionKind: ${record.decision.kind}`,
    `- ActionType: ${getDecisionActionType(record.decision)}`,
    `- Outcome: ${record.outcome.status}`,
    `- DryRun: ${record.dryRun}`,
  ];

  if (record.decision.kind === "skip") {
    lines.push(`- SkipReason: ${record.decision.reason}`);
  } else if (record.decision.kind === "action") {
    if (record.decision.action.type === "react") {
      if (record.decision.action.targetTxHash) {
        lines.push(`- TargetTxHash: ${record.decision.action.targetTxHash}`);
      }
      if (record.decision.action.reaction) {
        lines.push(`- Reaction: ${record.decision.action.reaction}`);
      }
    } else {
      if (typeof record.decision.action.text === "string") {
        lines.push(`- Text: ${truncate(record.decision.action.text, 180)}`);
      }
      if (typeof record.decision.action.category === "string") {
        lines.push(`- Category: ${record.decision.action.category}`);
      }
    }
  } else if (record.decision.kind === "react") {
    lines.push(`- TargetTxHash: ${record.decision.targetTxHash}`);
    lines.push(`- Reaction: ${record.decision.reaction}`);
  } else {
    lines.push(`- Text: ${truncate(record.decision.text, 180)}`);
    if ("category" in record.decision && typeof record.decision.category === "string") {
      lines.push(`- Category: ${record.decision.category}`);
    }
  }

  if (record.outcome.txHash) {
    lines.push(`- TxHash: ${record.outcome.txHash}`);
  }

  if (record.outcome.attestationTxHash) {
    lines.push(`- AttestationTxHash: ${record.outcome.attestationTxHash}`);
  }

  if (record.outcome.attestationResponseHash) {
    lines.push(`- AttestationResponseHash: ${record.outcome.attestationResponseHash}`);
  }

  if (record.outcome.verification) {
    lines.push(`- Visible: ${record.outcome.verification.visible}`);
    lines.push(`- IndexedVisible: ${record.outcome.verification.indexedVisible}`);
    lines.push(`- VerificationPath: ${record.outcome.verification.verificationPath ?? "none"}`);
    lines.push(`- VerificationPolls: ${record.outcome.verification.polls}`);
    const observedScore = getObservedScore(record.outcome.verification);
    if (typeof observedScore === "number") {
      lines.push(`- ObservedScore: ${observedScore}`);
    }
    if (record.outcome.verification.error) {
      lines.push(`- VerificationNote: ${record.outcome.verification.error}`);
    }
  }

  if (record.outcome.error) {
    lines.push(`- ErrorStage: ${record.outcome.error.stage}`);
    lines.push(`- Error: ${record.outcome.error.message}`);
  }

  const factKeys = Object.keys(record.decision.facts ?? {});
  if (factKeys.length > 0) {
    lines.push(`- FactKeys: ${factKeys.join(", ")}`);
  }

  if (record.decision.attestationPlan) {
    lines.push(
      `- AttestationPlan: ${record.decision.attestationPlan.ready ? "ready" : "blocked"} (${record.decision.attestationPlan.reason})`,
    );
  }

  const auditSections = collectAuditSections(record.decision.audit);
  if (auditSections.length > 0) {
    lines.push(`- AuditSections: ${auditSections.join(", ")}`);
  }

  const nextStateKeys = Object.keys(record.memoryAfter.state ?? {});
  if (nextStateKeys.length > 0) {
    lines.push(`- NextStateKeys: ${nextStateKeys.join(", ")}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildCycleId(iteration: number, nowMs: number): string {
  const stamp = new Date(nowMs).toISOString().replace(/[:.]/g, "-");
  return `${stamp}-i${String(iteration).padStart(4, "0")}`;
}

function buildSessionId(iteration: number, nowMs: number, slug: string): string {
  const stamp = new Date(nowMs).toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${slug}-i${String(iteration).padStart(4, "0")}`;
}

function stateFilePath(stateDir: string): string {
  return resolve(stateDir, "state", "current.json");
}

function resolveSessionLedgerDir(sessionLedgerDir: string | undefined, cwd: string | undefined): string {
  if (sessionLedgerDir) return resolve(sessionLedgerDir);
  return getDefaultSessionLedgerDir(cwd);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf-8");
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectAuditSections(audit: MinimalAuditPayload | undefined): string[] {
  if (!audit) return [];

  const sections: string[] = [];
  if (hasKeys(audit.inputs)) sections.push("inputs");
  if (hasKeys(audit.selectedEvidence)) sections.push("selectedEvidence");
  if (hasKeys(audit.promptPacket)) sections.push("promptPacket");
  if (Array.isArray(audit.notes) && audit.notes.length > 0) sections.push("notes");
  return sections;
}

function hasKeys(value: Record<string, unknown> | undefined): boolean {
  if (!value) return false;
  return Object.keys(value).length > 0;
}

function normalizeReactionEnvelope(value: unknown): MinimalReactionVerification["before"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    agree: typeof record.agree === "number" ? record.agree : 0,
    disagree: typeof record.disagree === "number" ? record.disagree : 0,
    flag: typeof record.flag === "number" ? record.flag : 0,
    myReaction: typeof record.myReaction === "string" ? record.myReaction : null,
  };
}

function getObservedScore(verification?: MinimalVerificationResult): number | undefined {
  if (!verification || !("observedScore" in verification)) return undefined;
  return typeof verification.observedScore === "number" ? verification.observedScore : undefined;
}

function reactionReadbackSatisfied(
  before: MinimalReactionVerification["before"],
  after: MinimalReactionVerification["after"],
  expectedType: Exclude<ReactionType, null>,
): boolean {
  if (!after) return false;
  if (after.myReaction === expectedType) return true;
  return after[expectedType] > (before?.[expectedType] ?? 0);
}

function readApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : null;
}

function validateAttestationDecision<TState extends MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): string | null {
  const plan = decision.attestationPlan;
  if (plan && !plan.ready) {
    return `attestation_plan_not_ready:${plan.reason}`;
  }

  if (decision.kind === "publish" || decision.kind === "reply") {
    if (isPlaceholderAttestUrl(decision.attestUrl)) {
      return `placeholder_attest_url:${decision.attestUrl}`;
    }

    const plannedUrl = getPrimaryAttestUrl(plan);
    if (plannedUrl && plannedUrl !== decision.attestUrl) {
      return `attest_url_mismatch:${decision.attestUrl}`;
    }
  }

  if (decision.kind === "action" && decision.action.attestUrl) {
    if (isPlaceholderAttestUrl(decision.action.attestUrl)) {
      return `placeholder_attest_url:${decision.action.attestUrl}`;
    }

    const plannedUrl = getPrimaryAttestUrl(plan);
    if (plannedUrl && plannedUrl !== decision.action.attestUrl) {
      return `attest_url_mismatch:${decision.action.attestUrl}`;
    }
  }

  return null;
}

function getDecisionActionType<TState extends MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): MinimalActionType | "skip" {
  if (decision.kind === "skip") return "skip";
  if (decision.kind === "action") return decision.action.type;
  return decision.kind;
}

function isPlaceholderAttestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (PLACEHOLDER_ATTEST_HOSTS.has(parsed.hostname)) return true;
    return parsed.pathname.includes("example") || parsed.pathname.includes("placeholder");
  } catch {
    return true;
  }
}

function isCycleSummary(value: unknown): value is MinimalCycleSummary {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.iteration === "number"
    && typeof value.startedAt === "string"
    && typeof value.finishedAt === "string"
    && typeof value.decisionKind === "string"
    && typeof value.status === "string";
}

function isMissingFile(error: unknown): boolean {
  const candidate = error as { code?: unknown } | null;
  return Boolean(error)
    && typeof error === "object"
    && candidate?.code === "ENOENT";
}

function resolveSessionSlug<TState extends MinimalAgentState>(
  opts: MinimalRuntimeSharedOptions<TState>,
): string {
  const raw = opts.sessionSlug
    ?? opts.connectOptions?.agentName
    ?? process.env.AGENT_NAME
    ?? "agent";
  const normalized = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "agent";
}

async function persistSessionLedger<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): Promise<void> {
  const inputs = {
    version: 1,
    session_id: record.sessionId,
    cycle_id: record.cycleId,
    started_at: record.startedAt,
    dry_run: record.dryRun,
    state_dir: record.stateDir,
    session_dir: record.sessionDir,
    previous_cycle: record.memoryBefore.lastCycle,
  };

  const actionType = record.decision.kind === "action"
    ? record.decision.action.type
    : record.decision.kind;

  const decisions = {
    version: 1,
    session_id: record.sessionId,
    kind: record.decision.kind,
    action_type: actionType,
    facts: record.decision.facts ?? {},
    attestation_plan: record.decision.attestationPlan ?? null,
    next_state_keys: Object.keys(record.memoryAfter.state ?? {}),
  };

  const action = {
    version: 1,
    session_id: record.sessionId,
    action: actionType,
    status: record.outcome.status,
    tx_hash: record.outcome.txHash ?? null,
    target_tx_hash: record.decision.kind === "react"
      ? record.decision.targetTxHash
      : record.decision.kind === "action" && record.decision.action.type === "react"
        ? record.decision.action.targetTxHash ?? null
        : null,
    dem_spent: record.outcome.demSpendEstimate ?? 0,
    verification: record.outcome.verification ?? null,
    error: record.outcome.error ?? null,
  };

  await writeSessionLedgerJson(record.sessionDir, "inputs.json", inputs);
  await writeSessionLedgerJson(record.sessionDir, "decisions.json", decisions);
  await writeSessionLedgerJson(record.sessionDir, `actions/01-${actionType}.json`, action);
  const scorecardSummary = buildScorecardSummary(record);
  if (scorecardSummary) {
    await writeSessionLedgerJson(record.sessionDir, "scorecard.json", scorecardSummary);
  }
  await writeSessionLedgerJson(record.sessionDir, "result.json", buildSessionResult(record, scorecardSummary));
}

function buildSessionResult<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
  scorecardSummary: Record<string, unknown> | null,
): SessionLedgerResult {
  return {
    version: 1,
    session_id: record.sessionId,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    status: record.outcome.status,
    actions_taken: [record.decision.kind],
    dem_spent: record.outcome.demSpendEstimate ?? 0,
    scorecard_summary: scorecardSummary,
    stop_reasons: buildStopReasons(record),
    tx_hash: record.outcome.txHash,
    indexed_visible: record.outcome.verification?.indexedVisible,
    verification_path: record.outcome.verification?.verificationPath ?? null,
  };
}

function buildScorecardSummary<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): Record<string, unknown> | null {
  const verification = record.outcome.verification;
  const observedScore = getObservedScore(verification);
  if (typeof observedScore === "number") {
    return {
      observed_score: observedScore,
      indexed_visible: verification?.indexedVisible ?? false,
      verification_path: verification?.verificationPath ?? null,
    };
  }

  return null;
}

function buildStopReasons<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): string[] {
  const reasons = new Set<string>();
  const errorMessage = record.outcome.error?.message?.toLowerCase() ?? "";

  if (record.decision.kind === "skip") {
    reasons.add(record.decision.reason);
  }
  if (errorMessage.includes("no credentials file") || errorMessage.includes("demos_mnemonic")) {
    reasons.add("env_missing");
  }
  if (
    errorMessage.includes("timeout")
    || errorMessage.includes("fetch failed")
    || errorMessage.includes("request failed")
    || errorMessage.includes("network")
  ) {
    reasons.add("network_drift");
  }
  if (errorMessage.startsWith("placeholder_attest_url")) {
    reasons.add("placeholder_attest_url");
  }
  if (record.outcome.verification?.visible && !record.outcome.verification.indexedVisible) {
    reasons.add("indexer_lag");
  }

  return Array.from(reasons);
}
