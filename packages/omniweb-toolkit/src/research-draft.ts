import type { QualityGateResult } from "./publish-quality.js";
import { renderColonyPromptPacket, type ColonyPromptPacket } from "./colony-prompt.js";
import { buildResearchColonySubstrate, type ResearchColonySubstrate } from "./research-colony-substrate.js";
import type { ResearchEvidenceSummary } from "./research-evidence.js";
import { buildResearchBrief, type ResearchBrief } from "./research-family-dossiers.js";
import { getPrimaryAttestationSourceName } from "./minimal-attestation-plan.js";
import type { ResearchOpportunity } from "./research-opportunities.js";
import type { ResearchSelfHistorySummary } from "./research-self-history.js";
import {
  DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH,
  DEFAULT_RESEARCH_DRAFT_MIN_TEXT_LENGTH,
  checkResearchDraftQuality,
  inferResearchDraftCategory,
  type ResearchDraftCategory,
} from "./research-draft-quality.js";

interface PromptCapableProvider {
  complete(prompt: string, options?: {
    system?: string;
    maxTokens?: number;
    model?: string;
    modelTier?: "fast" | "standard" | "premium";
  }): Promise<string>;
  readonly name?: string;
}

export interface BuildResearchDraftOptions {
  opportunity: ResearchOpportunity;
  feedCount: number;
  leaderboardCount: number;
  availableBalance: number;
  colonySubstrate?: ResearchColonySubstrate;
  evidenceSummary: ResearchEvidenceSummary;
  supportingEvidenceSummaries?: ResearchEvidenceSummary[];
  selfHistory?: ResearchSelfHistorySummary;
  preferredCategory?: ResearchDraftCategory | null;
  llmProvider?: PromptCapableProvider | null;
  minTextLength?: number;
}

export interface ResearchPromptInput {
  topic: string;
  analysisAngle: string;
  brief: ResearchBrief;
  signal: {
    direction: string | null;
  };
  colonyContext: {
    situation: "fresh-topic" | "conflicting-takes" | "stale-coverage";
    contradictionSignals: string[];
    lastCoveredAt: string | null;
    signalSummary: ResearchColonySubstrate["signalSummary"];
    supportingTakes: ResearchColonySubstrate["supportingTakes"];
    dissentingTake: ResearchColonySubstrate["dissentingTake"];
    recentRelatedPosts: ResearchColonySubstrate["recentRelatedPosts"];
    crossReferences: ResearchColonySubstrate["crossReferences"];
    reactionSummary: ResearchColonySubstrate["reactionSummary"];
    discourseContext: ResearchColonySubstrate["discourseContext"];
    selfHistory: ResearchSelfHistorySummary | null;
  };
  evidence: {
    primarySourceName: string | null;
    primarySourceUrl: string;
    fetchedAt: string;
    values: Record<string, string>;
    derivedMetrics: Record<string, string>;
    supportingSources: Array<{
      source: string;
      url: string;
      fetchedAt: string;
      values: Record<string, string>;
      derivedMetrics: Record<string, string>;
    }>;
  };
}

export type ResearchPromptPacket = ColonyPromptPacket<ResearchPromptInput>;
export type { ResearchDraftCategory } from "./research-draft-quality.js";

export interface ResearchDraftSuccess {
  ok: true;
  category: ResearchDraftCategory;
  text: string;
  confidence: number;
  tags: string[];
  promptPacket: ResearchPromptPacket;
  qualityGate: QualityGateResult;
  draftSource: "llm" | "fallback";
}

export interface ResearchDraftFailure {
  ok: false;
  reason: string;
  promptPacket: ResearchPromptPacket;
  qualityGate: QualityGateResult;
  notes: string[];
}

export type ResearchDraftResult = ResearchDraftSuccess | ResearchDraftFailure;

export interface ValidateResearchCompositionOptions {
  text: string;
  opportunity: ResearchOpportunity;
  evidenceSummary: ResearchEvidenceSummary;
  supportingEvidenceSummaries?: ResearchEvidenceSummary[];
  selfHistory?: ResearchSelfHistorySummary | null;
  preferredCategory?: ResearchDraftCategory | null;
  minTextLength?: number;
}

export interface ResearchCompositionValidationResult {
  pass: boolean;
  category: ResearchDraftCategory;
  confidence: number;
  tags: string[];
  qualityGate: QualityGateResult;
}


