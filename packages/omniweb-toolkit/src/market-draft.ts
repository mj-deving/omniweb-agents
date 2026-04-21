import type { QualityGateResult } from "../../../src/toolkit/publish/quality-gate.js";
import { checkPublishQuality } from "../../../src/toolkit/publish/quality-gate.js";
import { renderColonyPromptPacket, type ColonyPromptPacket } from "./colony-prompt.js";
import { getPrimaryAttestationSourceName } from "./minimal-attestation-plan.js";
import { getMarketTopicFamilyContract } from "./market-family-contracts.js";
import type { MarketOpportunity } from "./market-opportunities.js";

interface PromptCapableProvider {
  complete(prompt: string, options?: {
    system?: string;
    maxTokens?: number;
    model?: string;
    modelTier?: "fast" | "standard" | "premium";
  }): Promise<string>;
  readonly name?: string;
}

export interface BuildMarketDraftOptions {
  opportunity: MarketOpportunity;
  feedCount: number;
  availableBalance: number;
  oracleAssetCount: number;
  llmProvider?: PromptCapableProvider | null;
  minTextLength?: number;
  category?: "ANALYSIS" | "PREDICTION";
  predictionHorizon?: string | null;
}

type MarketDraftCategory = "ANALYSIS" | "PREDICTION";

export interface MarketPromptInput {
  asset: string;
  divergence: {
    severity: string | null;
    type: string | null;
    description: string | null;
    details: Record<string, unknown> | null;
  };
  signal: {
    topic: string | null;
    confidence: number | null;
    direction: string | null;
  };
  price: {
    priceUsd: number | null;
    change24h: number | null;
    source: string | null;
  };
  marketContext: {
    situation: MarketOpportunity["kind"];
    lastSeenAt: string | null;
    matchingPostCount: number;
    dislocationLean: "higher" | "lower" | null;
  };
  evidence: {
    primarySourceName: string | null;
    supportingSourceNames: string[];
  };
  prediction: {
    category: MarketDraftCategory;
    horizon: string | null;
    direction: MarketOpportunity["recommendedDirection"];
  };
}

export type MarketPromptPacket = ColonyPromptPacket<MarketPromptInput>;

export interface MarketDraftSuccess {
  ok: true;
  category: MarketDraftCategory;
  text: string;
  confidence: number;
  tags: string[];
  promptPacket: MarketPromptPacket;
  qualityGate: QualityGateResult;
  draftSource: "llm";
}

export interface MarketDraftFailure {
  ok: false;
  reason: string;
  promptPacket: MarketPromptPacket;
  qualityGate: QualityGateResult;
  notes: string[];
}

export type MarketDraftResult = MarketDraftSuccess | MarketDraftFailure;

const DEFAULT_MIN_TEXT_LENGTH = 200;
const DEFAULT_PREDICTION_HORIZON = "30m";

export async function buildMarketDraft(
  opts: BuildMarketDraftOptions,
): Promise<MarketDraftResult> {
  const category = opts.category ?? "ANALYSIS";
  const predictionHorizon = category === "PREDICTION"
    ? normalizePredictionHorizon(opts.predictionHorizon)
    : null;
  const promptPacket = buildMarketPromptPacket(opts, category, predictionHorizon);
  const minTextLength = opts.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH;
  const llmText = await generateViaProvider(opts.llmProvider, promptPacket, category);

  if (!llmText) {
    return {
      ok: false,
      reason: "llm_provider_unavailable",
      promptPacket,
      qualityGate: checkMarketDraftQuality("", minTextLength, opts.opportunity, category, predictionHorizon),
      notes: ["Phase 2 market drafting requires a real LLM provider; deterministic fallback is intentionally disabled."],
    };
  }

  const preferredGate = checkMarketDraftQuality(llmText, minTextLength, opts.opportunity, category, predictionHorizon);
  if (preferredGate.pass) {
    return {
      ok: true,
      category,
      text: llmText,
      confidence: clampConfidence(opts.opportunity),
      tags: buildTags(opts.opportunity),
      promptPacket,
      qualityGate: preferredGate,
      draftSource: "llm",
    };
  }

  return {
    ok: false,
    reason: "draft_quality_gate_failed",
    promptPacket,
    qualityGate: preferredGate,
    notes: [
      `llm_output_failed: ${preferredGate.reason ?? "unknown"}`,
      `llm_output_preview: ${llmText.slice(0, 220)}`,
    ],
  };
}

function normalizePredictionHorizon(predictionHorizon: string | null | undefined): string {
  if (typeof predictionHorizon !== "string") {
    return DEFAULT_PREDICTION_HORIZON;
  }
  const trimmed = predictionHorizon.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PREDICTION_HORIZON;
}

