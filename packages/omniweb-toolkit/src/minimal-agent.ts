import { resolve } from "node:path";
import type { PublishResult, ReactionType, ToolResult } from "../../../src/toolkit/types.js";
import {
  evaluateToolkitActionAdmissibilitySync,
  type ToolkitActionAdmissibilityReport,
} from "./action-admissibility.js";
import { connect } from "./connect.js";
import type { ConnectOptions, OmniWeb } from "./colony.js";
import {
  evaluateToolkitGuardrailsSync,
  type ToolkitGuardrailEvaluationReport,
} from "./guardrails.js";
import type {
  MinimalActionIntent,
  MinimalActionType,
  PolicyMarketBetKind,
  PolicyMarketDirection,
  ResolvedIntent,
} from "./intent-types.js";
import type { MinimalAttestationPlan } from "./minimal-attestation-plan.js";
import type { PublishVisibilityResult } from "./publish-visibility.js";
import {
  loadRecentSessionResults,
  type SessionLedgerResult,
} from "./session-ledger.js";
import { executeMinimalAction } from "./minimal-agent-executor.js";
import { planPolicyExecution } from "./policy/run.js";
import { buildInjectedRuntimeCapabilities } from "./injected-runtime-capabilities.js";
import type { WriteReadinessOptions } from "./readiness.js";
import {
  buildCompletedRecord,
  buildCycleId,
  buildFailureRecord,
  buildSessionId,
} from "./minimal-agent/cycle-records.js";
import {
  loadStoredState,
  persistCycleArtifacts,
  resolveSessionLedgerDir,
  resolveStateDir,
} from "./minimal-agent/persistence.js";

export type MinimalAgentState = Record<string, unknown>;
export type MinimalAuditSection = Record<string, unknown>;