export async function buildResearchDraft(
  opts: BuildResearchDraftOptions,
): Promise<ResearchDraftResult> {
  const promptPacket = buildResearchCompositionPacket(opts);
  const minTextLength = opts.minTextLength ?? DEFAULT_RESEARCH_DRAFT_MIN_TEXT_LENGTH;
  const preferredCategory = opts.preferredCategory ?? null;
  let llmText = await generateViaProvider(opts.llmProvider, promptPacket);
  let draftCategory = llmText == null
    ? (preferredCategory ?? "ANALYSIS")
    : inferResearchDraftCategory(llmText, opts.opportunity, preferredCategory) satisfies ResearchDraftCategory;
  if (
    llmText &&
    preferredCategory === "OBSERVATION" &&
    opts.llmProvider &&
    (draftCategory !== "OBSERVATION" || llmText.length > DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH)
  ) {
    const repaired = await rewriteAsObservation(opts.llmProvider, llmText);
    if (repaired) {
      llmText = repaired;
      draftCategory = inferResearchDraftCategory(llmText, opts.opportunity, preferredCategory);
    }
  }
  if (
    llmText &&
    opts.llmProvider &&
    llmText.length > DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH &&
    (
      draftCategory === "ANALYSIS"
      || opts.opportunity.sourceProfile.family === "macro-liquidity"
    )
  ) {
    const compacted = await rewriteCompactAnalysis(
      opts.llmProvider,
      llmText,
      opts.opportunity.sourceProfile.family,
    );
    if (compacted) {
      llmText = compacted;
      draftCategory = inferResearchDraftCategory(llmText, opts.opportunity, preferredCategory);
    }
  }
  const emptyQualityGate = checkResearchDraftQuality(
    "",
    draftCategory,
    minTextLength,
    opts.opportunity,
    opts.evidenceSummary,
    opts.supportingEvidenceSummaries ?? [],
  );

  if (!llmText) {
    return {
      ok: false,
      reason: "llm_provider_unavailable",
      promptPacket,
      qualityGate: emptyQualityGate,
      notes: ["Phase 2 prompt step requires a real LLM provider; deterministic fallback is intentionally disabled."],
    };
  }

  const validation = validateResearchComposition({
    text: llmText,
    opportunity: opts.opportunity,
    evidenceSummary: opts.evidenceSummary,
    supportingEvidenceSummaries: opts.supportingEvidenceSummaries ?? [],
    selfHistory: opts.selfHistory ?? null,
    preferredCategory,
    minTextLength,
  });
  if (validation.pass) {
    return {
      ok: true,
      category: validation.category,
      text: llmText,
      confidence: validation.confidence,
      tags: validation.tags,
      promptPacket,
      qualityGate: validation.qualityGate,
      draftSource: "llm",
    };
  }

  return {
    ok: false,
    reason: "draft_quality_gate_failed",
    promptPacket,
    qualityGate: validation.qualityGate,
    notes: [
      `llm_output_failed: ${validation.qualityGate.reason ?? "unknown"}`,
      `llm_output_preview: ${llmText.slice(0, 220)}`,
    ],
  };
}

/**
 * Validate externally composed research text against the same category inference,
 * confidence, tag, and quality-gate rules used by the internal draft helper.
 */
export function validateResearchComposition(
  opts: ValidateResearchCompositionOptions,
): ResearchCompositionValidationResult {
  const minTextLength = opts.minTextLength ?? DEFAULT_RESEARCH_DRAFT_MIN_TEXT_LENGTH;
  const preferredCategory = opts.preferredCategory ?? null;
  const normalizedText = normalizeDraftText(opts.text);
  const category = inferResearchDraftCategory(
    normalizedText,
    opts.opportunity,
    preferredCategory,
  ) satisfies ResearchDraftCategory;
  const qualityGate = checkResearchDraftQuality(
    normalizedText,
    category,
    minTextLength,
    opts.opportunity,
    opts.evidenceSummary,
    opts.supportingEvidenceSummaries ?? [],
    opts.selfHistory ?? null,
  );

  return {
    pass: qualityGate.pass,
    category,
    confidence: clampConfidence(opts.opportunity.matchedSignal.confidence),
    tags: buildTags(opts.opportunity),
    qualityGate,
  };
}

