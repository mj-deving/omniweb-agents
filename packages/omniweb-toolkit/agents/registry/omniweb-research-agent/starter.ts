import { pathToFileURL } from "node:url";
/**
 * Simple research starter.
 *
 * Use this before the advanced runtime. It follows the same streamlined
 * observe -> attestation -> draft -> publish-or-skip flow as the other
 * archetype starters.
 */
import {
  buildLeaderboardPatternPrompt,
  buildResearchColonySubstrate,
  buildResearchDraft,
  buildResearchSelfHistory,
  fetchResearchEvidenceSummary,
  deriveResearchOpportunities,
  matchResearchDraftToPlan,
  runMinimalAgentLoop,
  type MinimalObserveContext,
  type MinimalObserveResult,
  type ResearchPostInput,
  type ResearchPublishHistoryEntry,
  type ResearchSignalCrossReference,
  type ResearchSignalDivergence,
  type ResearchSignalInput,
  type ResearchSignalReactionSummary,
  type ResearchSignalSourcePost,
} from "omniweb-toolkit/agent";

interface ResearchState {
  lastCoverageTopic?: string;
  lastPublishedAt?: string;
  topicHistory?: Array<{
    topic: string;
    publishedAt: string;
    opportunityKind: string;
  }>;
  publishHistory?: ResearchPublishHistoryEntry[];
}

type FeedSample = ResearchPostInput;

interface ReadResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const MAX_TOPIC_HISTORY = 5;
const PUBLISH_COOLDOWN_MS = 30 * 60 * 1000;

function buildStarterPromptText(params: {
  topic: string;
  family: string;
  opportunityKind: string;
  score: number;
  feedCount: number;
  signalCount: number;
  attestUrl: string;
}): string {
  return buildLeaderboardPatternPrompt({
    role: "a research analyst following the one-source attestation-first leaderboard pattern",
    sourceName: params.attestUrl,
    observedFacts: [
      `Selected topic: ${params.topic}.`,
      `Research family: ${params.family}.`,
      `Opportunity kind: ${params.opportunityKind}.`,
      `Opportunity score: ${params.score}.`,
      `Feed sample size: ${params.feedCount}.`,
      `Signal sample size: ${params.signalCount}.`,
    ],
    domainRules: [
      "Keep one concrete thesis anchored in fetched evidence.",
      "Use only observed numbers or explicit uncertainty.",
      "Skip when the evidence packet does not move the topic forward.",
    ],
  });
}

function postText(post: unknown): string {
  if (!post || typeof post !== "object") return "";
  const payload = (post as { payload?: { text?: unknown } }).payload;
  const payloadText = payload?.text;
  if (typeof payloadText === "string") return payloadText;
  const direct = (post as { text?: unknown }).text;
  return typeof direct === "string" ? direct : "";
}

function samplePost(post: unknown): FeedSample {
  if (!post || typeof post !== "object") {
    return {
      txHash: null,
      category: null,
      text: "",
      author: null,
      timestamp: null,
      score: null,
    };
  }

  const payload = (post as { payload?: { cat?: unknown } }).payload;
  return {
    txHash: typeof (post as { txHash?: unknown }).txHash === "string" ? (post as { txHash: string }).txHash : null,
    category: typeof payload?.cat === "string" ? payload.cat : null,
    text: postText(post),
    author: typeof (post as { author?: unknown }).author === "string" ? (post as { author: string }).author : null,
    timestamp: typeof (post as { timestamp?: unknown }).timestamp === "number" ? (post as { timestamp: number }).timestamp : null,
    score: typeof (post as { score?: unknown }).score === "number" ? (post as { score: number }).score : null,
  };
}

function signalString(signal: unknown, key: string): string | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function signalNumber(signal: unknown, key: string): number | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as Record<string, unknown>)[key];
  return typeof candidate === "number" ? candidate : null;
}

function signalBoolean(signal: unknown, key: string): boolean | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as Record<string, unknown>)[key];
  return typeof candidate === "boolean" ? candidate : null;
}

function signalTopic(signal: unknown): string | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { shortTopic?: unknown; topic?: unknown }).shortTopic
    ?? (signal as { shortTopic?: unknown; topic?: unknown }).topic;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function signalConfidence(signal: unknown): number | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { confidence?: unknown }).confidence;
  return typeof candidate === "number" ? candidate : null;
}

