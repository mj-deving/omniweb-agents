import type { LiveResearchTopic, ResearchOpportunity, ResearchPostInput, ResearchSignalInput } from "./research-opportunities.js";
import { buildResearchExpansionCandidates, type ResearchExpansionCandidate } from "./research-expansion-candidates.js";
import { explainUnsupportedResearchTopic } from "./research-source-profile.js";

export interface ColonySurfaceSummaryTopic {
  topic: string;
  kind: string;
  score: number;
  family: string;
  rationale: string;
  signalDirection: string | null;
  signalConfidence: number | null;
  hasRecentCoverage: boolean;
  contradictionSignals: string[];
  unsupportedReason?: string;
  suggestedNextFamily?: string;
}

export interface ColonySurfaceExpansionCandidate extends ResearchExpansionCandidate {}

export type ColonySurfaceExpansionCandidateSource =
  | "live_topic_ranker"
  | "opportunity_fallback"
  | "partial_live_topic_ranker"
  | "none";

export interface ColonySurfaceSummary {
  checkedAt: string;
  feedCount: number;
  highScorePostCount: number;
  signalCount: number;
  leaderboardCount: number;
  availableBalance: number;
  expansionCandidateSource: ColonySurfaceExpansionCandidateSource;
  topOpportunityTopics: ColonySurfaceSummaryTopic[];
  expansionCandidates: ColonySurfaceExpansionCandidate[];
}

export interface BuildColonySurfaceSummaryOptions {
  checkedAt: string;
  posts: ResearchPostInput[];
  highScorePosts?: ResearchPostInput[];
  signals: ResearchSignalInput[];
  leaderboardAgents: string[];
  availableBalance: number;
  opportunities: ResearchOpportunity[];
  liveTopics?: LiveResearchTopic[];
  expansionCandidateSource?: ColonySurfaceExpansionCandidateSource;
  maxTopics?: number;
}

const DEFAULT_MAX_TOPICS = 5;

export function buildColonySurfaceSummary(
  input: BuildColonySurfaceSummaryOptions,
): ColonySurfaceSummary {
  const topics = (input.liveTopics ?? input.opportunities).slice(0, input.maxTopics ?? DEFAULT_MAX_TOPICS);
  return {
    checkedAt: input.checkedAt,
    feedCount: input.posts.length,
    highScorePostCount: input.highScorePosts?.length ?? 0,
    signalCount: input.signals.length,
    leaderboardCount: input.leaderboardAgents.length,
    availableBalance: input.availableBalance,
    expansionCandidateSource: input.expansionCandidateSource
      ?? (input.liveTopics
        ? "live_topic_ranker"
        : input.opportunities.length > 0
          ? "opportunity_fallback"
          : "none"),
    topOpportunityTopics: topics.map((opportunity) => {
      const unsupported = opportunity.sourceProfile.family === "unsupported"
        ? explainUnsupportedResearchTopic(opportunity.topic)
        : null;
      return {
        topic: opportunity.topic,
        kind: opportunity.kind,
        score: opportunity.score,
        family: opportunity.sourceProfile.family,
        rationale: opportunity.rationale,
        signalDirection: opportunity.matchedSignal.direction ?? null,
        signalConfidence: opportunity.matchedSignal.confidence ?? null,
        hasRecentCoverage: opportunity.matchingFeedPosts.length > 0,
        contradictionSignals: opportunity.contradictionSignals ?? [],
        ...(unsupported
          ? {
            unsupportedReason: unsupported.unsupportedReason,
            suggestedNextFamily: unsupported.suggestedNextFamily,
        }
          : {}),
      };
    }),
    expansionCandidates: buildResearchExpansionCandidates(
      topics.map((topic) => ({
        topic: topic.topic,
        score: topic.score,
        confidence: topic.matchedSignal.confidence ?? null,
        family: topic.sourceProfile.family,
      })),
    ),
  };
}
