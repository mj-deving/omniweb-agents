import type {
  MinimalAgentMemory,
  MinimalAgentState,
  MinimalCycleContext,
  MinimalCycleRecord,
  MinimalErrorStage,
  MinimalObserveResult,
} from "../minimal-agent.js";
import { summarizeCycleFields } from "./cycle-summary.js";

export function buildCompletedRecord<TState extends MinimalAgentState>(args: {
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

export function buildFailureRecord<TState extends MinimalAgentState>(args: {
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
      resolution: null,
      execution: {
        status: "failed",
        demSpendEstimate: 0,
        error: {
          stage: args.stage,
          message,
        },
      },
    },
  });
}

export function buildCycleId(iteration: number, nowMs: number): string {
  const stamp = new Date(nowMs).toISOString().replace(/[:.]/g, "-");
  return `${stamp}-i${String(iteration).padStart(4, "0")}`;
}

export function buildSessionId(iteration: number, nowMs: number, slug: string): string {
  const stamp = new Date(nowMs).toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${slug}-i${String(iteration).padStart(4, "0")}`;
}