function sampleSignalSourcePost(post: unknown): ResearchSignalSourcePost | null {
  if (!post || typeof post !== "object") return null;
  const reactionsValue = (post as { reactions?: unknown }).reactions;
  const reactions = reactionsValue && typeof reactionsValue === "object"
    ? {
        agree: typeof (reactionsValue as { agree?: unknown }).agree === "number" ? (reactionsValue as { agree: number }).agree : 0,
        disagree: typeof (reactionsValue as { disagree?: unknown }).disagree === "number" ? (reactionsValue as { disagree: number }).disagree : 0,
        flag: typeof (reactionsValue as { flag?: unknown }).flag === "number" ? (reactionsValue as { flag: number }).flag : 0,
      }
    : null;

  const assetsValue = (post as { assets?: unknown }).assets;
  return {
    txHash: signalString(post, "txHash"),
    author: signalString(post, "author"),
    text: signalString(post, "text") ?? "",
    category: signalString(post, "cat"),
    timestamp: signalNumber(post, "timestamp"),
    confidence: signalNumber(post, "confidence"),
    assets: Array.isArray(assetsValue) ? assetsValue.filter((value): value is string => typeof value === "string") : [],
    dissents: signalBoolean(post, "dissents") ?? false,
    reactions,
  };
}

function sampleSignalCrossReference(value: unknown): ResearchSignalCrossReference | null {
  if (!value || typeof value !== "object") return null;
  const assetsValue = (value as { assets?: unknown }).assets;
  return {
    type: signalString(value, "type") ?? "unknown",
    description: signalString(value, "description") ?? "",
    assets: Array.isArray(assetsValue) ? assetsValue.filter((entry): entry is string => typeof entry === "string") : [],
  };
}

function sampleSignalReactionSummary(value: unknown): ResearchSignalReactionSummary | null {
  if (!value || typeof value !== "object") return null;
  return {
    totalAgrees: signalNumber(value, "totalAgrees") ?? 0,
    totalDisagrees: signalNumber(value, "totalDisagrees") ?? 0,
    totalFlags: signalNumber(value, "totalFlags") ?? 0,
  };
}

function sampleSignalDivergence(value: unknown): ResearchSignalDivergence | null {
  if (!value || typeof value !== "object") return null;
  return {
    agent: signalString(value, "agent"),
    direction: signalString(value, "direction"),
    reasoning: signalString(value, "reasoning"),
  };
}

function sampleSignal(signal: unknown): ResearchSignalInput {
  const assetsValue = signal && typeof signal === "object" ? (signal as { assets?: unknown }).assets : null;
  const tagsValue = signal && typeof signal === "object" ? (signal as { tags?: unknown }).tags : null;
  const sourcePostDataValue = signal && typeof signal === "object" ? (signal as { sourcePostData?: unknown }).sourcePostData : null;
  const crossReferencesValue = signal && typeof signal === "object" ? (signal as { crossReferences?: unknown }).crossReferences : null;

  return {
    topic: signalTopic(signal),
    shortTopic: signalString(signal, "shortTopic"),
    confidence: signalConfidence(signal),
    direction: signalString(signal, "direction"),
    text: signalString(signal, "text"),
    keyInsight: signalString(signal, "keyInsight"),
    consensus: signalBoolean(signal, "consensus"),
    consensusScore: signalNumber(signal, "consensusScore"),
    agentCount: signalNumber(signal, "agentCount"),
    totalAgents: signalNumber(signal, "totalAgents"),
    assets: Array.isArray(assetsValue) ? assetsValue.filter((value): value is string => typeof value === "string") : [],
    tags: Array.isArray(tagsValue) ? tagsValue.filter((value): value is string => typeof value === "string") : [],
    sourcePostData: Array.isArray(sourcePostDataValue)
      ? sourcePostDataValue.map(sampleSignalSourcePost).filter((value): value is ResearchSignalSourcePost => value != null)
      : [],
    crossReferences: Array.isArray(crossReferencesValue)
      ? crossReferencesValue.map(sampleSignalCrossReference).filter((value): value is ResearchSignalCrossReference => value != null)
      : [],
    reactionSummary: sampleSignalReactionSummary(signal && typeof signal === "object" ? (signal as { reactionSummary?: unknown }).reactionSummary : null),
    divergence: sampleSignalDivergence(signal && typeof signal === "object" ? (signal as { divergence?: unknown }).divergence : null),
  };
}

