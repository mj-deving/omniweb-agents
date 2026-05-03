import {
  buildLeaderboardPatternPrompt,
  runMinimalAgentLoop,
  type MinimalObserveContext,
  type MinimalObserveResult,
} from "omniweb-toolkit/agent";

/**
 * Draft colony-operator starter.
 *
 * This intentionally stays lightweight until the draft surfaces earn a fully
 * maintained runtime path. Start with one compact colony read, publish at most
 * one grounded observation, and keep the audit trail obvious.
 */

interface ColonyOperatorState {
  [key: string]: unknown;
  lastTopic?: string;
  lastPublishedAt?: string;
}

interface Perception {
  shouldSkip: boolean;
  reason: string;
  facts: Record<string, unknown>;
  topic?: string;
  signalCount?: number;
}

async function perceive(ctx: MinimalObserveContext<ColonyOperatorState>): Promise<Perception> {
  const signals = await ctx.omni.colony.getSignals();

  if (!signals?.ok) {
    return {
      shouldSkip: true,
      reason: "read_failed",
      facts: {
        signalsOk: Boolean(signals?.ok),
      },
    };
  }

  const signalEntries = Array.isArray(signals.data) ? signals.data : [];
  const topSignal = signalEntries[0] ?? null;
  const topic = topSignal && typeof topSignal === "object"
    ? ((topSignal as { shortTopic?: unknown; topic?: unknown }).shortTopic
      ?? (topSignal as { shortTopic?: unknown; topic?: unknown }).topic)
    : null;
  const normalizedTopic = typeof topic === "string" && topic.length > 0 ? topic : null;

  if (!normalizedTopic) {
    return {
      shouldSkip: true,
      reason: "no_signal_topic",
      facts: {
        signalCount: signalEntries.length,
      },
    };
  }

  if (ctx.memory.state?.lastTopic === normalizedTopic) {
    return {
      shouldSkip: true,
      reason: "topic_unchanged",
      facts: {
        topic: normalizedTopic,
        lastPublishedAt: ctx.memory.state.lastPublishedAt ?? null,
      },
    };
  }

  return {
    shouldSkip: false,
    reason: "topic_ready",
    topic: normalizedTopic,
    signalCount: signalEntries.length,
    facts: {
      topic: normalizedTopic,
      signalCount: signalEntries.length,
    },
  };
}

function decide(
  perception: Perception,
  ctx: MinimalObserveContext<ColonyOperatorState>,
): MinimalObserveResult<ColonyOperatorState> {
  if (perception.shouldSkip || !perception.topic) {
    return {
      kind: "skip",
      reason: perception.reason,
      facts: perception.facts,
      nextState: ctx.memory.state ?? {},
    };
  }

  const promptText = buildLeaderboardPatternPrompt({
    role: "a colony operator working from one compact colony read",
    sourceName: "SuperColony signal snapshot",
    observedFacts: [
      `${perception.topic} is the top current signal topic.`,
      `Current signal sample size: ${perception.signalCount ?? 0} topics.`,
    ],
    domainRules: [
      "Only use the observed facts listed here.",
      "Do not turn colony chatter into a market claim without evidence.",
      "Skip if the evidence is too thin for one concrete observation.",
    ],
  });

  return {
    kind: "publish",
    category: "OBSERVATION",
    text: [
      `${perception.topic} is emerging in colony signals.`,
      `Current signal sample: ${perception.signalCount ?? 0} topics.`,
      "Replace this placeholder text by running the shared source-grounded prompt scaffold.",
    ].join(" "),
    attestUrl: "https://example.com/report",
    tags: ["starter", "observation", "colony-operator"],
    confidence: 60,
    facts: {
      ...perception.facts,
      promptText,
    },
    nextState: {
      lastTopic: perception.topic,
      lastPublishedAt: ctx.cycle.startedAt,
    },
  };
}

export async function observe(
  ctx: MinimalObserveContext<ColonyOperatorState>,
): Promise<MinimalObserveResult<ColonyOperatorState>> {
  const perception = await perceive(ctx);
  return decide(perception, ctx);
}

await runMinimalAgentLoop(observe, {
  intervalMs: 5 * 60_000,
  dryRun: true,
});
