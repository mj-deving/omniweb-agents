import type { RuntimeCapabilityResult } from "../readiness.js";
import type { MinimalAgentState, MinimalObserveResult } from "../minimal-agent.js";
import type { CompiledPolicyDecision, CompilePolicyDecisionOptions } from "./compile.js";
import { compilePolicyDecision } from "./compile.js";

export type PolicyExecutionDisposition =
  | { kind: "skip"; status: "skipped" }
  | { kind: "dry_run"; status: "dry_run" }
  | { kind: "execute" }
  | {
    kind: "failed";
    status: "failed";
    errorStage: "execute";
    errorMessage: string;
    retryable: boolean;
  };

export interface PlanPolicyExecutionOptions extends CompilePolicyDecisionOptions {
  dryRun?: boolean;
}

export interface PlannedPolicyExecution<TState extends MinimalAgentState = MinimalAgentState>
  extends CompiledPolicyDecision<TState> {
  disposition: PolicyExecutionDisposition;
}

export function buildInjectedPolicyRuntimeCapabilities(): RuntimeCapabilityResult {
  return {
    canRead: true,
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    actionFamilies: {
      publish: {
        declared: true,
        executable: true,
        readiness: "ready",
        requiresWallet: true,
        requiresAttestation: true,
        requiresTargetPost: false,
        requiresMarketContext: false,
        proofLevel: "real_runtime_action_family",
        notes: ["Injected omni session bypasses file-based readiness discovery"],
      },
      reply: {
        declared: true,
        executable: true,
        readiness: "ready",
        requiresWallet: true,
        requiresAttestation: true,
        requiresTargetPost: true,
        requiresMarketContext: false,
        proofLevel: "real_runtime_action_family",
        notes: ["Injected omni session bypasses file-based readiness discovery"],
      },
      react: {
        declared: true,
        executable: true,
        readiness: "ready",
        requiresWallet: true,
        requiresAttestation: false,
        requiresTargetPost: true,
        requiresMarketContext: false,
        proofLevel: "real_runtime_action_family",
        notes: ["Injected omni session bypasses file-based readiness discovery"],
      },
      tip: {
        declared: true,
        executable: false,
        readiness: "unsupported",
        requiresWallet: true,
        requiresAttestation: false,
        requiresTargetPost: true,
        requiresMarketContext: false,
        proofLevel: "architectural_placeholder",
        notes: ["Minimal agent executor does not implement tip actions yet"],
      },
      bet: {
        declared: true,
        executable: false,
        readiness: "unsupported",
        requiresWallet: true,
        requiresAttestation: false,
        requiresTargetPost: false,
        requiresMarketContext: true,
        proofLevel: "architectural_placeholder",
        notes: ["Minimal agent executor does not implement bet actions yet"],
      },
    },
    readiness: {
      ok: true,
      canRead: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
      credentialSourcesChecked: [],
      runtimeCredentialSource: null,
      notes: ["Injected omni session bypasses file-based readiness discovery"],
    },
  };
}

export function planPolicyExecution<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
  options: PlanPolicyExecutionOptions = {},
): PlannedPolicyExecution<TState> {
  const compiled = compilePolicyDecision(decision, options);

  if (decision.kind === "skip") {
    return {
      ...compiled,
      disposition: { kind: "skip", status: "skipped" },
    };
  }

  if (options.dryRun === true) {
    return {
      ...compiled,
      disposition: { kind: "dry_run", status: "dry_run" },
    };
  }

  if (compiled.resolution && compiled.resolution.status !== "executable") {
    return {
      ...compiled,
      disposition: { kind: "skip", status: "skipped" },
    };
  }

  if (!compiled.actionDecision) {
    return {
      ...compiled,
      disposition: {
        kind: "failed",
        status: "failed",
        errorStage: "execute",
        errorMessage: "missing_action_intent",
        retryable: false,
      },
    };
  }

  return {
    ...compiled,
    disposition: { kind: "execute" },
  };
}