/**
 * Build the fully structured research composition packet without invoking an LLM.
 *
 * Use this when the outer runtime wants to own thesis formation / wording while still
 * reusing the toolkit's evidence shaping, colony substrate, and prompt doctrine.
 */
export function buildResearchCompositionPacket(opts: BuildResearchDraftOptions): ResearchPromptPacket {
  const preferredCategory = opts.preferredCategory ?? null;
  const colonySubstrate = opts.colonySubstrate ?? buildResearchColonySubstrate({
    opportunity: opts.opportunity,
    allPosts: opts.opportunity.matchingFeedPosts,
  });
  const primarySource = getPrimaryAttestationSourceName(opts.opportunity.attestationPlan);
  const supportingSources = opts.opportunity.attestationPlan.supporting.map((candidate) => candidate.name);
  const supportingEvidenceSummaries = opts.supportingEvidenceSummaries ?? [];
  const analysisAngle = buildResearchAnalysisAngle(opts.opportunity, colonySubstrate);
  const brief = buildResearchBrief(
    opts.opportunity,
    colonySubstrate,
    opts.evidenceSummary,
    supportingEvidenceSummaries,
    opts.selfHistory ?? null,
  );

  return {
    archetype: "research-agent",
    role: [
      "You are a deep research analyst writing a colony-facing post for human readers.",
      preferredCategory === "OBSERVATION"
        ? "This run is targeting OBSERVATION: raw factual reporting with no implied thesis beyond what the cited numbers directly say."
        : "Choose the lightest truthful category: OBSERVATION for raw factual reporting, ANALYSIS for an interpretive thesis another agent could cite.",
    ],
    edge: [
      "Depth over speed does not mean long: synthesize the strongest signal into one sharp take instead of spraying commentary.",
      "Interpret what the evidence means and why it matters now, not why the agent decided to post.",
      "Surface the tension, contradiction, or stale assumption that makes this analysis worth reading.",
    ],
    input: {
      topic: opts.opportunity.topic,
      analysisAngle,
      brief,
      signal: {
        direction: opts.opportunity.matchedSignal.direction,
      },
      colonyContext: {
        situation: mapOpportunitySituation(opts.opportunity.kind),
        contradictionSignals: opts.opportunity.contradictionSignals ?? [],
        lastCoveredAt: opts.opportunity.lastSeenAt == null
          ? null
          : new Date(opts.opportunity.lastSeenAt).toISOString(),
        signalSummary: colonySubstrate.signalSummary,
        supportingTakes: colonySubstrate.supportingTakes,
        dissentingTake: colonySubstrate.dissentingTake,
        recentRelatedPosts: colonySubstrate.recentRelatedPosts,
        crossReferences: colonySubstrate.crossReferences,
        reactionSummary: colonySubstrate.reactionSummary,
        discourseContext: colonySubstrate.discourseContext,
        selfHistory: opts.selfHistory ?? null,
      },
      evidence: {
        primarySourceName: primarySource,
        primarySourceUrl: opts.evidenceSummary.url,
        fetchedAt: opts.evidenceSummary.fetchedAt,
        values: opts.evidenceSummary.values,
        derivedMetrics: opts.evidenceSummary.derivedMetrics,
        supportingSources: supportingEvidenceSummaries.length > 0
          ? supportingEvidenceSummaries.map((summary) => ({
            source: summary.source,
            url: summary.url,
            fetchedAt: summary.fetchedAt,
            values: summary.values,
            derivedMetrics: summary.derivedMetrics,
          }))
          : supportingSources.map((source) => ({
            source,
            url: "",
            fetchedAt: "",
            values: {},
            derivedMetrics: {},
          })),
      },
    },
    instruction: preferredCategory === "OBSERVATION"
      ? "Write one compact standalone OBSERVATION post grounded in the input evidence and colony context. Stay factual, report what the data says now, and do not add a watcher, invalidation clause, or causal thesis unless the evidence strictly requires it. Aim for the 200-260 visible-char band by default because 200+ chars clears a mechanical +10 scoring gate; only exceed that when the claim clearly earns more space."
      : "Write one compact standalone colony post grounded in the input evidence and colony context. If the packet only supports a factual report, write an OBSERVATION. If it supports an interpretive claim with a watcher or invalidation condition, write an ANALYSIS. Aim for the 200-260 visible-char band by default because 200+ chars clears a mechanical +10 scoring gate; only exceed that when the claim clearly earns more space. When you choose ANALYSIS, lead with the thesis, then explain the mechanism, then say what would confirm or invalidate the view. Use the colony substrate to explain what the colony is actually seeing, where agents agree, and where the key disagreement or lag sits. If the discourse context is active, make the post feel like a useful intervention in that live discussion rather than an isolated memo.",
    constraints: [
      "Make the post fully legible to a human reader who never saw the agent's internal reasoning or the prompt packet.",
      "Keep the finished post compact: 2-3 short sentences, at least 200 visible characters to clear the mechanical +10 scoring gate, and usually no more than 260 unless the claim clearly earns more space.",
      "Do not mention internal scoring, confidence numbers, coverage gaps, feed sampling, matching-post counts, or why the agent decided to post.",
      "Do not narrate the attestation pipeline, source ranking, supporting-source bookkeeping, or any source-selection process.",
      "Use the concrete evidence values and derived metrics in the packet; do not write a research post that never cites the fetched data.",
      "Use the colony substrate compactly: synthesize the signal summary, supporting takes, dissenting take, and recent related context into a readable thesis rather than quoting them mechanically.",
      "Use the brief's substrate summary to reflect how much real colony discourse sits underneath the signal without turning the post into a process memo.",
      "If recent related context or dissent is present, use it to say what the colony has already noticed and what still remains unresolved.",
      "When discourseContext.mode is active-thread, place the thesis inside that live conversation instead of writing as if no one else has spoken.",
      "If self-history is present, make the delta from the last same-topic or same-family post explicit instead of repeating the old thesis.",
      "If the brief includes a previous coverage delta, use it to say what is actually new this cycle or why the agent should not just restate the old take.",
      "If linked themes or domain context are present, use them only to situate the thesis and keep the connection evidence-backed and bounded.",
      "Use the analysis angle explicitly when you choose ANALYSIS. If the topic is about divergence or sentiment mismatch, say what is diverging from what instead of defaulting to generic trend commentary.",
      "Use the research brief as doctrine. Treat baseline context as background, anomaly summary as the reason this cycle matters, and false-inference guards as hard constraints.",
      "Only reference an agent by name when discourseContext supplies a directly relevant named participant and the evidence packet confirms, disputes, or meaningfully qualifies that participant's claim.",
      "Do not tag or name-drop agents just to chase reactions.",
      "If discourseContext.mode is solitary, do not force a conversational framing the packet cannot support.",
      "When describing colony sentiment, use natural phrases like 'the bearish read in colony signals', 'the bullish read', or 'mixed positioning' rather than clunky constructions.",
      "End in plain language. Do not use mirrored rhetorical constructions or clever symmetry in the closing sentence.",
      "Treat source names as evidence anchors, not as the subject of the prose.",
      preferredCategory === "OBSERVATION"
        ? "This run prefers OBSERVATION. Stay factual and do not smuggle in unsupported interpretation."
        : "If you choose OBSERVATION, stay factual and do not smuggle in unsupported interpretation. If you choose ANALYSIS, state one clear thesis, ground it in the topic and source context, and end with the concrete condition that would confirm or invalidate the take.",
      "If the packet contains contradiction signals, frame the post as a synthesis of conflicting takes rather than a debug explanation.",
      "Avoid generic metric parroting: connect the evidence to a readable interpretation in one compact claim, not a report.",
      "Output plain prose only, with no headings, bullets, labels, or markdown.",
    ],
    output: {
      category: preferredCategory ?? "OBSERVATION or ANALYSIS",
      confidenceStyle: "calibrated and evidence-led; strong enough to be useful, never absolute",
      shape: [
        "Sentence 1: the core thesis in plain language, naming the concrete tension directly.",
        "Sentence 2: the mechanism or evidence pattern behind the thesis.",
        "Sentence 3: optional, only if needed to state the watcher or invalidation condition without bloating the post.",
      ],
      successCriteria: [
        "Reads like original research, not a process memo.",
        "Contains one compact interpretable thesis another colony reader could reuse quickly.",
        "Leaves the reader with a concrete watcher or invalidation condition.",
        "When the room is already active, reads like a useful intervention in that discourse rather than a detached summary.",
      ],
    },
  };
}

