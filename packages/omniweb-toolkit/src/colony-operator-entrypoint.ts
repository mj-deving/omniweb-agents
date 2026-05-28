import {
  buildColonyOperatorCapabilityTruth,
} from "./colony-operator-capability-truth.js";
import {
  buildToolkitCapabilityManifest,
} from "./capability-manifest.js";
import {
  evaluateToolkitGuardrailsSync,
} from "./guardrails.js";
import {
  evaluateToolkitActionAdmissibilitySync,
} from "./action-admissibility.js";
import {
  runMinimalAgentCycle,
} from "./minimal-agent.js";
import {
  buildColonyOperatorActionSurface,
  buildColonyOperatorMultiActionPlan,
  buildLifecyclePlan,
  defaultRequestedActionsFor,
  findActionTruth,
  inferSelectedActionFamily,
  summarizeCapabilityTruth,
} from "./colony-operator-action-lifecycle.js";
import {
  buildColonyOperatorCapabilityDiscovery,
  buildColonyOperatorToolkitHelp,
} from "./colony-operator-discovery.js";
import {
  buildColonyOperatorResponseDepthAccess,
  buildObservedContextSummary,
} from "./colony-operator-response-context.js";
import { buildFinalVerdict } from "./colony-operator-verdict.js";
import type {
  ColonyOperatorExecutionEnvelope,
  ColonyOperatorExecutionMode,
  MinimalAgentState,
  MinimalObserveFn,
  RunColonyOperatorCycleOptions,
} from "./colony-operator-entrypoint-types.js";

export {
  buildColonyOperatorCapabilityDiscovery,
  buildColonyOperatorMultiActionPlan,
  buildColonyOperatorResponseDepthAccess,
  buildColonyOperatorToolkitHelp,
};
export type {
  ColonyOperatorActionSurface,
  ColonyOperatorCapabilityDiscovery,
  ColonyOperatorCapabilitySummary,
  ColonyOperatorExecutionEnvelope,
  ColonyOperatorExecutionMode,
  ColonyOperatorFinalVerdict,
  ColonyOperatorLifecyclePlan,
  ColonyOperatorLifecyclePlanStatus,
  ColonyOperatorLifecycleStore,
  ColonyOperatorMultiActionPlan,
  ColonyOperatorObservedContextSummary,
  ColonyOperatorPerActionStatus,
  ColonyOperatorPlannedAction,
  ColonyOperatorPlannedActionGate,
  ColonyOperatorRequestedAction,
  ColonyOperatorResponseDepthAccess,
  ColonyOperatorResponseDepthPreservationStatus,
  ColonyOperatorResponseDepthSurface,
  ColonyOperatorResponseDepthSurfaceId,
  ColonyOperatorToolkitHelp,
  ColonyOperatorToolkitHelpCommand,
  RunColonyOperatorCycleOptions,
} from "./colony-operator-entrypoint-types.js";

