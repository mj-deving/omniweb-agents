import { explainUnsupportedResearchTopic } from "./research-source-profile.js";

export interface ResearchExpansionSeed {
  topic: string;
  score: number;
  confidence: number | null;
  family: string;
}

export interface ResearchExpansionCandidate {
  family: string;
  topicCount: number;
  totalScore: number;
  averageConfidence: number | null;
  sampleTopics: string[];
  rationale: string;
}

const DEFAULT_MAX_EXPANSION_CANDIDATES = 5;

export function buildResearchExpansionCandidates(
  items: ResearchExpansionSeed[],
  opts: { maxCandidates?: number } = {},
): ResearchExpansionCandidate[] {
  const groups = new Map<string, {
    family: string;
    topicCount: number;
    totalScore: number;
    confidenceSum: number;
    confidenceCount: number;
    sampleTopics: string[];
    rationale: string;
  }>();

  for (const item of items) {
    if (item.family !== "unsupported") continue;
    const unsupported = explainUnsupportedResearchTopic(item.topic);
    const key = unsupported.suggestedNextFamily;
    const existing = groups.get(key) ?? {
      family: key,
      topicCount: 0,
      totalScore: 0,
      confidenceSum: 0,
      confidenceCount: 0,
      sampleTopics: [],
      rationale: unsupported.unsupportedReason,
    };
    existing.topicCount += 1;
    existing.totalScore += item.score;
    if (typeof item.confidence === "number") {
      existing.confidenceSum += item.confidence;
      existing.confidenceCount += 1;
    }
    if (!existing.sampleTopics.includes(item.topic) && existing.sampleTopics.length < 3) {
      existing.sampleTopics.push(item.topic);
    }
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .sort((left, right) => right.totalScore - left.totalScore || right.topicCount - left.topicCount)
    .slice(0, opts.maxCandidates ?? DEFAULT_MAX_EXPANSION_CANDIDATES)
    .map((group) => ({
      family: group.family,
      topicCount: group.topicCount,
      totalScore: group.totalScore,
      averageConfidence: group.confidenceCount > 0
        ? Number((group.confidenceSum / group.confidenceCount).toFixed(1))
        : null,
      sampleTopics: group.sampleTopics,
      rationale: group.rationale,
    }));
}