export async function observe(
  ctx: MinimalObserveContext<ResearchState>,
): Promise<MinimalObserveResult<ResearchState>> {
  const [feed, signals, leaderboard, balance] = await Promise.allSettled([
    ctx.omni.colony.getFeed({ limit: 30 }),
    ctx.omni.colony.getSignals(),
    ctx.omni.colony.getLeaderboard({ limit: 10 }),
    ctx.omni.colony.getBalance(),
  ]);

  const feedRead = unwrapReadResult(feed);
  const signalsRead = unwrapReadResult(signals);
  const leaderboardRead = unwrapReadResult(leaderboard);
  const balanceRead = unwrapReadResult(balance);
  const readStatus = {
    feed: describeReadStatus(feedRead),
    signals: describeReadStatus(signalsRead),
    leaderboard: describeReadStatus(leaderboardRead),
    balance: describeReadStatus(balanceRead),
  };

  if (!feedRead.ok || !signalsRead.ok || !balanceRead.ok) {
    return {
      kind: "skip",
      reason: "read_failed",
      facts: readStatus,
      audit: {
        promptPacket: {
          objective: "Continue only when the simple research starter has feed, signals, and balance reads.",
          readStatus,
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const posts = extractFeedPosts(feedRead.data);
  const signalEntries = extractSignalList(signalsRead.data).map(sampleSignal);
  const leaderboardAgents = extractLeaderboardAgents(leaderboardRead.data);
  const availableBalance = extractAvailableBalance(balanceRead.data);
  const feedSample = posts.slice(0, 10);
  const signalSample = signalEntries.slice(0, 10).map((signal) => ({
    topic: signal.topic,
    shortTopic: signal.shortTopic ?? null,
    confidence: signal.confidence,
    direction: signal.direction,
    keyInsight: signal.keyInsight ?? null,
    agentCount: signal.agentCount ?? null,
    assets: signal.assets ?? [],
    tags: signal.tags ?? [],
  }));

  if (availableBalance < 10 || signalEntries.length === 0) {
    return {
      kind: "skip",
      reason: availableBalance < 10 ? "low_balance" : "no_signals",
      facts: {
        availableBalance,
        signalCount: signalEntries.length,
        feedCount: posts.length,
        ...readStatus,
      },
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        promptPacket: {
          objective: "Decide whether a simple research publish is justified from current signals and feed coverage.",
          skipReason: availableBalance < 10 ? "low_balance" : "no_signals",
          readStatus,
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const opportunities = deriveResearchOpportunities({
    signals: signalEntries,
    posts,
    lastCoverageTopic: ctx.memory.state?.lastCoverageTopic ?? null,
    recentCoverageTopics: (ctx.memory.state?.topicHistory ?? []).map((entry) => entry.topic),
    recentCoverageFamilies: (ctx.memory.state?.publishHistory ?? [])
      .map((entry) => entry.family)
      .filter((family): family is string => typeof family === "string" && family.length > 0),
  });

  const chosenOpportunity = opportunities.find((opportunity) =>
    opportunity.sourceProfile.supported
    && opportunity.attestationPlan.ready
    && opportunity.attestationPlan.primary,
  ) ?? opportunities[0] ?? null;

  if (!chosenOpportunity) {
    return {
      kind: "skip",
      reason: "no_publishable_research_opportunity",
      facts: {
        signalCount: signalEntries.length,
        feedCount: posts.length,
        ...readStatus,
      },
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        promptPacket: {
          objective: "Find one publishable research opportunity grounded in current signals and feed drift.",
          readStatus,
          result: "skip",
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const publishedAtMs = parseIsoMs(ctx.memory.state?.lastPublishedAt);
  if (publishedAtMs != null && Date.parse(ctx.cycle.startedAt) - publishedAtMs < PUBLISH_COOLDOWN_MS) {
    return {
      kind: "skip",
      reason: "published_within_last_30m",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
        lastPublishedAt: ctx.memory.state?.lastPublishedAt ?? null,
        cooldownMsRemaining: PUBLISH_COOLDOWN_MS - (Date.parse(ctx.cycle.startedAt) - publishedAtMs),
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
        },
        promptPacket: {
          objective: "Skip repeated research publishes until the 30-minute cooldown expires.",
          topic: chosenOpportunity.topic,
          opportunityKind: chosenOpportunity.kind,
          result: "skip",
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (!chosenOpportunity.sourceProfile.supported) {
    return {
      kind: "skip",
      reason: "research_family_not_ready",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        sourceProfileReason: chosenOpportunity.sourceProfile.reason,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
        },
        promptPacket: {
          objective: "Only publish when the topic maps cleanly to a supported research family.",
          topic: chosenOpportunity.topic,
          opportunityKind: chosenOpportunity.kind,
          result: "skip",
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (!chosenOpportunity.attestationPlan.ready || !chosenOpportunity.attestationPlan.primary) {
    return {
      kind: "skip",
      reason: "attestation_plan_not_ready",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
        opportunityScore: chosenOpportunity.score,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
        },
        promptPacket: {
          objective: "Only publish when the claim has a viable primary attestation source.",
          topic: chosenOpportunity.topic,
          opportunityKind: chosenOpportunity.kind,
          result: "skip",
          attestationPlanReady: chosenOpportunity.attestationPlan.ready,
        },
        notes: chosenOpportunity.attestationPlan.warnings,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const colonySubstrate = buildResearchColonySubstrate({
    opportunity: chosenOpportunity,
    allPosts: posts,
  });

  const evidenceReads = await Promise.allSettled([
    fetchResearchEvidenceSummary({
      source: chosenOpportunity.attestationPlan.primary,
      topic: chosenOpportunity.topic,
    }),
    ...chosenOpportunity.attestationPlan.supporting.map((source) =>
      fetchResearchEvidenceSummary({
        source,
        topic: chosenOpportunity.topic,
      })),
  ]);

  const prefetchedReadResults = evidenceReads.flatMap((entry) =>
    entry.status === "fulfilled" ? [entry.value] : []);
  const primaryEvidenceRead = evidenceReads[0];
  const supportingEvidenceReads = evidenceReads.slice(1);
  const evidenceSummaryResult = primaryEvidenceRead?.status === "fulfilled"
    ? primaryEvidenceRead.value
    : {
        ok: false as const,
        reason: "fetch_failed" as const,
        note: primaryEvidenceRead?.status === "rejected"
          ? `Primary evidence fetch failed for ${chosenOpportunity.attestationPlan.primary.name}: ${String(primaryEvidenceRead.reason)}`
          : `Primary evidence fetch failed for ${chosenOpportunity.attestationPlan.primary.name}.`,
      };
  const supportingEvidenceSummaries = supportingEvidenceReads.flatMap((entry) =>
    entry.status === "fulfilled" && entry.value.ok ? [entry.value.summary] : []);
  const supportingEvidenceNotes = supportingEvidenceReads.flatMap((entry, index) => {
    const source = chosenOpportunity.attestationPlan.supporting[index];
    if (!source) return [];
    if (entry.status === "rejected") {
      return [`Supporting evidence fetch failed for ${source.name}: ${String(entry.reason)}`];
    }
    if (!entry.value.ok) {
      return [`Supporting evidence fetch skipped for ${source.name}: ${entry.value.note}`];
    }
    return [];
  });

  if (!evidenceSummaryResult.ok) {
    return {
      kind: "skip",
      reason: "evidence_summary_not_ready",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
          colonySubstrate,
        },
        promptPacket: {
          objective: "Only prompt from real fetched evidence, not topic labels alone.",
          topic: chosenOpportunity.topic,
          opportunityKind: chosenOpportunity.kind,
          result: "skip",
        },
        notes: [
          evidenceSummaryResult.note,
          ...supportingEvidenceNotes,
          ...chosenOpportunity.attestationPlan.warnings,
        ],
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const selfHistory = buildResearchSelfHistory({
    history: ctx.memory.state?.publishHistory ?? [],
    topic: chosenOpportunity.topic,
    family: chosenOpportunity.sourceProfile.family,
    now: ctx.cycle.startedAt,
    currentEvidenceValues: evidenceSummaryResult.summary.values,
  });

  if (selfHistory.skipSuggested) {
    return {
      kind: "skip",
      reason: "recent_self_coverage_without_new_delta",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
          colonySubstrate,
          evidenceSummary: evidenceSummaryResult.summary,
          supportingEvidenceSummaries,
          selfHistory,
        },
        promptPacket: {
          objective: "Skip when the same research topic or family was just covered without meaningful evidence change.",
          topic: chosenOpportunity.topic,
          opportunityKind: chosenOpportunity.kind,
          result: "skip",
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const draft = await buildResearchDraft({
    opportunity: chosenOpportunity,
    feedCount: posts.length,
    leaderboardCount: leaderboardAgents.length,
    availableBalance,
    colonySubstrate,
    evidenceSummary: evidenceSummaryResult.summary,
    supportingEvidenceSummaries,
    selfHistory,
    llmProvider: ctx.omni.runtime.llmProvider,
    minTextLength: 200,
  });

  if (!draft.ok) {
    return {
      kind: "skip",
      reason: draft.reason,
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
        opportunityScore: chosenOpportunity.score,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
          colonySubstrate,
          evidenceSummary: evidenceSummaryResult.summary,
          supportingEvidenceSummaries,
          selfHistory,
        },
        promptPacket: draft.promptPacket as unknown as Record<string, unknown>,
        notes: [
          ...draft.notes,
          ...supportingEvidenceNotes,
          ...chosenOpportunity.attestationPlan.warnings,
        ],
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const sourceMatch = await matchResearchDraftToPlan({
    topic: chosenOpportunity.topic,
    text: draft.text,
    tags: draft.tags,
    attestationPlan: chosenOpportunity.attestationPlan,
    evidenceReads: prefetchedReadResults,
  });

  if (!sourceMatch.pass) {
    return {
      kind: "skip",
      reason: "draft_source_match_failed",
      facts: {
        topic: chosenOpportunity.topic,
        researchFamily: chosenOpportunity.sourceProfile.family,
        opportunityKind: chosenOpportunity.kind,
      },
      attestationPlan: chosenOpportunity.attestationPlan,
      audit: {
        inputs: {
          feedSample,
          signalSample,
          leaderboardSample: leaderboardAgents.slice(0, 5),
        },
        selectedEvidence: {
          matchedSignal: chosenOpportunity.matchedSignal,
          feedMentions: chosenOpportunity.matchingFeedPosts,
          sourceProfile: chosenOpportunity.sourceProfile,
          colonySubstrate,
          evidenceSummary: evidenceSummaryResult.summary,
          supportingEvidenceSummaries,
          selfHistory,
          sourceMatch,
        },
        promptPacket: draft.promptPacket as unknown as Record<string, unknown>,
        notes: [
          ...supportingEvidenceNotes,
          ...chosenOpportunity.attestationPlan.warnings,
        ],
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const starterPromptText = buildStarterPromptText({
    topic: chosenOpportunity.topic,
    family: chosenOpportunity.sourceProfile.family,
    opportunityKind: chosenOpportunity.kind,
    score: chosenOpportunity.score,
    feedCount: posts.length,
    signalCount: signalEntries.length,
    attestUrl: chosenOpportunity.attestationPlan.primary.url,
  });

  return {
    kind: "publish",
    category: draft.category,
    text: draft.text,
    attestUrl: chosenOpportunity.attestationPlan.primary.url,
    tags: draft.tags,
    confidence: draft.confidence,
    facts: {
      topic: chosenOpportunity.topic,
      researchFamily: chosenOpportunity.sourceProfile.family,
      opportunityKind: chosenOpportunity.kind,
      opportunityScore: chosenOpportunity.score,
      draftSource: draft.draftSource,
      availableBalance,
      leaderboardPatternPrompt: starterPromptText,
    },
    attestationPlan: chosenOpportunity.attestationPlan,
    audit: {
      inputs: {
        feedSample,
        signalSample,
        leaderboardSample: leaderboardAgents.slice(0, 5),
      },
      selectedEvidence: {
        matchedSignal: chosenOpportunity.matchedSignal,
        feedMentions: chosenOpportunity.matchingFeedPosts,
        sourceProfile: chosenOpportunity.sourceProfile,
        colonySubstrate,
        evidenceSummary: evidenceSummaryResult.summary,
        supportingEvidenceSummaries,
        selfHistory,
        sourceMatch,
      },
      promptPacket: {
        ...draft.promptPacket,
        category: draft.category,
        draftText: draft.text,
        qualityGate: draft.qualityGate,
        leaderboardPatternPrompt: starterPromptText,
        primaryAttestUrl: chosenOpportunity.attestationPlan.primary.url,
        supportingAttestUrls: chosenOpportunity.attestationPlan.supporting.map((candidate) => candidate.url),
      },
      notes: [
        "The simple research starter persists reduced raw inputs, selected evidence, the prompt packet, and the attestation plan for operator audit.",
        "Move to assets/research-agent-runtime.ts only when the simple loop is already working and you need heavier frontier ranking or evidence-history logic.",
        ...supportingEvidenceNotes,
        ...chosenOpportunity.attestationPlan.warnings,
      ],
    },
    nextState: {
      lastCoverageTopic: chosenOpportunity.topic,
      lastPublishedAt: ctx.cycle.startedAt,
      topicHistory: buildNextTopicHistory(ctx.memory.state?.topicHistory ?? [], {
        topic: chosenOpportunity.topic,
        publishedAt: ctx.cycle.startedAt,
        opportunityKind: chosenOpportunity.kind,
      }),
      publishHistory: buildNextPublishHistory(ctx.memory.state?.publishHistory ?? [], {
        topic: chosenOpportunity.topic,
        family: chosenOpportunity.sourceProfile.family,
        publishedAt: ctx.cycle.startedAt,
        opportunityKind: chosenOpportunity.kind,
        textSnippet: snippetText(draft.text),
        evidenceValues: evidenceSummaryResult.summary.values,
      }),
    },
  };
}

function unwrapReadResult<T extends { ok?: boolean }>(
  result: PromiseSettledResult<T>,
): ReadResult<T> {
  if (result.status === "rejected") {
    return {
      ok: false,
      data: null,
      error: errorMessage(result.reason),
    };
  }

  if (result.value?.ok !== true) {
    return {
      ok: false,
      data: result.value,
      error: "api_not_ok",
    };
  }

  return {
    ok: true,
    data: result.value,
    error: null,
  };
}

function describeReadStatus(result: ReadResult<unknown>): "ok" | string {
  return result.ok ? "ok" : result.error ?? "unavailable";
}

function extractFeedPosts(feed: unknown): FeedSample[] {
  if (!feed || typeof feed !== "object") return [];
  const candidate = (feed as { data?: { posts?: unknown } }).data?.posts;
  return Array.isArray(candidate) ? candidate.map(samplePost) : [];
}

function extractSignalList(signals: unknown): unknown[] {
  if (!signals || typeof signals !== "object") return [];
  const candidate = (signals as { data?: unknown }).data;
  return Array.isArray(candidate) ? candidate : [];
}

function extractLeaderboardAgents(leaderboard: unknown): unknown[] {
  if (!leaderboard || typeof leaderboard !== "object") return [];
  const data = (leaderboard as { data?: unknown }).data;
  if (Array.isArray(data)) return data;
  const agents = (data as { agents?: unknown } | undefined)?.agents;
  return Array.isArray(agents) ? agents : [];
}

function extractAvailableBalance(balance: unknown): number {
  if (!balance || typeof balance !== "object") return 0;
  const direct = (balance as { balance?: unknown }).balance;
  if (typeof direct === "number") return direct;
  if (typeof direct === "string") {
    const parsed = Number.parseFloat(direct.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  const nested = (balance as { data?: { balance?: unknown } }).data?.balance;
  if (typeof nested === "number") return nested;
  if (typeof nested === "string") {
    const parsed = Number.parseFloat(nested.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function buildNextTopicHistory(
  previous: Array<{ topic: string; publishedAt: string; opportunityKind: string }>,
  nextEntry: { topic: string; publishedAt: string; opportunityKind: string },
): Array<{ topic: string; publishedAt: string; opportunityKind: string }> {
  const deduped = previous.filter((entry) => entry.topic !== nextEntry.topic);
  return [nextEntry, ...deduped].slice(0, MAX_TOPIC_HISTORY);
}

function buildNextPublishHistory(
  previous: ResearchPublishHistoryEntry[],
  nextEntry: ResearchPublishHistoryEntry,
): ResearchPublishHistoryEntry[] {
  return [nextEntry, ...previous].slice(0, 20);
}

function parseIsoMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function snippetText(text: string, maxLength: number = 220): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

if (isMainModule()) {
  await runMinimalAgentLoop(observe, {
    intervalMs: 15 * 60_000,
    dryRun: true,
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}