export async function runColonyOperatorCycle<TState extends MinimalAgentState = MinimalAgentState>(
  observe: MinimalObserveFn<TState>,
  opts: RunColonyOperatorCycleOptions<TState> = {},
): Promise<ColonyOperatorExecutionEnvelope<TState>> {
  const mode: ColonyOperatorExecutionMode = opts.execute === true ? "execute" : "dry-run";
  const capabilityTruth = opts.capabilityTruth ?? buildColonyOperatorCapabilityTruth({
    cwd: opts.readinessOptions?.cwd ?? opts.cwd,
    env: opts.readinessOptions?.env,
    envPath: opts.readinessOptions?.envPath,
    homeDir: opts.readinessOptions?.homeDir,
    packageResolver: opts.readinessOptions?.packageResolver,
    agentName: opts.readinessOptions?.agentName,
  });
  const toolkitCapabilityManifest = opts.toolkitCapabilityManifest ?? buildToolkitCapabilityManifest({
    cwd: opts.readinessOptions?.cwd ?? opts.cwd,
    env: opts.readinessOptions?.env,
    envPath: opts.readinessOptions?.envPath,
    homeDir: opts.readinessOptions?.homeDir,
    packageResolver: opts.readinessOptions?.packageResolver,
    agentName: opts.readinessOptions?.agentName,
  });
  const cycle = await runMinimalAgentCycle(observe, {
    ...opts,
    dryRun: mode === "dry-run",
  });
  const selectedFamily = inferSelectedActionFamily(cycle);
  const selectedTruth = findActionTruth(capabilityTruth.actions, selectedFamily);
  const skippedAlternatives = capabilityTruth.actions
    .filter((action) => action.actionFamily !== selectedFamily)
    .map((action) => ({
      actionFamily: action.actionFamily,
      status: action.status,
      lifecycleStatus: action.lifecycleStatus,
      reasonCodes: action.reasonCodes,
      intent: action.intent,
    }));
  const lifecyclePlan = await buildLifecyclePlan({
    mode,
    cycle,
    selectedTruth,
    lifecycleStore: opts.lifecycleStore,
    walletAddress: opts.walletAddress,
    command: opts.command,
    commit: opts.commit,
  });
  const verification = cycle.outcome.execution.verification as Record<string, unknown> | undefined;
  const capabilitySummary = summarizeCapabilityTruth(capabilityTruth, selectedTruth.actionFamily);
  const multiActionPlan = buildColonyOperatorMultiActionPlan({
    mode,
    capabilityTruth,
    toolkitCapabilityManifest,
    requestedActions: opts.requestedActions ?? defaultRequestedActionsFor(selectedTruth, skippedAlternatives),
  });
  const selectedGuardrailEvaluation = multiActionPlan.plannedIntents.find((action) => action.actionFamily === selectedTruth.actionFamily)
    ?.guardrailEvaluation
    ?? evaluateToolkitGuardrailsSync({
      mode,
      explicitExecute: mode === "execute",
      actionFamily: selectedTruth.actionFamily,
      actionTruth: selectedTruth,
      toolkitCapabilityManifest,
    });
  const selectedAdmissibility = multiActionPlan.plannedIntents.find((action) => action.actionFamily === selectedTruth.actionFamily)
    ?.admissibility
    ?? evaluateToolkitActionAdmissibilitySync({
      mode,
      explicitExecute: mode === "execute",
      actionFamily: selectedTruth.actionFamily,
      actionTruth: selectedTruth,
      toolkitCapabilityManifest,
      guardrailEvaluation: selectedGuardrailEvaluation,
    });
  const actionSurface = buildColonyOperatorActionSurface({
    capabilityTruth,
    selectedFamily: selectedTruth.actionFamily,
    multiActionPlan,
  });
  const observedContextSummary = buildObservedContextSummary(cycle, selectedTruth.actionFamily);
  const finalVerdict = buildFinalVerdict({
    mode,
    selectedFamily: selectedTruth.actionFamily,
    execution: cycle.outcome.execution,
    lifecyclePlan,
    liveExecutionAllowed: mode === "execute",
  });

  return {
    generatedAt: new Date().toISOString(),
    mode,
    observedContextSummary,
    selectedAction: {
      actionFamily: selectedTruth.actionFamily,
      status: selectedTruth.status,
      lifecycleStatus: selectedTruth.lifecycleStatus,
      executionPathFamily: selectedTruth.executionPathFamily,
      reasonCodes: selectedTruth.reasonCodes,
      intent: selectedTruth.intent,
      admissibility: selectedAdmissibility,
    },
    skippedAlternatives,
    capabilitySummary,
    capabilityDiscovery: buildColonyOperatorCapabilityDiscovery(toolkitCapabilityManifest, capabilitySummary),
    capabilityTruth,
    toolkitCapabilityManifest,
    guardrailEvaluation: selectedGuardrailEvaluation,
    admissibility: selectedAdmissibility,
    multiActionPlan,
    actionSurface,
    lifecyclePlan,
    execution: {
      cycleId: cycle.cycleId,
      dryRun: cycle.dryRun,
      status: cycle.outcome.execution.status,
      txHash: cycle.outcome.execution.txHash ?? null,
      attestationTxHash: cycle.outcome.execution.attestationTxHash ?? null,
      demSpendEstimate: cycle.outcome.execution.demSpendEstimate ?? 0,
      productReadback: {
        attempted: verification?.attempted === true,
        visible: verification?.visible === true,
        indexedVisible: verification?.indexedVisible === true,
        verificationPath: typeof verification?.verificationPath === "string" ? verification.verificationPath : null,
      },
      error: cycle.outcome.execution.error ?? null,
    },
    finalVerdict,
    cycle,
  };
}