/**
 * Backward-compatible alias for existing call sites that think in prompt-packet terms.
 */
export const buildResearchPromptPacket = buildResearchCompositionPacket;

async function generateViaProvider(
  provider: PromptCapableProvider | null | undefined,
  packet: ResearchPromptPacket,
): Promise<string | null> {
  if (!provider) return null;

  const prompt = renderColonyPromptPacket(packet);

  const completion = await provider.complete(prompt, {
    system: packet.output.category === "OBSERVATION"
      ? "You write compact, evidence-bound colony OBSERVATION posts for human readers. Stay factual, target roughly the 200-260 visible-char band by default because 200+ chars clears a mechanical +10 scoring gate, mention only what the evidence directly supports, and never leak internal scoring, feed coverage, or attestation workflow details."
      : "You write compact, evidence-bound colony research posts for human readers. Synthesize the evidence into one strong thesis, target roughly the 200-260 visible-char band by default because 200+ chars clears a mechanical +10 scoring gate, mention only what matters externally, and never leak internal scoring, feed coverage, or attestation workflow details. When the topic implies divergence, mismatch, or sentiment dislocation, name that mismatch directly rather than drifting into generic price commentary. Avoid hedged non-event phrasing; state the directional implication plainly.",
    maxTokens: 110,
    modelTier: "standard",
  });
  return normalizeDraftText(completion);
}

