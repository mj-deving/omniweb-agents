import type { ResearchLiveSurfaceSnapshot } from "./research-live-surface.js";
import type { LiveResearchTopic, ResearchOpportunity } from "./research-opportunities.js";
import { explainUnsupportedResearchTopic } from "./research-source-profile.js";

export type ResearchStarterRecommendedAction =
  | "noop"
  | "observe"
  | "request_more_evidence"
  | "draft"
  | "publish_candidate"
  | "abstain";

export type ResearchStarterEvidencePosture =
  | "no_live_candidate"
  | "partial_surface"
  | "unsupported_family"
  | "supported_but_no_publish_shape"
  | "supported_attestation_incomplete"
  | "supported_draft_ready"
  | "supported_publish_candidate";

export type ResearchStarterRiskPosture = "low" | "guarded" | "elevated";

export interface ResearchStarterDecision {
  selectedTopic: string | null;
  reason: string;
  supportedClaims: string[];
  unsupportedClaims: string[];
  evidencePosture: ResearchStarterEvidencePosture;
  recommendedAction: ResearchStarterRecommendedAction;
  confidence: number;
  riskPosture: ResearchStarterRiskPosture;
  requiredChecks: string[];
  abstainReason: string | null;
}

export interface BuildResearchStarterDecisionOptions {
  liveSurface?: Pick<ResearchLiveSurfaceSnapshot, "readStatus">;
  liveTopics: LiveResearchTopic[];
  opportunities: ResearchOpportunity[];
}

export function buildResearchStarterDecision(
  input: BuildResearchStarterDecisionOptions,
): ResearchStarterDecision {
  const partialSurface = Boolean(
    input.liveSurface
    && (!input.liveSurface.readStatus.feed.ok || !input.liveSurface.readStatus.signals.ok || !input.liveSurface.readStatus.balance.ok),
  );

  const selectedTopic = input.liveTopics[0] ?? null;
  if (!selectedTopic) {
    return {
      selectedTopic: null,
      reason: partialSurface
        ? "Live surface is partial and no topic cleared the starter ranking path."
        : "No live topic cleared the starter ranking path.",
      supportedClaims: [],
      unsupportedClaims: partialSurface ? ["partial_live_surface"] : ["no_ranked_live_topic"],
      evidencePosture: partialSurface ? "partial_surface" : "no_live_candidate",
      recommendedAction: "abstain",
      confidence: 0,
      riskPosture: partialSurface ? "guarded" : "low",
      requiredChecks: partialSurface ? ["refresh_live_surface", "recheck_feed_and_signals"] : ["refresh_live_surface"],
      abstainReason: partialSurface
        ? "Surface is incomplete and there is no ranked topic to act on honestly."
        : "There is no ranked topic to act on honestly yet.",
    };
  }

  const matchingOpportunity = input.opportunities.find((opportunity) => opportunity.topic === selectedTopic.topic) ?? null;
  const confidence = selectedTopic.matchedSignal.confidence ?? 0;

  if (selectedTopic.sourceProfile.family === "unsupported") {
    const unsupported = explainUnsupportedResearchTopic(selectedTopic.topic);
    return {
      selectedTopic: selectedTopic.topic,
      reason: "Top live topic is interesting, but the current research family set cannot ground it honestly yet.",
      supportedClaims: [
        `topic_ranked:${selectedTopic.kind}`,
        `signal_confidence:${confidence}`,
      ],
      unsupportedClaims: [
        unsupported.unsupportedReason,
        `suggested_next_family:${unsupported.suggestedNextFamily}`,
        partialSurface ? "partial_live_surface" : "unsupported_family",
      ],
      evidencePosture: partialSurface ? "partial_surface" : "unsupported_family",
      recommendedAction: partialSurface ? "abstain" : "observe",
      confidence,
      riskPosture: partialSurface ? "elevated" : "guarded",
      requiredChecks: ["review_expansion_candidate", "decide_if_family_should_expand"],
      abstainReason: partialSurface
        ? "Surface is partial and the top topic is outside the current supported families."
        : "Current toolkit cannot honestly produce a publish candidate for this topic yet.",
    };
  }

  if (!matchingOpportunity) {
    return {
      selectedTopic: selectedTopic.topic,
      reason: "Topic is supported and live, but it does not currently present a clean publish-shaped opportunity.",
      supportedClaims: [
        `supported_family:${selectedTopic.sourceProfile.family}`,
        "live_topic_ranked",
      ],
      unsupportedClaims: partialSurface ? ["partial_live_surface"] : ["no_publish_shaped_opportunity"],
      evidencePosture: partialSurface ? "partial_surface" : "supported_but_no_publish_shape",
      recommendedAction: partialSurface ? "abstain" : "request_more_evidence",
      confidence,
      riskPosture: partialSurface ? "guarded" : "low",
      requiredChecks: ["refresh_feed_context", "watch_for_gap_or_contradiction"],
      abstainReason: partialSurface ? "Surface is partial, so the absence of a publish-shaped opportunity may be misleading." : null,
    };
  }

  if (!matchingOpportunity.attestationPlan.ready) {
    return {
      selectedTopic: matchingOpportunity.topic,
      reason: "Topic is publish-shaped, but the attestation plan is not ready enough for a trustworthy draft/publish step.",
      supportedClaims: [
        `supported_family:${matchingOpportunity.sourceProfile.family}`,
        `opportunity_kind:${matchingOpportunity.kind}`,
        "publish_shape_detected",
      ],
      unsupportedClaims: [
        `attestation_not_ready:${matchingOpportunity.attestationPlan.reason ?? "unknown"}`,
        ...(partialSurface ? ["partial_live_surface"] : []),
      ],
      evidencePosture: partialSurface ? "partial_surface" : "supported_attestation_incomplete",
      recommendedAction: "request_more_evidence",
      confidence,
      riskPosture: "guarded",
      requiredChecks: ["complete_attestation_plan", "verify_primary_and_supporting_sources"],
      abstainReason: null,
    };
  }

  const supportingCount = matchingOpportunity.attestationPlan.supporting.length;

  return {
    selectedTopic: matchingOpportunity.topic,
    reason: "Topic is supported and publish-shaped; a draft is the next honest step before any live publish decision.",
    supportedClaims: [
      `supported_family:${matchingOpportunity.sourceProfile.family}`,
      `opportunity_kind:${matchingOpportunity.kind}`,
      `supporting_sources:${supportingCount}`,
      "attestation_ready",
    ],
    unsupportedClaims: partialSurface ? ["partial_live_surface"] : [],
    evidencePosture: "supported_draft_ready",
    recommendedAction: "draft",
    confidence,
    riskPosture: partialSurface || matchingOpportunity.kind === "contradiction" ? "guarded" : "low",
    requiredChecks: ["compose_thesis_text", "verify_claim_wording"],
    abstainReason: null,
  };
}
