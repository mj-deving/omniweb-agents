import {
  buildMinimalAttestationPlanFromUrls,
  collectColonySurfaceSnapshot,
  getDefaultSessionLedgerDir,
  getMinimalAgentRuntimeConfig,
  getPrimaryAttestUrl,
  type ColonySurfaceSnapshot,
  type MinimalObserveContext,
  type PolicyDefinition,
} from "omniweb-toolkit/agent";

const { colonyUrl: COLONY_URL } = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());
const WRITE_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_HANDLED_TX_HISTORY = 8;

export interface ColonyOperatorState {
  [key: string]: unknown;
  lastTopic?: string;
  lastActionKind?: "publish" | "reply" | "react" | "skip";
  lastActionAt?: string;
  lastHandledTxHash?: string;
  handledTxHistory?: string[];
}

interface ColonyOperatorObserved {
  snapshot: ColonySurfaceSnapshot;
  promptPacket: Record<string, unknown>;
}

interface ColonyOperatorDerived {
  readStatus: ColonySurfaceSnapshot["readStatus"];
  signalCount: number;
  topSignal: ColonySurfaceSnapshot["topSignal"];
  matchingConvergence: ColonySurfaceSnapshot["matchingConvergence"];
  matchedPosts: ColonySurfaceSnapshot["matchedPosts"];
  freshestMatchedPost: ColonySurfaceSnapshot["freshestMatchedPost"];
  leaderboardCount: number;
  availableBalance: number;
  promptPacket: Record<string, unknown>;
  cycleStartedAtMs: number;
  lastActionAtMs: number | null;
  cooldownMsRemaining: number | null;
  freshestHandled: string | null;
  alreadyHandled: boolean;
  canReply: boolean;
  canReact: boolean;
  totalPosts: number;
  publishAttestUrl: string | null;
}

type ColonyOperatorCondition =
  | "read_failed"
  | "no_signal_topic"
  | "acted_within_last_30m"
  | "topic_unchanged"
  | "thin_support"
  | "react_existing_thread"
  | "reply_existing_thread";

type ColonyOperatorRoute =
  | "skip_read_failed"
  | "skip_no_signal_topic"
  | "skip_recent_write"
  | "skip_topic_unchanged"
  | "skip_thin_support"
  | "react_existing_thread"
  | "reply_existing_thread"
  | "publish_multi_surface_observation";

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

function buildBaseInputs(derived: ColonyOperatorDerived) {
  return {
    topSignal: derived.topSignal,
    matchingConvergence: derived.matchingConvergence,
    matchedPosts: derived.matchedPosts.slice(0, 3),
  };
}

function buildUnchangedState(ctx: MinimalObserveContext<ColonyOperatorState>): ColonyOperatorState {
  return ctx.memory.state ?? {};
}

export const colonyOperatorPolicy: PolicyDefinition<
  ColonyOperatorState,
  ColonyOperatorObserved,
  ColonyOperatorDerived,
  ColonyOperatorCondition,
  ColonyOperatorRoute
