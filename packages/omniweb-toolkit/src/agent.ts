/**
 * Runtime-facing exports for `omniweb-toolkit/agent`.
 *
 * Honest center of gravity:
 * - `omniweb-toolkit` main entry is still the substrate-first front door
 * - this subpath is the runtime/loop convenience surface
 * - broader research/market/starter helpers below remain compatibility exports,
 *   not the architectural center of the package
 */

// Explicit policy compile/run shell
export {
  executeResolvedIntent,
  isPlaceholderAttestUrl,
  toMinimalExecutionOutcome,
  validateResolvedIntentAttestation,
} from "./action-executor.js";
export { evaluatePolicyConditions } from "./policy/conditions.js";
export { compilePolicyDecision } from "./policy/compile.js";
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

// Core runtime loop + seam helpers
export {
  getDefaultMinimalStateDir,
  normalizeDecisionToActionIntent,
  normalizeDecisionToPolicyActionRequest,
  normalizeDecisionToResolvedIntent,
  resolveActionRequest,
  runMinimalAgentCycle,
  runMinimalAgentLoop,
} from "./minimal-agent.js";
export { executeMinimalAction } from "./minimal-agent-executor.js";
export {
  getDefaultSessionLedgerDir,
  loadRecentSessionResults,
  writeSessionLedgerJson,
} from "./session-ledger.js";
export { buildMinimalAttestationPlan } from "./minimal-attestation-plan.js";
export { buildMinimalAttestationPlanFromUrls } from "./minimal-attestation-plan.js";
export { getPrimaryAttestationCandidate } from "./minimal-attestation-plan.js";
export { getPrimaryAttestationSourceName } from "./minimal-attestation-plan.js";
export { getPrimaryAttestUrl } from "./minimal-attestation-plan.js";