async function rewriteAsObservation(
  provider: PromptCapableProvider,
  text: string,
): Promise<string | null> {
  const completion = await provider.complete(
    [
      "Rewrite this into one compact OBSERVATION post.",
      "Rules:",
      "- 200-260 chars by default; exceed only when the claim clearly earns more space",
      "- factual only",
      "- keep the concrete numbers",
      "- no thesis, no watcher, no invalidation, no causal language",
      "- no labels or markdown",
      "",
      text,
    ].join("\n"),
    {
      system: "You rewrite colony drafts into factual OBSERVATION posts. Preserve the numbers, strip the interpretation, and keep the result compact.",
      maxTokens: 90,
      modelTier: "standard",
    },
  );
  return normalizeDraftText(completion);
}

async function rewriteCompactAnalysis(
  provider: PromptCapableProvider,
  text: string,
  family: ResearchOpportunity["sourceProfile"]["family"],
): Promise<string | null> {
  const familyRule = family === "macro-liquidity"
    ? "- for macro-liquidity, keep one liquidity print and one Treasury-curve contradiction only"
    : "- keep only the strongest thesis and the two most important evidence numbers";
  const completion = await provider.complete(
    [
      "Rewrite this into one compact ANALYSIS post.",
      "Rules:",
      "- 200-260 chars by default; exceed only when the claim clearly earns more space",
      familyRule,
      "- name the mismatch directly",
      "- do not center the rewrite on soft-dismissal phrasing like 'positioning drift', 'small tilt', or 'not a squeeze setup'",
      "- no watcher unless it is required to keep the thesis truthful",
      "- no labels or markdown",
      "",
      text,
    ].join("\n"),
    {
      system: "You compress colony ANALYSIS drafts into a compact, evidence-led post without losing the core mismatch thesis. Avoid hedged non-event phrasing; state the directional implication plainly.",
      maxTokens: 90,
      modelTier: "standard",
    },
  );
  return normalizeDraftText(completion);
}

function mapOpportunitySituation(kind: ResearchOpportunity["kind"]): "fresh-topic" | "conflicting-takes" | "stale-coverage" {
  switch (kind) {
    case "contradiction":
      return "conflicting-takes";
    case "stale_topic":
      return "stale-coverage";
    default:
      return "fresh-topic";
  }
}

function buildTags(opportunity: ResearchOpportunity): string[] {
  return ["research", opportunity.kind.replace("_", "-")];
}

function clampConfidence(value: number | null): number {
  const input = typeof value === "number" ? value : 70;
  return Math.max(55, Math.min(85, Math.round(input)));
}

function normalizeDraftText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^(?:Claim|ANALYSIS|OBSERVATION)\s*[:.-]?\s*/i, "")
    .trim();
}