function buildMarketPromptPacket(
  opts: BuildMarketDraftOptions,
  category: MarketDraftCategory,
  predictionHorizon: string | null,
): MarketPromptPacket {
  const opportunity = opts.opportunity;
  const oracleContract = getMarketTopicFamilyContract("oracle-divergence");
  const primarySource = getPrimaryAttestationSourceName(opportunity.attestationPlan);
  const supportingSources = opportunity.attestationPlan.supporting.map((candidate) => candidate.name);
  const isPrediction = category === "PREDICTION";

  return {
    archetype: "market-analyst",
    role: [
      "You are a quantitative market analyst publishing attested, high-signal colony analysis for traders.",
      "Your job is to compress the setup into a concrete market read with numbers that matter now.",
    ],
    edge: [
      ...oracleContract.promptDoctrine.baseline,
      ...oracleContract.promptDoctrine.focus,
    ],
    input: {
      asset: opportunity.asset,
      divergence: {
        severity: opportunity.divergence?.severity ?? null,
        type: opportunity.divergence?.type ?? null,
        description: opportunity.divergence?.description ?? null,
        details: opportunity.divergence?.details ?? null,
      },
      signal: {
        topic: opportunity.matchedSignal?.topic ?? null,
        confidence: opportunity.matchedSignal?.confidence ?? null,
        direction: opportunity.matchedSignal?.direction ?? null,
      },
      price: {
        priceUsd: opportunity.priceSnapshot?.priceUsd ?? null,
        change24h: opportunity.priceSnapshot?.change24h ?? null,
        source: opportunity.priceSnapshot?.source ?? null,
      },
      marketContext: {
        situation: opportunity.kind,
        matchingPostCount: opportunity.matchingFeedPosts.length,
        lastSeenAt: opportunity.lastSeenAt == null ? null : new Date(opportunity.lastSeenAt).toISOString(),
        dislocationLean: opportunity.recommendedDirection,
      },
      evidence: {
        primarySourceName: primarySource,
        supportingSourceNames: supportingSources,
      },
      prediction: {
        category,
        horizon: predictionHorizon,
        direction: opportunity.recommendedDirection,
      },
    },
    instruction: isPrediction
      ? "Write one standalone PREDICTION post grounded in this market input. Make one explicit time-bounded directional claim, support it with the key numbers, state calibrated confidence, and finish with the condition that would invalidate the call."
      : "Write one standalone ANALYSIS post grounded in this market input. Describe the dislocation, support it with the key numbers, and finish with the condition that would narrow or dissolve it.",
    constraints: [
      "Use only the packet data; do not invent prices, percentages, or market structure.",
      "Reference the concrete divergence severity and price move when they are present.",
      "Include the specific market values that make the dislocation concrete.",
      "Do not mention internal opportunity scores, rationale text, feed counts, or balance/context bookkeeping.",
      "Explain why the dislocation is worth watching and what would confirm or weaken it from the evidence.",
      "Keep the tone measured and conviction-calibrated; market analysis should never sound certain.",
      "Do not narrate source selection or attestation mechanics.",
      "Treat the API label 'oracle' as sentiment metadata, not verified external truth.",
      ...oracleContract.claimBounds.blocked,
      ...(isPrediction
        ? [
          `State the horizon explicitly as ${predictionHorizon}.`,
          "Make the direction explicit: say whether price is expected to move higher or lower over that horizon.",
          "Include an explicit confidence percentage in plain prose.",
          "Output one compact PREDICTION post in plain prose, not headings or bullets.",
        ]
        : ["Output one compact ANALYSIS post in plain prose, not headings or bullets."]),
    ],
    output: {
      category,
      confidenceStyle: isPrediction
        ? "calibrated and explicit; include a concrete confidence percentage without sounding absolute"
        : "measured and agnostic; frame the dislocation without treating severity as calibrated confidence",
      shape: isPrediction
        ? [
          "Sentence 1: the directional prediction and explicit horizon.",
          "Sentence 2: concrete observed divergence, signal, or price evidence plus confidence.",
          "Sentence 3: what would invalidate the call before the horizon expires.",
        ]
        : [
          "Sentence 1: the observed dislocation and why it is worth watching now.",
          "Sentence 2: concrete observed divergence, signal, or price evidence.",
          "Sentence 3: what would narrow, widen, or weaken the setup next.",
        ],
      successCriteria: isPrediction
        ? [
          "Reads like a checkable market call rather than generic commentary.",
          "Includes a concrete time horizon, direction, and confidence percentage.",
          "Ends with a credible invalidation condition before the horizon expires.",
        ]
        : [
          "Reads like a market observation, not a direction call or backend report.",
          "Includes the concrete numbers that make the dislocation legible.",
          "Ends with a credible invalidation, narrowing, or resolution condition.",
        ],
    },
  };
}

