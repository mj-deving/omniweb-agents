export interface PublishVisibilityResult {
  attempted: true;
  visible: boolean;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
  txHash?: string;
  verificationPath?: "feed" | "post_detail" | "chain";
  feedScope?: "recent" | "category";
  observedCategory?: string;
  observedBlockNumber?: number;
  observedScore?: number;
  lastIndexedBlock?: number;
  error?: string;
}

interface PublishVisibilityOmni {
  colony: {
    getFeed(opts: { limit: number; category?: string }): Promise<any>;
    getPostDetail?(txHash: string): Promise<any>;
  };
  runtime?: {
    sdkBridge?: {
      getHivePosts?(limit: number): Promise<any>;
    };
  };
}

export async function verifyPublishVisibility(
  omni: PublishVisibilityOmni,
  txHash: string | undefined,
  text: string,
  opts: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  },
): Promise<PublishVisibilityResult> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? defaultSleep;
  const startedAt = now();
  const deadline = now() + opts.timeoutMs;
  const textSnippet = text.slice(0, 96);
  let polls = 0;
  let lastIndexedBlock: number | undefined;
  let lastError: string | undefined;
  let chainVisible: PublishVisibilityResult | null = null;

  while (now() <= deadline) {
    polls += 1;
    const recentFeedMatch = await readFeedMatch(omni, txHash, textSnippet, {
      limit: opts.limit,
    });
    if (recentFeedMatch.result?.ok) {
      lastIndexedBlock = typeof recentFeedMatch.result.data?.meta?.lastBlock === "number"
        ? recentFeedMatch.result.data.meta.lastBlock
        : undefined;
    } else if (recentFeedMatch.result) {
      lastError = recentFeedMatch.result?.error ?? "feed_unavailable";
    }

    if (recentFeedMatch.matched) {
      return {
        attempted: true,
        visible: true,
        indexedVisible: true,
        polls,
        elapsedMs: now() - startedAt,
        txHash: recentFeedMatch.matched.txHash ?? recentFeedMatch.matched.tx_hash ?? txHash,
        verificationPath: "feed",
        feedScope: "recent",
        observedCategory: recentFeedMatch.matched.category ?? recentFeedMatch.matched.payload?.cat,
        observedBlockNumber: recentFeedMatch.matched.blockNumber,
        observedScore: typeof recentFeedMatch.matched.score === "number" ? recentFeedMatch.matched.score : undefined,
        lastIndexedBlock,
      };
    }

    if (txHash && typeof omni?.colony?.getPostDetail === "function") {
      const postDetailResult = await omni.colony.getPostDetail(txHash);
      if (postDetailResult?.ok && postDetailResult.data?.post) {
        const observedCategory =
          (postDetailResult.data.post.payload as { cat?: string } | undefined)?.cat;
        if (observedCategory) {
          const categoryFeedMatch = await readFeedMatch(omni, txHash, textSnippet, {
            limit: opts.limit,
            category: observedCategory,
          });
          if (categoryFeedMatch.matched) {
            return {
              attempted: true,
              visible: true,
              indexedVisible: true,
              polls,
              elapsedMs: now() - startedAt,
              txHash: categoryFeedMatch.matched.txHash ?? categoryFeedMatch.matched.tx_hash ?? txHash,
              verificationPath: "feed",
              feedScope: "category",
              observedCategory,
              observedBlockNumber: categoryFeedMatch.matched.blockNumber ?? postDetailResult.data.post.blockNumber,
              observedScore: typeof categoryFeedMatch.matched.score === "number"
                ? categoryFeedMatch.matched.score
                : undefined,
              lastIndexedBlock,
            };
          }
        }

        return {
          attempted: true,
          visible: true,
          indexedVisible: true,
          polls,
          elapsedMs: now() - startedAt,
          txHash,
          verificationPath: "post_detail",
          observedCategory,
          observedBlockNumber: postDetailResult.data.post.blockNumber,
          lastIndexedBlock,
        };
      }
      if (!postDetailResult?.ok) {
        lastError = postDetailResult?.error ?? lastError;
      }
    }

    const bridge = omni?.runtime?.sdkBridge;
    if (txHash && typeof bridge?.getHivePosts === "function") {
      try {
        const chainPosts = await bridge.getHivePosts(Math.max(opts.limit, 50));
        const matched = Array.isArray(chainPosts)
          ? chainPosts.find((post: any) => {
              const postText = post?.text ?? "";
              return post?.txHash === txHash || (typeof postText === "string" && postText.includes(textSnippet));
            })
          : null;

        if (matched) {
          chainVisible = {
            attempted: true,
            visible: true,
            indexedVisible: false,
            polls,
            elapsedMs: now() - startedAt,
            txHash: matched.txHash ?? txHash,
            verificationPath: "chain",
            observedCategory: matched.category,
            observedBlockNumber: matched.blockNumber,
            lastIndexedBlock,
            error: lastError ?? "post_visible_on_chain_but_not_yet_indexed",
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    if (now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  if (chainVisible) {
    return {
      ...chainVisible,
      polls,
      lastIndexedBlock,
      error: lastError ?? chainVisible.error,
    };
  }

  return {
    attempted: true,
    visible: false,
    indexedVisible: false,
    polls,
    elapsedMs: now() - startedAt,
    txHash,
    lastIndexedBlock,
    error: lastError ?? "published_post_not_seen_via_feed_or_post_detail",
  };
}

export interface SocialWriteCandidate {
  txHash: string;
  author: string;
  text: string;
  category?: string;
  score?: number;
  sourceAttestationUrls: string[];
  agreeCount: number;
  disagreeCount: number;
  flagCount: number;
  replyCount: number;
  reactionTotal: number;
  engagementTotal: number;
  selectionScore: number;
}

export interface SocialWriteCandidateFloor {
  minScore: number;
  minEngagement: number;
}

export const DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR: SocialWriteCandidateFloor = {
  minScore: 85,
  minEngagement: 5,
};

export interface ReactionEnvelope {
  agree: number;
  disagree: number;
  flag: number;
  myReaction?: string | null;
}

export interface TipReadback {
  totalTips: number;
  totalDem: number;
  myTip?: unknown;
}

export interface AgentTipReadback {
  receivedCount: number;
  receivedDem: number;
  givenCount: number;
  givenDem: number;
}

export interface PostDetailLike {
  replies?: Array<{ txHash?: string | null } | null> | null;
}

export function rankSocialWriteCandidates(
  posts: unknown[],
  ownAddress: string,
): SocialWriteCandidate[] {
  const normalizedOwn = ownAddress.trim().toLowerCase();
  const candidates: SocialWriteCandidate[] = [];

  for (const post of posts) {
    if (!post || typeof post !== "object") continue;
    const record = post as Record<string, unknown>;
    const txHash = readString(record.txHash) ?? readString(record.tx_hash);
    const author = readString(record.author);
    const text =
      readString(record.text)
      ?? readNestedString(record.payload, "text")
      ?? readString(record.content)
      ?? "";
    const sourceAttestationUrls = readAttestationUrls(record);

    if (!txHash || !author || !text) continue;
    if (author.trim().toLowerCase() === normalizedOwn) continue;
    if (sourceAttestationUrls.length === 0) continue;

    const score = readNumber(record.score) ?? undefined;
    const reactions = readReactionCounts(record);
    const replyCount = readNumber(record.replyCount) ?? readNestedNumber(record.payload, "replyCount") ?? 0;
    const reactionTotal = reactions.agree + reactions.disagree + reactions.flag;
    const engagementTotal = reactionTotal + replyCount;

    candidates.push({
      txHash,
      author,
      text,
      category: readString(record.category) ?? readNestedString(record.payload, "cat") ?? undefined,
      score,
      sourceAttestationUrls,
      agreeCount: reactions.agree,
      disagreeCount: reactions.disagree,
      flagCount: reactions.flag,
      replyCount,
      reactionTotal,
      engagementTotal,
      selectionScore: scoreSocialWriteCandidate({
        score: score ?? 0,
        agreeCount: reactions.agree,
        disagreeCount: reactions.disagree,
        flagCount: reactions.flag,
        replyCount,
        attestationCount: sourceAttestationUrls.length,
      }),
    });
  }

  return candidates.sort((left, right) => {
    if (right.selectionScore !== left.selectionScore) return right.selectionScore - left.selectionScore;
    if (right.engagementTotal !== left.engagementTotal) return right.engagementTotal - left.engagementTotal;
    if (right.score !== left.score) return (right.score ?? 0) - (left.score ?? 0);
    return left.txHash.localeCompare(right.txHash);
  });
}

export function selectSocialWriteCandidate(
  posts: unknown[],
  ownAddress: string,
): SocialWriteCandidate | null {
  return rankSocialWriteCandidates(posts, ownAddress)[0] ?? null;
}

export function socialWriteCandidateMeetsFloor(
  candidate: SocialWriteCandidate,
  floor: SocialWriteCandidateFloor = DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR,
): boolean {
  return (candidate.score ?? 0) >= floor.minScore && candidate.engagementTotal >= floor.minEngagement;
}

export function normalizeReactionEnvelope(value: unknown): ReactionEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    agree: readNumber(record.agree) ?? 0,
    disagree: readNumber(record.disagree) ?? 0,
    flag: readNumber(record.flag) ?? 0,
    myReaction: readString(record.myReaction) ?? null,
  };
}

export function reactionReadbackSatisfied(
  before: ReactionEnvelope | null,
  after: ReactionEnvelope | null,
  expectedType: "agree" | "disagree" | "flag",
): boolean {
  if (!after) return false;
  if (after.myReaction === expectedType) return true;

  const beforeCount = before?.[expectedType] ?? 0;
  const afterCount = after[expectedType] ?? 0;
  return afterCount > beforeCount;
}

export function normalizeTipReadback(value: unknown): TipReadback | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    totalTips: readNumber(record.totalTips) ?? 0,
    totalDem: readNumber(record.totalDem) ?? 0,
    myTip: record.myTip,
  };
}

export function normalizeAgentTipReadback(value: unknown): AgentTipReadback | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const tipsReceived = readNestedRecord(record.tipsReceived);
  const tipsGiven = readNestedRecord(record.tipsGiven);

  return {
    receivedCount: readNumber(tipsReceived?.count) ?? 0,
    receivedDem: readNumber(tipsReceived?.totalDem) ?? 0,
    givenCount: readNumber(tipsGiven?.count) ?? 0,
    givenDem: readNumber(tipsGiven?.totalDem) ?? 0,
  };
}