function buildResearchAnalysisAngle(
  opportunity: ResearchOpportunity,
  colonySubstrate: ResearchColonySubstrate,
): string {
  const topic = opportunity.topic.toLowerCase();
  const sentimentRead = describeSignalRead(opportunity);
  const discourseLead = colonySubstrate.discourseContext.namedParticipants[0]?.author ?? null;
  const discourseReference = discourseLead == null ? null : formatDiscourseReference(discourseLead);

  if (colonySubstrate.discourseContext.mode === "active-thread" && discourseReference) {
    if (topic.includes("divergence") || topic.includes("sentiment")) {
      return `Explain whether ${sentimentRead} confirms, qualifies, or overturns ${discourseReference}'s live read, and name the mismatch directly.`;
    }

    if (topic.includes("funding") || topic.includes("premium") || topic.includes("basis")) {
      return `Explain whether the latest funding, premium, and price evidence confirms, qualifies, or overturns ${discourseReference}'s live positioning read.`;
    }

    if (topic.includes("etf") || topic.includes("flow")) {
      return `Explain whether the latest ETF flow and holdings evidence confirms, qualifies, or overturns ${discourseReference}'s live demand read.`;
    }

    if (topic.includes("stablecoin") || topic.includes("usdt") || topic.includes("usdc") || topic.includes("peg")) {
      return `Explain whether the latest stablecoin supply and peg evidence confirms, qualifies, or overturns ${discourseReference}'s live liquidity read.`;
    }

    if (topic.includes("on-chain") || topic.includes("network") || topic.includes("mempool") || topic.includes("hashrate") || topic.includes("addresses")) {
      return `Explain whether the latest on-chain evidence confirms, qualifies, or overturns ${discourseReference}'s live usage or stress read.`;
    }

    if (topic.includes("vix") || topic.includes("credit") || topic.includes("recession")) {
      return `Explain whether the latest volatility and short-rate evidence confirms, qualifies, or overturns ${discourseReference}'s live macro-stress read.`;
    }
  }

  if (topic.includes("divergence") || topic.includes("sentiment")) {
    return `Explain whether ${sentimentRead} is being confirmed or contradicted by the observed price, range, and volume evidence. Name the mismatch directly.`;
  }

  if (topic.includes("funding") || topic.includes("premium") || topic.includes("basis")) {
    return "Explain what the relationship between funding, premium, and price says about positioning, and what would invalidate that read.";
  }

  if (topic.includes("etf") || topic.includes("flow")) {
    return "Explain what the latest ETF flow and holdings data implies about institutional demand, and what would mark that demand as weakening.";
  }

  if (topic.includes("stablecoin") || topic.includes("usdt") || topic.includes("usdc") || topic.includes("peg")) {
    return "Explain what the latest stablecoin supply and peg evidence says about liquidity or reserve stress, and what would weaken that interpretation.";
  }

  if (topic.includes("on-chain") || topic.includes("network") || topic.includes("mempool") || topic.includes("hashrate") || topic.includes("addresses")) {
    return "Explain whether the latest on-chain activity reflects real usage, congestion, stress, or speculative churn, and what would invalidate that read.";
  }

  if (topic.includes("vix") || topic.includes("credit") || topic.includes("recession")) {
    return "Explain whether volatility and the short-rate backdrop point to real stress, exaggerated fear, or a gap between macro fear pricing and the rates backdrop.";
  }

  if (opportunity.kind === "contradiction") {
    if (discourseReference) {
      return `Use the evidence to resolve the active disagreement around ${discourseReference}'s claim and state what would settle the dispute next.`;
    }
    return "Synthesize the conflicting takes into one clear thesis and state which evidence would settle the disagreement.";
  }

  return "Turn the evidence into one clear thesis, explain the mechanism, and state the concrete invalidation condition.";
}

function formatDiscourseReference(author: string): string {
  return author.startsWith("@") ? author : `@${author}`;
}

function describeSignalRead(opportunity: ResearchOpportunity): string {
  const topic = opportunity.topic.toLowerCase();
  const direction = opportunity.matchedSignal.direction?.toLowerCase() ?? "mixed";

  if (topic.includes("bear")) return "the bearish read in colony signals";
  if (topic.includes("bull")) return "the bullish read in colony signals";
  if (direction === "bearish") return "the bearish read in colony signals";
  if (direction === "bullish") return "the bullish read in colony signals";
  if (direction === "mixed") return "mixed positioning in colony signals";
  return "the current read in colony signals";
}
