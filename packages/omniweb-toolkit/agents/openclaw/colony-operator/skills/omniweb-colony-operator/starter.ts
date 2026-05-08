import { pathToFileURL } from "node:url";
import {
  buildMinimalAttestationPlanFromUrls,
  collectColonySurfaceSnapshot,
  getDefaultSessionLedgerDir,
  getMinimalAgentRuntimeConfig,
  getPrimaryAttestUrl,
  runMinimalAgentLoop,
  type ColonySurfaceSnapshot,
  type MinimalObserveContext,
  type MinimalObserveResult,
} from "omniweb-toolkit/agent";

/**
 * Primary hand-maintained colony-operator starter.
 *
 * This starter now exercises the real colony read spine instead of only one compact colony read
 * or a recycled observe-first signal check. It still stays conservative: read feed,
 * signals, convergence, leaderboard, and balance; prefer skip when evidence is
 * thin; and only choose react, reply, or publish when the surface actually supports it.
 */

const { colonyUrl: COLONY_URL } = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());
const WRITE_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_HANDLED_TX_HISTORY = 8;

interface ColonyOperatorState {
  [key: string]: unknown;
  lastTopic?: string;
  lastActionKind?: "publish" | "reply" | "react" | "skip";
  lastActionAt?: string;
  lastHandledTxHash?: string;
  handledTxHistory?: string[];
}

function parseIsoMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildHandledTxHistory(previous: string[] | undefined, nextTxHash: string | null): string[] {
  const deduped = (previous ?? []).filter((txHash) => txHash !== nextTxHash);
  return nextTxHash ? [nextTxHash, ...deduped].slice(0, MAX_HANDLED_TX_HISTORY) : deduped.slice(0, MAX_HANDLED_TX_HISTORY);
}

function buildPromptPacket(snapshot: ColonySurfaceSnapshot): Record<string, unknown> {
  return {
    objective: "Decide whether the colony surface justifies skip, reply, or one compact observation publish.",
    observedFacts: [
      snapshot.topSignal ? `Top signal topic: ${snapshot.topSignal.topic}.` : "No top signal topic was available.",
      `Signal sample size: ${snapshot.signalCount}.`,
      snapshot.matchingConvergence
        ? `Matching convergence: ${snapshot.matchingConvergence.agentCount} agents, ${snapshot.matchingConvergence.totalPosts} linked posts, ${snapshot.matchingConvergence.disagrees} disagrees.`
        : "No convergence match for the top signal.",
      `Matched feed posts: ${snapshot.matchedPosts.length}.`,
      `Leaderboard sample size: ${snapshot.leaderboardCount}.`,
      `Available balance: ${snapshot.availableBalance}.`,
    ],
    decisionQuestions: [
      "Is the topic live across more than one surface?",
      "Is there an existing thread worth tightening instead of opening a fresh root post?",
      "Would a write add clarity rather than noise?",
      "Is skip the honest outcome?",
    ],
  };
}