async function generateViaProvider(
  provider: PromptCapableProvider | null | undefined,
  packet: MarketPromptPacket,
  category: MarketDraftCategory,
): Promise<string | null> {
  if (!provider) return null;

  const prompt = renderColonyPromptPacket(packet);
  const isPrediction = category === "PREDICTION";

  const completion = await provider.complete(prompt, {
    system: isPrediction
      ? "You write concise, numeric, evidence-bound market predictions. Make one checkable directional call with an explicit horizon and confidence percentage, keep the numbers concrete, end with invalidation, and never use markdown, headings, or internal workflow language."
      : "You write concise, numeric, evidence-bound market posts. Describe measurable dislocations without claiming the market is wrong, keep the numbers concrete, end with invalidation, and never use markdown, headings, or internal workflow language.",
    maxTokens: 220,
    modelTier: "standard",
  });

  return normalizeDraftText(completion);
}

function buildTags(opportunity: MarketOpportunity): string[] {
  return ["market", opportunity.asset.toLowerCase(), opportunity.kind.replace("_", "-")];
}

function clampConfidence(opportunity: MarketOpportunity): number {
  const base = opportunity.divergence?.severity === "high"
    ? 76
    : opportunity.divergence?.severity === "medium"
      ? 68
      : 61;
  const signalConfidence = opportunity.matchedSignal?.confidence ?? base;
  return Math.max(55, Math.min(82, Math.round((base + signalConfidence) / 2)));
}

function normalizeDraftText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/^Claim:\s*/i, "").trim();
}

function checkMarketDraftQuality(
  text: string,
  minTextLength: number,
  opportunity: MarketOpportunity,
  category: MarketDraftCategory,
  predictionHorizon: string | null,
): QualityGateResult {
  const generic = checkPublishQuality({ text, category }, { minTextLength });
  if (!generic.pass) {
    return generic;
  }

  if (category === "PREDICTION") {
    const hasHorizon = predictionHorizon != null && text.toLowerCase().includes(predictionHorizon.toLowerCase());
    const hasConfidence = /\bconfidence\s*\d{1,3}%|\b\d{1,3}%\s*confidence|\bconfidence:\s*\d{1,3}%/i.test(text);
    const hasDirection = /\b(?:higher|lower|up|down|above|below)\b/i.test(text);
    const checks = [
      ...generic.checks,
      {
        name: "prediction-horizon",
        pass: hasHorizon,
        detail: hasHorizon
          ? `prediction names horizon ${predictionHorizon}`
          : `prediction must name the explicit horizon ${predictionHorizon}`,
      },
      {
        name: "prediction-confidence",
        pass: hasConfidence,
        detail: hasConfidence
          ? "prediction includes an explicit confidence percentage"
          : "prediction must include an explicit confidence percentage",
      },
      {
        name: "prediction-direction",
        pass: hasDirection,
        detail: hasDirection
          ? "prediction names a directional outcome"
          : "prediction must name whether price is expected to move higher or lower or cross a threshold",
      },
    ];
    if (!hasHorizon) {
      return { pass: false, reason: `failed: prediction-horizon — prediction must name the explicit horizon ${predictionHorizon}`, checks };
    }
    if (!hasConfidence) {
      return { pass: false, reason: "failed: prediction-confidence — prediction must include an explicit confidence percentage", checks };
    }
    if (!hasDirection) {
      return { pass: false, reason: "failed: prediction-direction — prediction must name a directional outcome", checks };
    }
    return { ...generic, checks };
  }

  if (opportunity.divergence) {
    const contract = getMarketTopicFamilyContract("oracle-divergence");
    for (const slip of contract.quality.slipPatterns) {
      if (slip.pattern.test(text)) {
        const checks = [
          ...generic.checks,
          {
            name: "market-family-grounding",
            pass: false,
            detail: slip.detail,
          },
        ];
        return {
          pass: false,
          reason: `failed: market-family-grounding — ${slip.detail}`,
          checks,
        };
      }
    }

    return {
      ...generic,
      checks: [
        ...generic.checks,
        {
          name: "market-family-grounding",
          pass: true,
          detail: "oracle-divergence doctrine respected",
        },
      ],
    };
  }

  return generic;
}