export interface MinimalAuditPayload {
  inputs?: MinimalAuditSection;
  selectedEvidence?: MinimalAuditSection;
  promptPacket?: MinimalAuditSection;
  notes?: string[];
  policyId?: string;
  routeId?: string;
  matchedConditions?: string[];
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
  verificationPath?: PublishVisibilityResult["verificationPath"] | MinimalReactionVerification["verificationPath"] | MinimalTipVerification["verificationPath"] | MinimalMarketWriteVerification["verificationPath"];
  visibilitySurface?: PublishVisibilityResult["visibilitySurface"];
  visible?: boolean;
  indexedVisible?: boolean;
  postDetailVisible?: boolean;
  chainVisible?: boolean;
  tipConfirmationSurface?: MinimalTipVerification["tipConfirmationSurface"];
  tipStatsConverged?: boolean;
  recipientTipStatsConverged?: boolean;
  spendObserved?: boolean;
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

export type {
  MinimalActionType,
  MinimalActionIntent,
  MinimalActionReadiness,
  PolicyActionAudit,
  PolicyActionDraft,
  PolicyActionRequest,
  PolicyActionTarget,
  PolicyActionType,
  PolicyEvidenceRequest,
  PolicyEvidenceStrength,
  PolicyMarketBetKind,
  PolicyMarketDirection,
  ResolvedEvidencePlan,
} from "./intent-types.js";

export interface ActionIntentDecision<TState extends MinimalAgentState = MinimalAgentState> extends BaseDecision<TState> {
  kind: "action";
  action: MinimalActionIntent;
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

export type MinimalCycleStatus = "skipped" | "dry_run" | "published" | "replied" | "reacted" | "tipped" | "market_written" | "failed";

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

export interface MinimalTipVerification {
  attempted: true;
  visible: boolean;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
  txHash: string;
  verificationPath: "post_tip_stats" | "recipient_tip_stats" | "balance_spend" | "none";
  tipConfirmationSurface: "post_tip_stats" | "recipient_tip_stats" | "balance_spend" | "none";
  amount: number;
  tipTxHash?: string;
  recipientAddress?: string;
  beforeTipStats: {
    totalTips: number;
    totalDem: number;
    myTip?: unknown;
  } | null;
  afterTipStats: {
    totalTips: number;
    totalDem: number;
    myTip?: unknown;
  } | null;
  beforeRecipientTipStats: {
    receivedCount: number;
    receivedDem: number;
    givenCount: number;
    givenDem: number;
  } | null;
  afterRecipientTipStats: {
    receivedCount: number;
    receivedDem: number;
    givenCount: number;
    givenDem: number;
  } | null;
  beforeBalance: number | null;
  afterBalance: number | null;
  tipStatsConverged: boolean;
  recipientTipStatsConverged: boolean;
  spendObserved: boolean;
  error?: string;
}

export interface MinimalBettingPoolReadback {
  asset: string;
  horizon: string;
  totalBets: number;
  totalDem: number;
  bets: Array<{
    txHash: string;
    predictedPrice: number;
    amount: number;
  }>;
}

export interface MinimalHigherLowerPoolReadback {
  asset: string;
  horizon: string;
  totalHigher: number;
  totalLower: number;
  totalDem: number;
  higherCount: number;
  lowerCount: number;
  referencePrice: number | null;
  currentPrice: number;
}

export interface MinimalMarketWriteVerification {
  attempted: true;
  visible: boolean;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
  txHash?: string;
  verificationPath: "betting_pool" | "higher_lower_pool";
  marketKind: PolicyMarketBetKind;
  asset: string;
  horizon: string;
  amount: number;
  memo?: string;
  predictedPrice?: number;
  direction?: PolicyMarketDirection;
  registrationConfirmed: boolean;
  beforePool: MinimalBettingPoolReadback | MinimalHigherLowerPoolReadback | null;
  afterPool: MinimalBettingPoolReadback | MinimalHigherLowerPoolReadback | null;
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
  readinessOptions?: WriteReadinessOptions;
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
    resolution: ResolvedIntent | null;
    execution: {
      status: MinimalCycleStatus;
      txHash?: string;
      attestationTxHash?: string;
      attestationResponseHash?: string;
      demSpendEstimate?: number;
      verification?: PublishVisibilityResult | MinimalReactionVerification | MinimalTipVerification | MinimalMarketWriteVerification;
      publishResult?: ToolResult<PublishResult>;
      reactionResult?: { ok: boolean; error?: unknown };
      guardrailEvaluation?: ToolkitGuardrailEvaluationReport;
      admissibility?: ToolkitActionAdmissibilityReport;
      error?: {
        stage: MinimalErrorStage;
        message: string;
        code?: string;
        retryable?: boolean;
      };
    };
  };
}

export type MinimalExecutionOutcome = MinimalCycleRecord["outcome"]["execution"];
export type MinimalVerificationResult = NonNullable<MinimalExecutionOutcome["verification"]>;

const DEFAULT_INTERVAL_MS = 300_000;
const DEFAULT_STATE_DIR = ".omniweb-agent";
const DEFAULT_VERIFICATION_TIMEOUT_MS = 45_000;
const DEFAULT_VERIFICATION_POLL_MS = 5_000;
const DEFAULT_VERIFICATION_LIMIT = 50;

export {
  executeResolvedIntent,
  isPlaceholderAttestUrl,
  toMinimalExecutionOutcome,
  validateResolvedIntentAttestation,
} from "./action-executor.js";
export type {
  ExecuteResolvedIntentOptions,
  ResolvedIntentExecutionResult,
  ResolvedIntentResultEnvelope,
} from "./action-executor.js";
export {
  compilePolicyDecision,
} from "./policy/compile.js";
export type {
  CompilePolicyDecisionOptions,
  CompiledPolicyDecision,
} from "./policy/compile.js";
export { evaluatePolicyConditions } from "./policy/conditions.js";
export { runPolicyDerive } from "./policy/derive.js";
export { runPolicyObserve } from "./policy/observe.js";
export { selectPolicyRoute } from "./policy/routes.js";
export {
  buildInjectedPolicyRuntimeCapabilities,
  buildInjectedRuntimeCapabilities,
} from "./injected-runtime-capabilities.js";
export {
  planPolicyExecution,
  runPolicy,
  runPolicyWithTrace,
} from "./policy/run.js";
export type {
  PlanPolicyExecutionOptions,
  PlannedPolicyExecution,
  PolicyExecutionDisposition,
} from "./policy/run.js";
export type {
  PolicyConditionDefinitions,
  PolicyConditionEvaluation,
  PolicyConditionEvaluator,
  PolicyConditionInput,
  PolicyDefinition,
  PolicyDeriveInput,
  PolicyRouteDefinition,
  PolicyRouteInput,
  PolicyRunResult,
} from "./policy/types.js";
export {
  normalizeDecisionToActionIntent,
  normalizeDecisionToPolicyActionRequest,
  normalizeDecisionToResolvedIntent,
  resolveActionRequest,
} from "./minimal-agent-resolver.js";
export type {
  NormalizeDecisionToResolvedIntentOptions,
  ResolveActionRequestOptions,
} from "./minimal-agent-resolver.js";

export function getDefaultMinimalStateDir(cwd?: string): string {
  return resolve(cwd ?? process.cwd(), DEFAULT_STATE_DIR);
}

export async function runMinimalAgentCycle<TState extends MinimalAgentState = MinimalAgentState>(
  observe: MinimalObserveFn<TState>,
  opts: RunMinimalAgentCycleOptions<TState> = {},
): Promise<MinimalCycleRecord<TState>> {
  const now = opts.now ?? Date.now;
  const stateDir = resolveStateDir(opts.stateDir, opts.cwd, DEFAULT_STATE_DIR);
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

  const policyExecution = planPolicyExecution(decision, {
    cwd: opts.readinessOptions?.cwd ?? opts.cwd,
    env: opts.readinessOptions?.env,
    envPath: opts.readinessOptions?.envPath,
    homeDir: opts.readinessOptions?.homeDir,
    packageResolver: opts.readinessOptions?.packageResolver,
    agentName: opts.readinessOptions?.agentName,
    dryRun: cycle.dryRun,
    runtimeCapabilities: opts.omni ? buildInjectedRuntimeCapabilities() : undefined,
  });

  if (policyExecution.disposition.kind === "skip") {
    const runtimeGateReports = buildMinimalRuntimeGateReports(policyExecution.resolution, cycle.dryRun);
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        resolution: policyExecution.resolution,
        execution: {
          status: policyExecution.disposition.status,
          demSpendEstimate: 0,
          ...runtimeGateReports,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (policyExecution.disposition.kind === "dry_run") {
    const runtimeGateReports = buildMinimalRuntimeGateReports(policyExecution.resolution, true);
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        resolution: policyExecution.resolution,
        execution: {
          status: policyExecution.disposition.status,
          demSpendEstimate: 0,
          ...runtimeGateReports,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  if (policyExecution.disposition.kind === "failed") {
    const runtimeGateReports = buildMinimalRuntimeGateReports(policyExecution.resolution, cycle.dryRun);
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        resolution: policyExecution.resolution,
        execution: {
          status: policyExecution.disposition.status,
          demSpendEstimate: 0,
          error: {
            stage: policyExecution.disposition.errorStage,
            message: policyExecution.disposition.errorMessage,
            retryable: policyExecution.disposition.retryable,
          },
          ...runtimeGateReports,
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  const actionDecision = policyExecution.actionDecision;
  if (!actionDecision) {
    const record = buildCompletedRecord({
      cycle,
      startedAtMs,
      now,
      memoryBefore,
      nextState: decision.nextState ?? memoryBefore.state,
      decision,
      outcome: {
        resolution: policyExecution.resolution,
        execution: {
          status: "failed",
          demSpendEstimate: 0,
          error: {
            stage: "execute",
            message: "missing_action_intent",
            retryable: false,
          },
        },
      },
    });
    await persistCycleArtifacts(stateDir, record);
    return record;
  }

  const execution = await executeMinimalAction({
    omni,
    decision,
    actionDecision,
    resolution: policyExecution.resolution,
    verification: {
      timeoutMs: opts.verification?.timeoutMs ?? DEFAULT_VERIFICATION_TIMEOUT_MS,
      pollMs: opts.verification?.pollMs ?? DEFAULT_VERIFICATION_POLL_MS,
      limit: opts.verification?.limit ?? DEFAULT_VERIFICATION_LIMIT,
    },
  });

  const record = buildCompletedRecord({
    cycle,
    startedAtMs,
    now,
    memoryBefore,
    nextState: decision.nextState ?? memoryBefore.state,
    decision,
    outcome: {
      resolution: policyExecution.resolution,
      execution,
    },
  });
  await persistCycleArtifacts(stateDir, record);
  return record;
}

function buildMinimalRuntimeGateReports(
  resolution: ResolvedIntent | null,
  dryRun: boolean,
): Pick<MinimalExecutionOutcome, "guardrailEvaluation" | "admissibility"> {
  if (!resolution) return {};
  const mode = dryRun ? "dry-run" : "execute";
  const actionFamily = actionFamilyForMinimalResolution(resolution);
  const guardrailEvaluation = evaluateToolkitGuardrailsSync({
    mode,
    explicitExecute: !dryRun,
    actionFamily,
    resolution,
  });
  const admissibility = evaluateToolkitActionAdmissibilitySync({
    mode,
    explicitExecute: !dryRun,
    actionFamily,
    resolution,
    guardrailEvaluation,
  });
  return {
    guardrailEvaluation,
    admissibility,
  };
}

function actionFamilyForMinimalResolution(resolution: ResolvedIntent): string {
  if (resolution.actionType === "bet") {
    return resolution.normalizedDraft.marketKind === "higher_lower" ? "bet-hl" : "bet-fixed";
  }
  return resolution.actionType;
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

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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