export function normalizeBalance(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function tipReadbackSatisfied(
  before: TipReadback | null,
  after: TipReadback | null,
  minimumSpend: number,
): boolean {
  const beforeMyTip = readNumber(before?.myTip);
  const afterMyTip = readNumber(after?.myTip);

  if (afterMyTip != null) {
    if (beforeMyTip == null) {
      if (afterMyTip > 0) return true;
    } else if (afterMyTip > beforeMyTip) {
      return true;
    }
  } else if (hasRecordedTip(after?.myTip) && !hasRecordedTip(before?.myTip)) {
    return true;
  }

  if ((after?.totalTips ?? 0) > (before?.totalTips ?? 0)) return true;
  if ((after?.totalDem ?? 0) >= (before?.totalDem ?? 0) + minimumSpend) return true;

  return false;
}

export function agentTipReadbackSatisfied(
  before: AgentTipReadback | null,
  after: AgentTipReadback | null,
  minimumSpend: number,
): boolean {
  if (!after) return false;
  if ((after.receivedCount ?? 0) > (before?.receivedCount ?? 0)) return true;
  if ((after.receivedDem ?? 0) >= (before?.receivedDem ?? 0) + minimumSpend) return true;
  return false;
}

export function tipSpendObserved(
  beforeBalance: number | null,
  afterBalance: number | null,
  minimumSpend: number,
): boolean {
  if (beforeBalance == null || afterBalance == null) return false;
  return beforeBalance - afterBalance >= minimumSpend;
}

export function hasRecordedTip(value: unknown): boolean {
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return value != null;
}

export function parentThreadContainsReply(detail: PostDetailLike | null | undefined, replyTxHash: string): boolean {
  if (!detail?.replies) return false;
  return detail.replies.some((reply) => reply?.txHash === replyTxHash);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNestedString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  return readString((value as Record<string, unknown>)[key]);
}

function readNestedNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  return readNumber((value as Record<string, unknown>)[key]);
}

function readNestedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function readReactionCounts(record: Record<string, unknown>): ReactionEnvelope {
  const reactions = record.reactions;
  const payloadReactions = (record.payload as { reactions?: unknown } | undefined)?.reactions;
  const source = reactions && typeof reactions === "object"
    ? reactions
    : payloadReactions && typeof payloadReactions === "object"
      ? payloadReactions
      : null;
  const envelope = normalizeReactionEnvelope(source);
  return envelope ?? { agree: 0, disagree: 0, flag: 0, myReaction: null };
}

function readAttestationUrls(record: Record<string, unknown>): string[] {
  const payload = record.payload;
  const entries = Array.isArray(record.sourceAttestations)
    ? record.sourceAttestations
    : Array.isArray((payload as { sourceAttestations?: unknown } | undefined)?.sourceAttestations)
      ? (payload as { sourceAttestations: unknown[] }).sourceAttestations
      : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return readString((entry as Record<string, unknown>).url);
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function scoreSocialWriteCandidate(input: {
  score: number;
  agreeCount: number;
  disagreeCount: number;
  flagCount: number;
  replyCount: number;
  attestationCount: number;
}): number {
  const quality = Math.max(0, input.score);
  const supportHeat = input.agreeCount + Math.min(input.replyCount, 10);
  const attestationBoost = Math.min(input.attestationCount, 3) * 3;
  const controversyPenalty =
    (input.disagreeCount * 2)
    + (input.flagCount * 5)
    + (input.disagreeCount > input.agreeCount ? 15 : 0);

  return quality + supportHeat + attestationBoost - controversyPenalty;
}

async function readFeedMatch(
  omni: PublishVisibilityOmni,
  txHash: string | undefined,
  textSnippet: string,
  opts: { limit: number; category?: string },
): Promise<{ result: any; matched: any | null }> {
  const result = await omni.colony.getFeed(opts);
  if (!result?.ok) {
    return { result, matched: null };
  }

  const posts = Array.isArray(result.data?.posts) ? result.data.posts : [];
  const matched = posts.find((post: any) => {
    const postTxHash = post?.txHash ?? post?.tx_hash;
    const postText = post?.text ?? post?.payload?.text ?? post?.content ?? "";
    return (txHash && postTxHash === txHash) || (typeof postText === "string" && postText.includes(textSnippet));
  }) ?? null;

  return { result, matched };
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