> = {
  policyId: "colony-operator.surface-policy.v1",
  observe: async (ctx) => {
    const snapshot = await collectColonySurfaceSnapshot(ctx.omni, {
      feedLimit: 30,
      leaderboardLimit: 10,
    });

    return {
      snapshot,
      promptPacket: buildPromptPacket(snapshot),
    };
  },
  derive: ({ observed, ctx }) => {
    const {
      readStatus,
      signalCount,
      topSignal,
      matchingConvergence,
      matchedPosts,
      freshestMatchedPost,
      leaderboardCount,
      availableBalance,
    } = observed.snapshot;
    const cycleStartedAtMs = Date.parse(ctx.cycle.startedAt);
    const lastActionAtMs = parseIsoMs(ctx.memory.state?.lastActionAt);
    const freshestHandled = freshestMatchedPost?.txHash ?? null;
    const alreadyHandled = freshestHandled != null
      && ((ctx.memory.state?.handledTxHistory ?? []).includes(freshestHandled)
        || ctx.memory.state?.lastHandledTxHash === freshestHandled);
    const canReply = Boolean(
      freshestMatchedPost
      && !alreadyHandled
      && freshestMatchedPost.sourceAttestationUrls.length > 0
      && (
        freshestMatchedPost.reactions.disagree > freshestMatchedPost.reactions.agree
        || freshestMatchedPost.replyCount >= 2
      ),
    );
    const canReact = Boolean(
      freshestMatchedPost
      && !alreadyHandled
      && freshestMatchedPost.sourceAttestationUrls.length > 0
      && freshestMatchedPost.reactions.agree > 0
      && freshestMatchedPost.reactions.disagree === 0
      && freshestMatchedPost.replyCount === 0,
    );

    return {
      readStatus,
      signalCount,
      topSignal,
      matchingConvergence,
      matchedPosts,
      freshestMatchedPost,
      leaderboardCount,
      availableBalance,
      promptPacket: observed.promptPacket,
      cycleStartedAtMs,
      lastActionAtMs,
      cooldownMsRemaining: lastActionAtMs == null ? null : WRITE_COOLDOWN_MS - (cycleStartedAtMs - lastActionAtMs),
      freshestHandled,
      alreadyHandled,
      canReply,
      canReact,
      totalPosts: matchingConvergence?.totalPosts ?? matchedPosts.length,
      publishAttestUrl: matchingConvergence ? `${COLONY_URL}/api/convergence` : `${COLONY_URL}/api/signals`,
    };
  },
  conditions: {
    read_failed: ({ derived }) => (
      !derived.readStatus.signalsOk
      || !derived.readStatus.convergenceOk
      || !derived.readStatus.feedOk
      || !derived.readStatus.leaderboardOk
      || !derived.readStatus.balanceOk
    ),
    no_signal_topic: ({ derived }) => !derived.topSignal,
    acted_within_last_30m: ({ derived }) => (
      derived.lastActionAtMs != null
      && derived.cycleStartedAtMs - derived.lastActionAtMs < WRITE_COOLDOWN_MS
    ),
    topic_unchanged: ({ derived, ctx }) => (
      Boolean(
        derived.topSignal
        && ctx.memory.state?.lastTopic === derived.topSignal.normalizedTopic
        && (!derived.freshestMatchedPost || ctx.memory.state?.lastHandledTxHash === derived.freshestMatchedPost.txHash),
      )
    ),
    thin_support: ({ derived }) => (
      Boolean(
        derived.topSignal
        && derived.signalCount < 2
        && (derived.matchingConvergence?.agentCount ?? 0) < 2
        && derived.matchedPosts.length === 0,
      )
    ),
    react_existing_thread: ({ derived }) => derived.canReact,
    reply_existing_thread: ({ derived }) => derived.canReply,
  },
  routes: [
    {
      id: "skip_read_failed",
      when: ({ conditionResults }) => conditionResults.read_failed,
      buildDecision: ({ ctx, derived }) => ({
        kind: "skip",
        reason: "read_failed",
        facts: derived.readStatus,
        audit: {
          promptPacket: derived.promptPacket,
        },
        nextState: buildUnchangedState(ctx),
      }),
    },
    {
      id: "skip_no_signal_topic",
      when: ({ conditionResults }) => conditionResults.no_signal_topic,
      buildDecision: ({ ctx, derived }) => ({
        kind: "skip",
        reason: "no_signal_topic",
        facts: {
          signalCount: derived.signalCount,
        },
        audit: {
          inputs: {
            signalCount: derived.signalCount,
            matchedFeedPosts: derived.matchedPosts.length,
          },
          promptPacket: derived.promptPacket,
        },
        nextState: buildUnchangedState(ctx),
      }),
    },
    {
      id: "skip_recent_write",
      when: ({ conditionResults }) => conditionResults.acted_within_last_30m,
      buildDecision: ({ ctx, derived }) => ({
        kind: "skip",
        reason: "acted_within_last_30m",
        facts: {
          topic: derived.topSignal?.normalizedTopic ?? null,
          cooldownMsRemaining: derived.cooldownMsRemaining,
          lastActionKind: ctx.memory.state?.lastActionKind ?? null,
        },
        audit: {
          inputs: buildBaseInputs(derived),
          promptPacket: derived.promptPacket,
        },
        nextState: buildUnchangedState(ctx),
      }),
    },
    {
      id: "skip_topic_unchanged",
      when: ({ conditionResults }) => conditionResults.topic_unchanged,
      buildDecision: ({ ctx, derived }) => ({
        kind: "skip",
        reason: "topic_unchanged",
        facts: {
          topic: derived.topSignal?.normalizedTopic ?? null,
          lastHandledTxHash: ctx.memory.state?.lastHandledTxHash ?? null,
        },
        audit: {
          inputs: buildBaseInputs(derived),
          promptPacket: derived.promptPacket,
        },
        nextState: buildUnchangedState(ctx),
      }),
    },
    {
      id: "skip_thin_support",
      when: ({ conditionResults }) => conditionResults.thin_support,
      buildDecision: ({ ctx, derived }) => ({
        kind: "skip",
        reason: "thin_support",
        facts: {
          topic: derived.topSignal?.normalizedTopic ?? null,
          signalCount: derived.signalCount,
          convergenceAgents: derived.matchingConvergence?.agentCount ?? 0,
        },
        audit: {
          inputs: buildBaseInputs(derived),
          promptPacket: derived.promptPacket,
        },
        nextState: buildUnchangedState(ctx),
      }),
    },
    {
      id: "react_existing_thread",
      when: ({ conditionResults }) => conditionResults.react_existing_thread,
      buildDecision: ({ ctx, derived }) => ({
        kind: "action",
        action: {
          type: "react",
          targetTxHash: derived.freshestMatchedPost?.txHash,
          reaction: "agree",
        },
        readiness: {
          requiresWallet: true,
          requiresTargetPost: true,
        },
        facts: {
          topic: derived.topSignal?.normalizedTopic ?? null,
          selectedAction: "react",
          reactionTargetTxHash: derived.freshestMatchedPost?.txHash ?? null,
          agreeCount: derived.freshestMatchedPost?.reactions.agree ?? 0,
          replyCount: derived.freshestMatchedPost?.replyCount ?? 0,
          convergenceAgents: derived.matchingConvergence?.agentCount ?? 0,
        },
        audit: {
          inputs: buildBaseInputs(derived),
          selectedEvidence: {
            post: derived.freshestMatchedPost,
          },
          promptPacket: derived.promptPacket,
          notes: [
            "React is the cheapest truthful action when a fresh attested thread already carries agreement and does not need a new root post or clarification reply.",
          ],
        },
        nextState: {
          ...ctx.memory.state,
          lastTopic: derived.topSignal?.normalizedTopic,
          lastActionKind: "react",
          lastActionAt: ctx.cycle.startedAt,
          lastHandledTxHash: derived.freshestMatchedPost?.txHash,
          handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, derived.freshestMatchedPost?.txHash ?? null),
        },
      }),
    },
    {
      id: "reply_existing_thread",
      when: ({ conditionResults }) => conditionResults.reply_existing_thread,
      buildDecision: ({ ctx, derived }) => {
        const attestationPlan = buildMinimalAttestationPlanFromUrls({
          topic: derived.topSignal?.topic ?? "colony-topic",
          urls: derived.freshestMatchedPost?.sourceAttestationUrls ?? [],
          minSupportingSources: 0,
          agent: "colony-operator",
        });
        const attestUrl = getPrimaryAttestUrl(attestationPlan);

        if (!attestUrl || !derived.freshestMatchedPost) {
          return {
            kind: "skip",
            reason: "reply_missing_attestation",
            facts: {
              topic: derived.topSignal?.normalizedTopic ?? null,
              replyTargetTxHash: derived.freshestMatchedPost?.txHash ?? null,
            },
            audit: {
              inputs: buildBaseInputs(derived),
              selectedEvidence: {
                post: derived.freshestMatchedPost,
              },
              promptPacket: derived.promptPacket,
            },
            nextState: buildUnchangedState(ctx),
          };
        }

        return {
          kind: "action",
          action: {
            type: "reply",
            parentTxHash: derived.freshestMatchedPost.txHash,
            text: `${derived.topSignal?.topic ?? "This topic"} already has ${derived.signalCount} live signals behind it. This thread has ${derived.freshestMatchedPost.reactions.disagree} disagree and ${derived.freshestMatchedPost.replyCount} replies, so the next useful move is a sourced clarification here rather than a fresh root post.`,
            attestUrl,
            category: "OBSERVATION",
          },
          readiness: {
            requiresWallet: true,
            requiresAttestation: true,
            requiresTargetPost: true,
          },
          facts: {
            topic: derived.topSignal?.normalizedTopic ?? null,
            selectedAction: "reply",
            replyTargetTxHash: derived.freshestMatchedPost.txHash,
            disagreementCount: derived.freshestMatchedPost.reactions.disagree,
            replyCount: derived.freshestMatchedPost.replyCount,
            convergenceAgents: derived.matchingConvergence?.agentCount ?? 0,
          },
          attestationPlan,
          audit: {
            inputs: buildBaseInputs(derived),
            selectedEvidence: {
              post: derived.freshestMatchedPost,
            },
            promptPacket: derived.promptPacket,
          },
          nextState: {
            ...ctx.memory.state,
            lastTopic: derived.topSignal?.normalizedTopic,
            lastActionKind: "reply",
            lastActionAt: ctx.cycle.startedAt,
            lastHandledTxHash: derived.freshestMatchedPost.txHash,
            handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, derived.freshestMatchedPost.txHash),
          },
        };
      },
    },
  ],
  fallbackRoute: {
    id: "publish_multi_surface_observation",
    when: () => true,
    buildDecision: ({ ctx, derived }) => ({
      kind: "action",
      action: {
        type: "publish",
        category: "OBSERVATION",
        text: `${derived.topSignal?.topic ?? "This topic"} is live across colony surfaces: ${derived.signalCount} signals, ${derived.matchingConvergence?.agentCount ?? 0} active agents, and ${derived.totalPosts} linked posts. Skip is still valid if the next cycle finds no fresh thread or stronger evidence.`,
        attestUrl: derived.publishAttestUrl ?? `${COLONY_URL}/api/signals`,
        tags: ["starter", "observation", "colony-operator", "multi-surface"],
        confidence: derived.matchingConvergence?.confidence ?? derived.topSignal?.confidence ?? 60,
      },
      readiness: {
        requiresWallet: true,
        requiresAttestation: true,
      },
      facts: {
        topic: derived.topSignal?.normalizedTopic ?? null,
        selectedAction: "publish",
        signalCount: derived.signalCount,
        convergenceAgents: derived.matchingConvergence?.agentCount ?? 0,
        convergencePosts: derived.totalPosts,
        matchedFeedPosts: derived.matchedPosts.length,
        leaderboardCount: derived.leaderboardCount,
        availableBalance: derived.availableBalance,
      },
      audit: {
        inputs: buildBaseInputs(derived),
        promptPacket: derived.promptPacket,
        notes: [
          "This colony-operator starter deliberately reads multiple colony surfaces before deciding whether to skip, react, reply, or publish.",
          "The placeholder text stays grounded in observed counts; runtime-owned composition can later replace it with narrower live judgment.",
        ],
      },
      nextState: {
        ...ctx.memory.state,
        lastTopic: derived.topSignal?.normalizedTopic,
        lastActionKind: "publish",
        lastActionAt: ctx.cycle.startedAt,
        lastHandledTxHash: derived.freshestHandled ?? ctx.memory.state?.lastHandledTxHash,
        handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, derived.freshestHandled),
      },
    }),
  },
};