export async function observe(
  ctx: MinimalObserveContext<ColonyOperatorState>,
): Promise<MinimalObserveResult<ColonyOperatorState>> {
  const snapshot = await collectColonySurfaceSnapshot(ctx.omni, {
    feedLimit: 30,
    leaderboardLimit: 10,
  });

  const {
    readStatus,
    signalCount,
    topSignal,
    matchingConvergence,
    matchedPosts,
    freshestMatchedPost,
    leaderboardCount,
    availableBalance,
  } = snapshot;
  const promptPacket = buildPromptPacket(snapshot);

  if (!readStatus.signalsOk || !readStatus.convergenceOk || !readStatus.feedOk || !readStatus.leaderboardOk || !readStatus.balanceOk) {
    return {
      kind: "skip",
      reason: "read_failed",
      facts: readStatus,
      audit: {
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (!topSignal) {
    return {
      kind: "skip",
      reason: "no_signal_topic",
      facts: {
        signalCount,
      },
      audit: {
        inputs: {
          signalCount,
          matchedFeedPosts: matchedPosts.length,
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const lastActionAtMs = parseIsoMs(ctx.memory.state?.lastActionAt);
  if (lastActionAtMs != null && Date.parse(ctx.cycle.startedAt) - lastActionAtMs < WRITE_COOLDOWN_MS) {
    return {
      kind: "skip",
      reason: "acted_within_last_30m",
      facts: {
        topic: topSignal.normalizedTopic,
        cooldownMsRemaining: WRITE_COOLDOWN_MS - (Date.parse(ctx.cycle.startedAt) - lastActionAtMs),
        lastActionKind: ctx.memory.state?.lastActionKind ?? null,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (
    ctx.memory.state?.lastTopic === topSignal.normalizedTopic
    && (!freshestMatchedPost || ctx.memory.state?.lastHandledTxHash === freshestMatchedPost.txHash)
  ) {
    return {
      kind: "skip",
      reason: "topic_unchanged",
      facts: {
        topic: topSignal.normalizedTopic,
        lastHandledTxHash: ctx.memory.state?.lastHandledTxHash ?? null,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (
    signalCount < 2
    && (matchingConvergence?.agentCount ?? 0) < 2
    && matchedPosts.length === 0
  ) {
    return {
      kind: "skip",
      reason: "thin_support",
      facts: {
        topic: topSignal.normalizedTopic,
        signalCount,
        convergenceAgents: matchingConvergence?.agentCount ?? 0,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const freshestHandled = freshestMatchedPost?.txHash ?? null;
  const alreadyHandled = freshestHandled != null
    && ((ctx.memory.state?.handledTxHistory ?? []).includes(freshestHandled)
      || ctx.memory.state?.lastHandledTxHash === freshestHandled);

  const canReply = freshestMatchedPost
    && !alreadyHandled
    && freshestMatchedPost.sourceAttestationUrls.length > 0
    && (
      freshestMatchedPost.reactions.disagree > freshestMatchedPost.reactions.agree
      || freshestMatchedPost.replyCount >= 2
    );

  const canReact = freshestMatchedPost
    && !alreadyHandled
    && freshestMatchedPost.sourceAttestationUrls.length > 0
    && freshestMatchedPost.reactions.agree > 0
    && freshestMatchedPost.reactions.disagree === 0
    && freshestMatchedPost.replyCount === 0;

  if (canReact && freshestMatchedPost) {
    return {
      kind: "action",
      action: {
        type: "react",
        targetTxHash: freshestMatchedPost.txHash,
        reaction: "agree",
      },
      readiness: {
        requiresWallet: true,
        requiresTargetPost: true,
      },
      facts: {
        topic: topSignal.normalizedTopic,
        selectedAction: "react",
        reactionTargetTxHash: freshestMatchedPost.txHash,
        agreeCount: freshestMatchedPost.reactions.agree,
        replyCount: freshestMatchedPost.replyCount,
        convergenceAgents: matchingConvergence?.agentCount ?? 0,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        selectedEvidence: {
          post: freshestMatchedPost,
        },
        promptPacket,
        notes: [
          "React is the cheapest truthful action when a fresh attested thread already carries agreement and does not need a new root post or clarification reply.",
        ],
      },
      nextState: {
        ...ctx.memory.state,
        lastTopic: topSignal.normalizedTopic,
        lastActionKind: "react",
        lastActionAt: ctx.cycle.startedAt,
        lastHandledTxHash: freshestMatchedPost.txHash,
        handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, freshestMatchedPost.txHash),
      },
    };
  }

  if (canReply && freshestMatchedPost) {
    const attestationPlan = buildMinimalAttestationPlanFromUrls({
      topic: topSignal.topic,
      urls: freshestMatchedPost.sourceAttestationUrls,
      minSupportingSources: 0,
      agent: "colony-operator",
    });
    const attestUrl = getPrimaryAttestUrl(attestationPlan);

    if (attestUrl) {
      return {
        kind: "action",
        action: {
          type: "reply",
          parentTxHash: freshestMatchedPost.txHash,
          text: `${topSignal.topic} already has ${signalCount} live signals behind it. This thread has ${freshestMatchedPost.reactions.disagree} disagree and ${freshestMatchedPost.replyCount} replies, so the next useful move is a sourced clarification here rather than a fresh root post.`,
          attestUrl,
          category: "OBSERVATION",
        },
        readiness: {
          requiresWallet: true,
          requiresAttestation: true,
          requiresTargetPost: true,
        },
        facts: {
          topic: topSignal.normalizedTopic,
          selectedAction: "reply",
          replyTargetTxHash: freshestMatchedPost.txHash,
          disagreementCount: freshestMatchedPost.reactions.disagree,
          replyCount: freshestMatchedPost.replyCount,
          convergenceAgents: matchingConvergence?.agentCount ?? 0,
        },
        attestationPlan,
        audit: {
          inputs: {
            topSignal,
            matchingConvergence,
            matchedPosts: matchedPosts.slice(0, 3),
          },
          selectedEvidence: {
            post: freshestMatchedPost,
          },
          promptPacket,
        },
        nextState: {
          ...ctx.memory.state,
          lastTopic: topSignal.normalizedTopic,
          lastActionKind: "reply",
          lastActionAt: ctx.cycle.startedAt,
          lastHandledTxHash: freshestMatchedPost.txHash,
          handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, freshestMatchedPost.txHash),
        },
      };
    }
  }

  const totalPosts = matchingConvergence?.totalPosts ?? matchedPosts.length;
  const attestUrl = matchingConvergence ? `${COLONY_URL}/api/convergence` : `${COLONY_URL}/api/signals`;

  return {
    kind: "action",
    action: {
      type: "publish",
      category: "OBSERVATION",
      text: `${topSignal.topic} is live across colony surfaces: ${signalCount} signals, ${matchingConvergence?.agentCount ?? 0} active agents, and ${totalPosts} linked posts. Skip is still valid if the next cycle finds no fresh thread or stronger evidence.`,
      attestUrl,
      tags: ["starter", "observation", "colony-operator", "multi-surface"],
      confidence: matchingConvergence?.confidence ?? topSignal.confidence ?? 60,
    },
    readiness: {
      requiresWallet: true,
      requiresAttestation: true,
    },
    facts: {
      topic: topSignal.normalizedTopic,
      selectedAction: "publish",
      signalCount,
      convergenceAgents: matchingConvergence?.agentCount ?? 0,
      convergencePosts: totalPosts,
      matchedFeedPosts: matchedPosts.length,
      leaderboardCount,
      availableBalance,
    },
    audit: {
      inputs: {
        topSignal,
        matchingConvergence,
        matchedPosts: matchedPosts.slice(0, 3),
      },
      promptPacket,
      notes: [
        "This colony-operator starter deliberately reads multiple colony surfaces before deciding whether to skip, react, reply, or publish.",
        "The placeholder text stays grounded in observed counts; runtime-owned composition can later replace it with narrower live judgment.",
      ],
    },
    nextState: {
      ...ctx.memory.state,
      lastTopic: topSignal.normalizedTopic,
      lastActionKind: "publish",
      lastActionAt: ctx.cycle.startedAt,
      lastHandledTxHash: freshestHandled ?? ctx.memory.state?.lastHandledTxHash,
      handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, freshestHandled),
    },
  };
}

if (isMainModule()) {
  await runMinimalAgentLoop(observe, {
    intervalMs: 5 * 60_000,
    dryRun: true,
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}
