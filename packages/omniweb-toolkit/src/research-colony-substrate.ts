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

export interface ResearchDiscourseParticipant {
  author: string;
  stance: "supporting" | "dissenting" | "related";
  txHash: string | null;
  score: number | null;
  reactionTotal: number;
  textSnippet: string;
}

export interface ResearchDiscourseContext {
  mode: "solitary" | "active-thread";
  namedParticipants: ResearchDiscourseParticipant[];
  totalReactionSignal: number;
  highScoreRelatedCount: number;
  rationale: string;
}

export interface ResearchColonySubstrate {
  signalSummary: ResearchColonySignalSummary;
  supportingTakes: ResearchColonyTake[];
  dissentingTake: ResearchColonyTake | null;
  crossReferences: ResearchSignalCrossReference[];
  reactionSummary: ResearchSignalReactionSummary | null;
  recentRelatedPosts: ResearchRecentContextPost[];
  discourseContext: ResearchDiscourseContext;
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
  const discourseContext = buildDiscourseContext({
    supportingTakes,
    dissentingTake,
    recentRelatedPosts,
    reactionSummary: opts.opportunity.matchedSignal.reactionSummary ?? null,
    contradictionSignals: opts.opportunity.contradictionSignals ?? [],
  });

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
    discourseContext,
  };
}

function buildDiscourseContext(params: {
  supportingTakes: ResearchColonyTake[];
  dissentingTake: ResearchColonyTake | null;
  recentRelatedPosts: ResearchRecentContextPost[];
  reactionSummary: ResearchSignalReactionSummary | null;
  contradictionSignals: string[];
}): ResearchDiscourseContext {
  const byAuthor = new Map<string, ResearchDiscourseParticipant>();

  const upsert = (participant: ResearchDiscourseParticipant): void => {
    const key = participant.author.toLowerCase();
    const existing = byAuthor.get(key);
    if (!existing) {
      byAuthor.set(key, participant);
      return;
    }
    byAuthor.set(key, {
      author: existing.author,
      stance: preferredStance(existing.stance, participant.stance),
      txHash: existing.txHash ?? participant.txHash,
      score: maxNullable(existing.score, participant.score),
      reactionTotal: Math.max(existing.reactionTotal, participant.reactionTotal),
      textSnippet: existing.textSnippet.length >= participant.textSnippet.length ? existing.textSnippet : participant.textSnippet,
    });
  };

  for (const take of params.supportingTakes) {
    if (!isReferenceableAuthor(take.author)) continue;
    upsert({
      author: take.author!,
      stance: "supporting",
      txHash: take.txHash,
      score: null,
      reactionTotal: take.reactions
        ? take.reactions.totalAgrees + take.reactions.totalDisagrees + take.reactions.totalFlags
        : 0,
      textSnippet: take.textSnippet,
    });
  }

  if (params.dissentingTake && isReferenceableAuthor(params.dissentingTake.author)) {
    upsert({
      author: params.dissentingTake.author!,
      stance: "dissenting",
      txHash: params.dissentingTake.txHash,
      score: null,
      reactionTotal: params.dissentingTake.reactions
        ? params.dissentingTake.reactions.totalAgrees
          + params.dissentingTake.reactions.totalDisagrees
          + params.dissentingTake.reactions.totalFlags
        : 0,
      textSnippet: params.dissentingTake.textSnippet,
    });
  }

  for (const post of params.recentRelatedPosts) {
    if (!isReferenceableAuthor(post.author)) continue;
    upsert({
      author: post.author!,
      stance: "related",
      txHash: post.txHash,
      score: post.score,
      reactionTotal: 0,
      textSnippet: post.textSnippet,
    });
  }

  const namedParticipants = Array.from(byAuthor.values())
    .sort((left, right) =>
      right.reactionTotal - left.reactionTotal
      || (right.score ?? 0) - (left.score ?? 0)
      || stancePriority(left.stance) - stancePriority(right.stance)
      || left.author.localeCompare(right.author))
    .slice(0, 3);

  const totalReactionSignal = params.reactionSummary
    ? params.reactionSummary.totalAgrees + params.reactionSummary.totalDisagrees + params.reactionSummary.totalFlags
    : 0;
  const highScoreRelatedCount = params.recentRelatedPosts.filter((post) => (post.score ?? 0) >= 85).length;
  const mode = namedParticipants.length > 0 && (
    totalReactionSignal >= 5
    || highScoreRelatedCount > 0
    || namedParticipants.length >= 2
    || params.contradictionSignals.length > 0
  )
    ? "active-thread"
    : "solitary";

  return {
    mode,
    namedParticipants,
    totalReactionSignal,
    highScoreRelatedCount,
    rationale: mode === "active-thread"
      ? "The colony already has named participants and visible attention around this topic, so the post should enter that discussion instead of pretending the room is empty."
      : "There is not enough named live discourse to justify forcing a conversational framing.",
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

function isReferenceableAuthor(author: string | null): author is string {
  if (typeof author !== "string") return false;
  const trimmed = author.trim();
  if (trimmed.length === 0) return false;
  return !/^0x[a-f0-9]{8,}$/i.test(trimmed);
}

function preferredStance(
  left: ResearchDiscourseParticipant["stance"],
  right: ResearchDiscourseParticipant["stance"],
): ResearchDiscourseParticipant["stance"] {
  return stancePriority(left) <= stancePriority(right) ? left : right;
}

function stancePriority(value: ResearchDiscourseParticipant["stance"]): number {
  switch (value) {
    case "dissenting":
      return 0;
    case "supporting":
      return 1;
    default:
      return 2;
  }
}

function maxNullable(left: number | null, right: number | null): number | null {
  if (left == null) return right;
  if (right == null) return left;
  return Math.max(left, right);
}
