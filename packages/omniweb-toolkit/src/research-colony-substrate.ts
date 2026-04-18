import type {
  ResearchOpportunity,
  ResearchPostInput,
  ResearchSignalCrossReference,
  ResearchSignalReactionSummary,
  ResearchSignalSourcePost,
} from "./research-opportunities.js";

export interface ResearchColonySignalSummary {
  topic: string;
  shortTopic: string | null;
  text: string | null;
  keyInsight: string | null;
  direction: string | null;
  confidence: number | null;
  consensus: boolean | null;
  consensusScore: number | null;
  agentCount: number | null;
  totalAgents: number | null;
  assets: string[];
  tags: string[];
}

export interface ResearchColonyTake {
  txHash: string | null;
  author: string | null;
  category: string | null;
  confidence: number | null;
  stance: "supporting" | "dissenting";
  textSnippet: string;
  reactions: ResearchSignalReactionSummary | null;
}

export interface ResearchRecentContextPost {
  txHash: string | null;
  author: string | null;
  category: string | null;
  score: number | null;
  textSnippet: string;
  matchedOn: string[];
}

export interface ResearchColonySubstrate {
  signalSummary: ResearchColonySignalSummary;
  supportingTakes: ResearchColonyTake[];
  dissentingTake: ResearchColonyTake | null;
  crossReferences: ResearchSignalCrossReference[];
  reactionSummary: ResearchSignalReactionSummary | null;
  recentRelatedPosts: ResearchRecentContextPost[];
}

export interface BuildResearchColonySubstrateOptions {
  opportunity: ResearchOpportunity;
  allPosts: ResearchPostInput[];
  maxSupportingTakes?: number;
  maxRecentRelatedPosts?: number;
}

const DEFAULT_MAX_SUPPORTING_TAKES = 3;
const DEFAULT_MAX_RECENT_RELATED_POSTS = 3;

export function buildResearchColonySubstrate(
  opts: BuildResearchColonySubstrateOptions,
): ResearchColonySubstrate {
  const sourcePosts = opts.opportunity.matchedSignal.sourcePostData ?? [];
  const divergenceReasoning = opts.opportunity.matchedSignal.divergence?.reasoning ?? null;
  const divergenceDirection = opts.opportunity.matchedSignal.divergence?.direction ?? null;

  const explicitDissent = sourcePosts.find((post) =>
    post.dissents === true || (post.reactions?.disagree ?? 0) > 0 || (post.reactions?.flag ?? 0) > 0);

  const dissentingTake = explicitDissent
    ? mapSignalPostToTake(explicitDissent, "dissenting")
    : divergenceReasoning
      ? {
          txHash: null,
          author: opts.opportunity.matchedSignal.divergence?.agent ?? null,
          category: "ANALYSIS",
          confidence: null,
          stance: "dissenting" as const,
          textSnippet: snippet(divergenceReasoning),
          reactions: null,
        }
      : null;

  const supportingTakes = sourcePosts
    .filter((post) => post.txHash == null || post.txHash !== dissentingTake?.txHash)
    .filter((post) => post.text.trim().length > 0)
    .slice(0, opts.maxSupportingTakes ?? DEFAULT_MAX_SUPPORTING_TAKES)
    .map((post) => mapSignalPostToTake(post, "supporting"));

  const excludedTxHashes = new Set<string>(
    [
      ...sourcePosts.map((post) => post.txHash).filter((value): value is string => typeof value === "string"),
      ...opts.opportunity.matchingFeedPosts.map((post) => post.txHash).filter((value): value is string => typeof value === "string"),
    ],
  );

  const recentRelatedPosts = rankRecentRelatedPosts(
    opts.opportunity,
    opts.allPosts,
    excludedTxHashes,
  ).slice(0, opts.maxRecentRelatedPosts ?? DEFAULT_MAX_RECENT_RELATED_POSTS);

  return {
    signalSummary: {
      topic: opts.opportunity.topic,
      shortTopic: opts.opportunity.matchedSignal.shortTopic ?? null,
      text: opts.opportunity.matchedSignal.text ?? null,
      keyInsight: opts.opportunity.matchedSignal.keyInsight ?? null,
      direction: opts.opportunity.matchedSignal.direction ?? null,
      confidence: opts.opportunity.matchedSignal.confidence ?? null,
      consensus: opts.opportunity.matchedSignal.consensus ?? null,
      consensusScore: opts.opportunity.matchedSignal.consensusScore ?? null,
      agentCount: opts.opportunity.matchedSignal.agentCount ?? null,
      totalAgents: opts.opportunity.matchedSignal.totalAgents ?? null,
      assets: opts.opportunity.matchedSignal.assets ?? [],
      tags: opts.opportunity.matchedSignal.tags ?? [],
    },
    supportingTakes,
    dissentingTake: divergenceDirection != null || dissentingTake != null ? dissentingTake : null,
    crossReferences: (opts.opportunity.matchedSignal.crossReferences ?? []).slice(0, 3),
    reactionSummary: opts.opportunity.matchedSignal.reactionSummary ?? null,
    recentRelatedPosts,
  };
}

function mapSignalPostToTake(
  post: ResearchSignalSourcePost,
  stance: "supporting" | "dissenting",
): ResearchColonyTake {
  return {
    txHash: post.txHash,
    author: post.author,
    category: post.category ?? null,
    confidence: post.confidence ?? null,
    stance,
    textSnippet: snippet(post.text),
    reactions: post.reactions
      ? {
          totalAgrees: post.reactions.agree,
          totalDisagrees: post.reactions.disagree,
          totalFlags: post.reactions.flag,
        }
      : null,
  };
}

function rankRecentRelatedPosts(
  opportunity: ResearchOpportunity,
  posts: ResearchPostInput[],
  excludedTxHashes: Set<string>,
): ResearchRecentContextPost[] {
  const tokens = buildRelatedTokens(opportunity);
  const scored = posts
    .filter((post) => !post.txHash || !excludedTxHashes.has(post.txHash))
    .map((post) => {
      const matchedOn = matchPostTokens(post, tokens);
      if (matchedOn.length === 0) return null;
      const score = matchedOn.length * 5 + (typeof post.timestamp === "number" ? 1 : 0);
      return {
        score,
        post,
        matchedOn,
      };
    })
    .filter((entry): entry is { score: number; post: ResearchPostInput; matchedOn: string[] } => entry != null);

  scored.sort((left, right) =>
    right.score - left.score || (right.post.timestamp ?? 0) - (left.post.timestamp ?? 0));

  return scored.map(({ post, matchedOn }) => ({
    txHash: post.txHash,
    author: post.author,
    category: post.category,
    score: post.score ?? null,
    textSnippet: snippet(post.text),
    matchedOn,
  }));
}

function buildRelatedTokens(opportunity: ResearchOpportunity): string[] {
  const tokens = new Set<string>();
  addTextTokens(tokens, opportunity.topic);
  addTextTokens(tokens, opportunity.matchedSignal.shortTopic ?? "");
  for (const asset of opportunity.matchedSignal.assets ?? []) {
    addTextTokens(tokens, asset);
  }
  for (const tag of opportunity.matchedSignal.tags ?? []) {
    addTextTokens(tokens, tag);
  }
  return Array.from(tokens);
}

function addTextTokens(tokens: Set<string>, value: string): void {
  for (const token of value.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length >= 3) tokens.add(token);
  }
}

function matchPostTokens(post: ResearchPostInput, tokens: string[]): string[] {
  const haystack = post.text.toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).slice(0, 4);
}

function snippet(text: string, maxLength: number = 220): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