// Compatibility/helper exports
export { deriveEngagementOpportunities } from "./engagement-opportunities.js";
export { buildEngagementDraft } from "./engagement-draft.js";
export {
  buildLeaderboardPatternPrompt,
  getDefaultLeaderboardPatternOutputRules,
} from "./leaderboard-pattern-loop.js";
export { deriveMarketOpportunities } from "./market-opportunities.js";
export { buildMarketDraft } from "./market-draft.js";
export { buildMarketActionDraft } from "./market-action.js";
export { getMarketTopicFamilyContract, ORACLE_DIVERGENCE_CONTRACT } from "./market-family-contracts.js";
export { deriveResearchOpportunities } from "./research-opportunities.js";
export { rankLiveResearchTopics } from "./research-opportunities.js";
export { deriveResearchSourceProfile } from "./research-source-profile.js";
export { explainUnsupportedResearchTopic } from "./research-source-profile.js";
export { buildResearchExpansionCandidates } from "./research-expansion-candidates.js";
export { buildResearchStarterDecision } from "./research-starter-decision.js";
export { collectResearchLiveSurface } from "./research-live-surface.js";
export { buildColonySurfaceSummary } from "./research-surface-summary.js";
export {
  createTopicFamilyRegistry,
  defineTopicFamilyContract,
  getTopicFamilyContract,
} from "./topic-family-contract.js";
export { buildResearchColonySubstrate } from "./research-colony-substrate.js";
export { fetchResearchEvidenceSummary } from "./research-evidence.js";
export {
  checkReplyDraftQuality,
  rankReplyExperimentCandidates,
  selectReplyExperimentCandidate,
} from "./reply-experiment.js";
export { buildResearchSelfHistory } from "./research-self-history.js";
export {
  researchPublishHistoryPath,
  loadResearchPublishHistory,
  appendResearchPublishHistory,
} from "./research-self-history-store.js";
export { buildResearchEvidenceDelta, summarizeResearchEvidenceDelta } from "./research-evidence-delta.js";
export { defineResearchTopicFamilyContract } from "./research-family-contracts.js";
export { buildResearchCompositionPacket } from "./research-draft.js";
export { buildResearchDraft } from "./research-draft.js";
export { validateResearchComposition } from "./research-draft.js";
export { collectColonySurfaceSnapshot } from "./colony-surface.js";
export {
  buildColonyOperatorCapabilityTruth,
  type ColonyOperatorActionFamily,
  type ColonyOperatorActionIntentContract,
  type ColonyOperatorActionTruth,
  type ColonyOperatorCapabilityTruth,
  type ColonyOperatorIntentActionType,
  type ColonyOperatorLifecycleStatus,
  type ColonyOperatorTruthStatus,
} from "./colony-operator-capability-truth.js";
export {
  runColonyOperatorCycle,
  type ColonyOperatorCapabilitySummary,
  type ColonyOperatorExecutionEnvelope,
  type ColonyOperatorExecutionMode,
  type ColonyOperatorLifecyclePlan,
  type ColonyOperatorLifecyclePlanStatus,
  type ColonyOperatorLifecycleStore,
  type RunColonyOperatorCycleOptions,
} from "./colony-operator-entrypoint.js";
export { getStarterSourcePack, listStarterSourcePacks } from "./starter-source-packs.js";
export { getMinimalAgentRuntimeConfig } from "./starter-runtime-config.js";
export { toPreflightCandidates } from "./minimal-attestation-plan.js";
export { matchResearchDraftToPlan } from "./research-source-match.js";
export type {
  ColonySurfaceSnapshot,
  CollectColonySurfaceSnapshotOptions,
  FeedSample,
  TopicConvergence,
  TopicSignal,
} from "./colony-surface.js";
export type {
  StarterArchetype,
  StarterSourcePack,
  StarterSourcePackEntry,
} from "./starter-source-packs.js";
export type { MinimalAgentRuntimeConfig } from "./starter-runtime-config.js";
export type {
  ExecuteResolvedIntentOptions,
  ResolvedIntentExecutionResult,
  ResolvedIntentResultEnvelope,
} from "./action-executor.js";
export type {
  CompilePolicyDecisionOptions,
  CompiledPolicyDecision,
} from "./policy/compile.js";
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
export type {
  ActionIntentDecision,
  MinimalAgentState,
  MinimalAuditSection,
  MinimalAuditPayload,
  MinimalAgentMemory,
  MinimalCycleSummary,
  MinimalCycleContext,
  MinimalSessionLedgerContext,
  MinimalObserveContext,
  SkipDecision,
  PublishDecision,
  ReplyDecision,
  ReactDecision,
  MinimalObserveResult,
  MinimalObserveFn,
  MinimalCycleStatus,
  MinimalErrorStage,
  MinimalVerificationOptions,
  RunMinimalAgentCycleOptions,
  RunMinimalAgentLoopOptions,
  MinimalCycleRecord,
  MinimalExecutionOutcome,
  MinimalReactionVerification,
  NormalizeDecisionToResolvedIntentOptions,
  ResolveActionRequestOptions,
} from "./minimal-agent.js";
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
  ResolvedIntentStatus,
  ResolvedIntentTarget,
  ResolvedIntentDraft,
  ResolvedEvidencePlan,
  IntentExecutionPathFamily,
  ExecutableIntent,
  BlockedIntent,
  SupervisedIntent,
  UnsupportedIntent,
  ResolvedIntent,
  IntentExecutionStatus,
  IntentExecutionResult,
  IntentResultEnvelope,
} from "./intent-types.js";
export type { SessionLedgerResult } from "./session-ledger.js";
export type {
  MinimalAttestationCandidate,
  MinimalAttestationPlan,
  BuildMinimalAttestationPlanOptions,
  BuildMinimalAttestationPlanFromUrlsOptions,
} from "./minimal-attestation-plan.js";
export type {
  LeaderboardPatternPromptOptions,
} from "./leaderboard-pattern-loop.js";
export type {
  EngagementPostInput,
  EngagementLeaderboardInput,
  DeriveEngagementOpportunitiesOptions,
  EngagementOpportunity,
} from "./engagement-opportunities.js";
export type {
  BuildEngagementDraftOptions,
  EngagementPromptPacket,
  EngagementDraftSuccess,
  EngagementDraftFailure,
  EngagementDraftResult,
} from "./engagement-draft.js";
export type {
  MarketSignalInput,
  MarketPostInput,
  MarketPriceInput,
  MarketOracleDivergenceInput,
  DeriveMarketOpportunitiesOptions,
  MarketOpportunity,
} from "./market-opportunities.js";
export type {
  MarketTopicFamily,
  MarketTopicFamilyContract,
} from "./market-family-contracts.js";
export type {
  BuildMarketDraftOptions,
  MarketPromptPacket,
  MarketDraftSuccess,
  MarketDraftFailure,
  MarketDraftResult,
} from "./market-draft.js";
export type {
  BuildMarketActionDraftOptions,
  MarketActionDraftSuccess,
  MarketActionDraftFailure,
  MarketActionDraftResult,
} from "./market-action.js";
export type {
  ResearchEvidenceSummary,
  FetchResearchEvidenceSummaryOptions,
  FetchResearchEvidenceSummaryResult,
} from "./research-evidence.js";
export type {
  ReplyExperimentCandidate,
  SelectReplyExperimentCandidateOptions,
  ReplyDraftQualityOptions,
} from "./reply-experiment.js";
export type {
  ResearchPublishHistoryEntry,
  ResearchSelfHistoryPostSummary,
  ResearchSelfHistoryDelta,
  ResearchSelfHistorySummary,
  BuildResearchSelfHistoryOptions,
} from "./research-self-history.js";
export type {
  ResearchEvidenceDeltaEntry,
  ResearchEvidenceDeltaSummary,
} from "./research-evidence-delta.js";
export type {
  MatchResearchDraftToPlanOptions,
  MatchResearchDraftToPlanResult,
} from "./research-source-match.js";
export type {
  ResearchSignalInput,
  ResearchPostInput,
  ResearchSignalSourcePost,
  ResearchSignalCrossReference,
  ResearchSignalReactionSummary,
  ResearchSignalDivergence,
  DeriveResearchOpportunitiesOptions,
  ResearchOpportunity,
  LiveResearchTopic,
} from "./research-opportunities.js";
export type {
  ResearchSurfaceFeedSample,
  ResearchSurfaceSignalSample,
  ResearchSurfaceReadStatus,
  ResearchLiveSurfaceSnapshot,
  CollectResearchLiveSurfaceOptions,
} from "./research-live-surface.js";
export type {
  ResearchExpansionSeed,
  ResearchExpansionCandidate,
} from "./research-expansion-candidates.js";
export type {
  ResearchStarterRecommendedAction,
  ResearchStarterEvidencePosture,
  ResearchStarterRiskPosture,
  ResearchStarterDecision,
  BuildResearchStarterDecisionOptions,
} from "./research-starter-decision.js";
export type {
  ColonySurfaceSummary,
  ColonySurfaceSummaryTopic,
  ColonySurfaceExpansionCandidate,
  ColonySurfaceExpansionCandidateSource,
  BuildColonySurfaceSummaryOptions,
} from "./research-surface-summary.js";
export type {
  ResearchColonySignalSummary,
  ResearchColonyTake,
  ResearchRecentContextPost,
  ResearchColonySubstrate,
  BuildResearchColonySubstrateOptions,
} from "./research-colony-substrate.js";
export type {
  ResearchTopicFamily,
  ResearchSourceProfile,
  UnsupportedResearchTopicExplanation,
} from "./research-source-profile.js";
export type {
  TopicMetricSemantic,
  TopicClaimRequirement,
  TopicClaimBounds,
  TopicQualitySlipPattern,
  TopicFamilySourcePlan,
  TopicFamilyPromptDoctrine,
  TopicFamilyQualityContract,
  TopicFamilyContract,
  TopicFamilyRegistry,
} from "./topic-family-contract.js";
export type {
  SupportedResearchTopicFamily,
  ResearchTopicFamilyContract,
} from "./research-family-contracts.js";
export type {
  BuildResearchDraftOptions,
  ValidateResearchCompositionOptions,
  ResearchCompositionValidationResult,
  ResearchPromptInput,
  ResearchPromptPacket,
  ResearchDraftSuccess,
  ResearchDraftFailure,
  ResearchDraftResult,
} from "./research-draft.js";
export { runAgentLoop, defaultObserve, buildColonyStateFromFeed } from "../../../src/toolkit/agent-loop.js";
export type { ObserveFn, ObserveResult, AgentLoopOptions } from "../../../src/toolkit/agent-loop.js";
