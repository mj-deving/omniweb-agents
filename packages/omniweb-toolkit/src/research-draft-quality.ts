import { checkPublishQuality, type QualityGateResult } from "./publish-quality.js";
import { classifyResearchEvidenceSemanticClass, type ResearchEvidenceSummary } from "./research-evidence.js";
import type { ResearchOpportunity } from "./research-opportunities.js";
import type { ResearchSelfHistorySummary } from "./research-self-history.js";

export type ResearchDraftCategory = "ANALYSIS" | "OBSERVATION";

export const DEFAULT_RESEARCH_DRAFT_MIN_TEXT_LENGTH = 200;
export const DEFAULT_RESEARCH_DRAFT_TARGET_MAX_TEXT_LENGTH = 260;
export const DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH = 320;
const SELF_REDUNDANCY_TOKEN_STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "before",
  "being",
  "below",
  "between",
  "could",
  "does",
  "front",
  "from",
  "have",
  "into",
  "just",
  "near",
  "real",
  "still",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "treating",
  "under",
  "until",
  "watch",
  "when",
  "while",
  "with",
]);
const RESEARCH_META_PATTERNS: Array<{ name: string; pattern: RegExp; detail: string }> = [
  {
    name: "internal-signal-metadata",
    pattern: /\b\d{1,3}-confidence\b|\bconfidence signal\b/i,
    detail: "mentions internal confidence metadata instead of stating the thesis plainly",
  },
  {
    name: "internal-opportunity-metrics",
    pattern: /\bopportunity score\b|\bhigh score\b|\bcoverage gap\b|\bunderrepresented\b|\bmatching posts?\b|\bfeed items?\b|\bleaderboard\b/i,
    detail: "mentions internal ranking or deduplication metrics",
  },
  {
    name: "attestation-pipeline-narration",
    pattern: /\bprimary evidence routes\b|\bprimary source\b|\bsupporting source\b|\bsole supporting source\b|\bnext live attested fetch\b|\battestation plan\b/i,
    detail: "narrates the attestation workflow instead of using evidence in the post itself",
  },
  {
    name: "decision-rationale-leak",
    pattern: /\bdeserves (fresh )?attention now\b|\bwhy this topic deserves attention\b/i,
    detail: "explains the agent's decision to post rather than the market observation",
  },
];

const DIVERGENCE_CONTEXT_PATTERNS = [
  /\bdivergence\b/i,
  /\bmismatch\b/i,
  /\bdisconnect\b/i,
  /\bdespite\b/i,
  /\beven as\b/i,
  /\bwhile\b/i,
];

const ANALYSIS_CATEGORY_PATTERNS = [
  /\bdivergence\b/i,
  /\bmismatch\b/i,
  /\bdisconnect\b/i,
];

const MACRO_LIQUIDITY_MISMATCH_PATTERNS = [
  /\btight dollar funding\b/i,
  /\bfront-end inversion\b/i,
  /\bfunding backdrop\b/i,
  /\bnot loose liquidity\b/i,
  /\bahead of the rates tape\b/i,
];

const SENTIMENT_CONTEXT_PATTERNS = [
  /\bsentiment\b/i,
  /\bbearish\b/i,
  /\bbullish\b/i,
  /\bpositioning\b/i,
  /\bconviction\b/i,
];

const MARKET_JUDGMENT_PATTERNS = [
  /\blooks\b/i,
  /\bindecisive\b/i,
  /\bconstructive\b/i,
  /\bweaker\b/i,
  /\bsetup\b/i,
  /\bbreakout\b/i,
  /\bsupport and resistance\b/i,
  /\bsupport\b/i,
  /\bresistance\b/i,
  /\bbroad range\b/i,
  /\bprice action\b/i,
  /\brefut(?:e|es|ing)\b/i,
  /\bpreced(?:e|es|ing)\b/i,
  /\bsignal(?:s|ing)?\b/i,
  /\bmarket still\b/i,
  /\bif\b[\s\S]{0,80}\bwould\b/i,
];

const RESEARCH_STYLE_PATTERNS: Array<{ name: string; pattern: RegExp; detail: string }> = [
  {
    name: "awkward-sentiment-fraction",
    pattern: /\bhalf of (?:colony )?sentiment\b/i,
    detail: "uses awkward sentiment phrasing instead of naming the actual bearish or bullish read",
  },
  {
    name: "modelish-narrative-lag",
    pattern: /\bnarrative lagging (?:price|structure)\b|\bstructure lagging narrative\b/i,
    detail: "ends on model-y commentary instead of a concrete market interpretation",
  },
  {
    name: "mirrored-rhetorical-close",
    pattern: /\b[A-Za-z-]+\s+lagging\s+[A-Za-z-]+\s+rather than\s+[A-Za-z-]+\s+lagging\s+[A-Za-z-]+\b/i,
    detail: "uses mirrored rhetorical phrasing instead of a plain market conclusion",
  },
  {
    name: "hedged-non-event-thesis",
    pattern: /\b(?:positioning drift|soft[-\s]+(?:bear|bull|bearish|bullish)\s+lean|small\s+(?:bear|bull|bearish|bullish)\s+tilt)\b/i,
    detail: "frames the setup as a mild non-event instead of stating the directional implication plainly",
  },
  {
    name: "contrastive-dismissal",
    pattern: /\bnot (?:a|the)\s+(?:real\s+)?squeeze setup\b/i,
    detail: "spends the compact thesis on saying what the setup is not instead of what it implies",
  },
];

const STABLECOIN_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\b(?:still|sits|holding|staying|exactly|right at|near|around)\s+\$?1(?:\.0+)?\b/i,
    detail: "treats the normal 1.00 peg as the thesis instead of background context",
  },
  {
    pattern: /\bwithout (?:any )?peg deviation means\b/i,
    detail: "turns a normal peg sanity check into the main causal claim",
  },
  {
    pattern: /\b(?:still\s+sitting|staying|holding|exactly|right at|near|around)\s+(?:exactly\s+)?\$?1(?:\.0+)?\b.{0,80}\b(?:prove|proves|means|constructive|healthy|bullish|signal|safe)\b/i,
    detail: "uses a normal peg to prove health, bullishness, or the main market signal",
  },
  {
    pattern: /\bpeg\s+(?:staying|holding|remaining|sitting)\s+(?:at\s+)?\$?1(?:\.0+)?\b.{0,80}\b(?:mean|means|proves|shows)\b/i,
    detail: "treats peg stability itself as the key causal conclusion",
  },
];

const FUNDING_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\bnegative funding\b.{0,80}\b(?:prove|proves|means|guarantees|confirms)\b.{0,80}\b(?:downside|bearish|selloff|breakdown)\b/i,
    detail: "treats negative funding alone as proof of a bearish outcome",
  },
  {
    pattern: /\bnegative funding\b.{0,80}\b(?:guarantees|means|proves)\b.{0,80}\b(?:squeeze|bounce|reversal)\b/i,
    detail: "treats negative funding alone as proof of a contrarian squeeze setup",
  },
  {
    pattern: /\bfunding\b.{0,60}\b(?:by itself|alone)\b/i,
    detail: "explicitly centers funding in isolation instead of relating it to price and positioning context",
  },
];

const SPOT_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\b(?:price|bitcoin|btc)\b.{0,50}\b(?:up|gained|rallied|climbed)\b.{0,60}\b(?:therefore|so|which means|that means)\b.{0,40}\b(?:bullish|constructive|uptrend)\b/i,
    detail: "treats a raw upward move as the thesis without explaining the range or signal context",
  },
  {
    pattern: /\b(?:price|bitcoin|btc)\b.{0,50}\b(?:down|fell|dropped|sold off)\b.{0,60}\b(?:therefore|so|which means|that means)\b.{0,40}\b(?:bearish|breakdown|downtrend)\b/i,
    detail: "treats a raw downward move as the thesis without explaining the range or signal context",
  },
  {
    pattern: /\brange[- ]bound indecision\b|\bprice keeps oscillating between support and resistance\b/i,
    detail: "falls back to generic range commentary instead of stating where price sits in the range and why that matters",
  },
];

const ETF_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\bpositive net flow\b.{0,80}\b(?:proves|means|shows|confirms)\b.{0,60}\b(?:broad|strong|durable)\s+institutional demand\b/i,
    detail: "treats positive aggregate flow alone as proof of broad institutional demand",
  },
  {
    pattern: /\btotal holdings\b.{0,80}\b(?:prove|proves|show|shows|mean|means)\b.{0,60}\b(?:fresh|new)\s+(?:demand|buying)\b/i,
    detail: "uses total holdings alone as the fresh signal instead of current flow behavior",
  },
  {
    pattern: /\b(?:inflows?|net flows?)\b.{0,80}\b(?:therefore|so|which means|that means)\b.{0,60}\b(?:institutions are bullish|institutions are buying aggressively)\b/i,
    detail: "jumps from flow direction straight to institutional conviction without breadth or concentration context",
  },
];

const NETWORK_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\b(?:more|higher|rising|surging)\s+(?:transactions|on-chain activity|network activity|blocks)\b.{0,80}\b(?:means|proves|shows|confirms)\b.{0,60}\b(?:bullish|adoption|strong demand)\b/i,
    detail: "treats raw network activity as automatic proof of adoption, demand, or a bullish outcome",
  },
  {
    pattern: /\bhashrate\b.{0,80}\b(?:means|proves|shows|confirms)\b.{0,60}\b(?:bullish|healthy|safe|strong)\b/i,
    detail: "treats hashrate alone as proof of network health or bullish price implications",
  },
  {
    pattern: /\bon-chain\b.{0,60}\b(?:activity|usage)\b.{0,80}\b(?:therefore|so|which means|that means)\b.{0,60}\b(?:bullish|constructive)\b/i,
    detail: "jumps from generic on-chain activity straight to a market conclusion without explaining the mechanism",
  },
  {
    pattern: /\bprice\b.{0,40}\b(?:absorb(?:s|ing|ed)?|reject(?:s|ing|ed)?|validat(?:es|ing|ed)?)\b.{0,40}\b(?:load|congestion|network activity|throughput)\b|\b(?:load|congestion|network activity|throughput)\b.{0,40}\b(?:absorb(?:ed)?|reject(?:ed)?|validat(?:ed)?)\b.{0,40}\bby price\b|\b(?:market|price)\b.{0,40}\bvalidat(?:es|ing|ed)?\b.{0,40}\b(?:congestion|network stress|network load|throughput)\b/i,
    detail: "claims that price action directly confirms or rejects network load without evidence for that mechanism",
  },
  {
    pattern: /\b(?:network stress|network load|congestion|throughput density|on-chain stress)\b.{0,80}\b(?:prove|proves|means|shows|confirms)\b.{0,60}\b(?:demand is healthy|healthy demand|adoption|bullish|price strength)\b/i,
    detail: "treats network stress or congestion itself as proof of healthy demand, adoption, or a bullish outcome",
  },
];

const VIX_CREDIT_BASELINE_SLIP_PATTERNS: Array<{ pattern: RegExp; detail: string }> = [
  {
    pattern: /\b(?:high|elevated|spiking)\s+vix\b.{0,80}\b(?:means|proves|guarantees|confirms)\b.{0,60}\b(?:crash|recession|panic|meltdown)\b/i,
    detail: "treats a VIX level or spike by itself as proof of a crash or recession outcome",
  },
  {
    pattern: /\bcredit spread\b/i,
    detail: "describes the bill/note spread as a literal credit spread instead of a Treasury rates backdrop",
  },
  {
    pattern: /\bvix\b.{0,60}\b(?:alone|by itself)\b/i,
    detail: "explicitly centers VIX in isolation instead of relating it to the rates backdrop and session move",
  },
];

export function checkResearchDraftQuality(
  text: string,
  category: ResearchDraftCategory,
  minTextLength: number,
  opportunity: ResearchOpportunity,
  evidenceSummary: ResearchEvidenceSummary,
  supportingEvidenceSummaries: ResearchEvidenceSummary[] = [],
  selfHistory: ResearchSelfHistorySummary | null = null,
): QualityGateResult {
  const base = checkPublishQuality(
    { text, category },
    { minTextLength },
  );
  const leak = findResearchMetaLeak(text);
  const evidenceAlignment = checkEvidenceValueOverlap(text, evidenceSummary, supportingEvidenceSummaries);
  const semanticEvidence = checkSemanticEvidenceGrounding(evidenceSummary, supportingEvidenceSummaries);
  const contextualGrounding = category === "OBSERVATION"
    ? { pass: true, detail: "observation mode does not require an explicit interpretive mismatch thesis" }
    : checkContextualGrounding(text, opportunity);
  const styleLeak = findResearchStyleProblem(text);
  const familyBaselineLeak = findFamilyBaselineProblem(text, opportunity);
  const selfRedundancy = checkSelfRedundancy(text, selfHistory);
  const checks = [
    ...base.checks,
    {
      name: "compact-claim-length",
      pass: text.length <= DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH,
      detail: text.length <= DEFAULT_RESEARCH_DRAFT_TARGET_MAX_TEXT_LENGTH
        ? `${text.length}/${DEFAULT_RESEARCH_DRAFT_TARGET_MAX_TEXT_LENGTH} target chars`
        : text.length <= DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH
          ? `${text.length}/${DEFAULT_RESEARCH_DRAFT_TARGET_MAX_TEXT_LENGTH} target chars — above default target but still within hard ceiling ${DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH}`
          : `${text.length}/${DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH} chars — too long for the compact interpretive-claim format`,
    },
    {
      name: "no-internal-reasoning-leak",
      pass: leak == null,
      detail: leak == null ? "no internal scoring or workflow language detected" : `${leak.name}: ${leak.detail}`,
    },
    {
      name: "evidence-value-overlap",
      pass: evidenceAlignment.pass,
      detail: evidenceAlignment.detail,
    },
    {
      name: "semantic-evidence-grounding",
      pass: semanticEvidence.pass,
      detail: semanticEvidence.detail,
    },
    {
      name: "research-angle-grounding",
      pass: contextualGrounding.pass,
      detail: contextualGrounding.detail,
    },
    {
      name: "no-self-redundancy",
      pass: selfRedundancy.pass,
      detail: selfRedundancy.detail,
    },
    {
      name: "research-style",
      pass: styleLeak == null,
      detail: styleLeak == null ? "wording reads like colony-facing analysis" : `${styleLeak.name}: ${styleLeak.detail}`,
    },
    {
      name: "family-dossier-grounding",
      pass: familyBaselineLeak == null,
      detail: familyBaselineLeak == null
        ? "draft respects family-level baseline and false-inference rules"
        : familyBaselineLeak.detail,
    },
  ];

  if (!base.pass) {
    return {
      pass: false,
      reason: base.reason,
      checks,
    };
  }

  if (text.length > DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH) {
    return {
      pass: false,
      reason: `failed: compact-claim-length — ${text.length}/${DEFAULT_RESEARCH_DRAFT_MAX_TEXT_LENGTH} chars exceeds the compact interpretive-claim ceiling`,
      checks,
    };
  }

  if (leak) {
    return {
      pass: false,
      reason: `failed: no-internal-reasoning-leak — ${leak.detail}`,
      checks,
    };
  }

  if (!evidenceAlignment.pass) {
    return {
      pass: false,
      reason: `failed: evidence-value-overlap — ${evidenceAlignment.detail}`,
      checks,
    };
  }

  if (!semanticEvidence.pass) {
    return {
      pass: false,
      reason: `failed: semantic-evidence-grounding — ${semanticEvidence.detail}`,
      checks,
    };
  }

  if (!contextualGrounding.pass) {
    return {
      pass: false,
      reason: `failed: research-angle-grounding — ${contextualGrounding.detail}`,
      checks,
    };
  }

  if (!selfRedundancy.pass) {
    return {
      pass: false,
      reason: `failed: no-self-redundancy — ${selfRedundancy.detail}`,
      checks,
    };
  }

  if (styleLeak) {
    return {
      pass: false,
      reason: `failed: research-style — ${styleLeak.detail}`,
      checks,
    };
  }

  if (familyBaselineLeak) {
    return {
      pass: false,
      reason: `failed: family-dossier-grounding — ${familyBaselineLeak.detail}`,
      checks,
    };
  }

  return {
    pass: true,
    checks,
  };
}

export function inferResearchDraftCategory(
  text: string,
  opportunity: ResearchOpportunity,
  preferredCategory: ResearchDraftCategory | null = null,
): ResearchDraftCategory {
  const numericTokenCount = extractNumericValues(text).length;
  const interpretiveSignals = [
    /\bmeans\b/i,
    /\bimplies\b/i,
    /\bpoints to\b/i,
    /\bthe read\b/i,
    /\bwatch for\b/i,
    /\bfirst real sign\b/i,
    /\bpremature\b/i,
    /\buntil then\b/i,
    /\binvalid(?:ate|ates|ation)\b/i,
    /\bconfirm(?:s|ed|ation)?\b/i,
    /\bqualif(?:y|ies|ied)\b/i,
    ...ANALYSIS_CATEGORY_PATTERNS,
  ];

  if (hasExplicitMacroLiquidityMismatchThesis(text, opportunity)) {
    return "ANALYSIS";
  }

  if (
    numericTokenCount < 2 ||
    interpretiveSignals.some((pattern) => pattern.test(text)) ||
    MARKET_JUDGMENT_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    return "ANALYSIS";
  }

  const topic = opportunity.topic.toLowerCase();
  if (/\bcontradiction\b|\bstale topic\b/i.test(topic)) {
    return "ANALYSIS";
  }

  if (preferredCategory === "ANALYSIS") {
    return "ANALYSIS";
  }

  return "OBSERVATION";
}

function hasExplicitMacroLiquidityMismatchThesis(
  text: string,
  opportunity: ResearchOpportunity,
): boolean {
  if (opportunity.sourceProfile.family !== "macro-liquidity") {
    return false;
  }

  if (MACRO_LIQUIDITY_MISMATCH_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  const hasLiquidityCue = /\bliquidity\b|\bpivot\b|\beasing\b|\bstealth-qe\b/i.test(text);
  const hasRatesCue = /\bfunding\b|\binversion\b|\bbills?\b|\bnotes?\b|\bcurve\b/i.test(text);
  const hasContrastCue = /\bnot\b|\bahead of\b|\bwhile\b|\bversus\b|\bagainst\b|\bfighting\b/i.test(text);
  return hasLiquidityCue && hasRatesCue && hasContrastCue;
}

function checkSelfRedundancy(
  text: string,
  selfHistory: ResearchSelfHistorySummary | null,
): { pass: boolean; detail: string } {
  if (!selfHistory) {
    return { pass: true, detail: "no self-history provided" };
  }

  const sameTopic = evaluateSelfOverlap(
    text,
    selfHistory.lastSameTopicPost,
    selfHistory.changeSinceLastSameTopic,
    24 * 7,
    "same-topic",
  );
  if (sameTopic) return { pass: false, detail: sameTopic };

  const sameFamily = evaluateSelfOverlap(
    text,
    selfHistory.lastSameFamilyPost,
    selfHistory.changeSinceLastSameFamily,
    24,
    "same-family",
  );
  if (sameFamily) return { pass: false, detail: sameFamily };

  const colonyOverlap = selfHistory.colonyNovelty;
  if (colonyOverlap?.skipSuggested) {
    const post = colonyOverlap.strongestOverlapPost;
    if (post) {
      const reasons = [
        post.sharedNumbers.length > 0 ? `shares numeric surface ${post.sharedNumbers.join(", ")}` : null,
        post.sharedTerms.length > 0 ? `overlaps topic tokens ${post.sharedTerms.join(", ")}` : null,
      ].filter((value): value is string => value != null);
      return {
        pass: false,
        detail: `recent colony post ${formatHoursAgo(post.hoursAgo)} ago ${reasons.join("; ")}`,
      };
    }
    return {
      pass: false,
      detail: colonyOverlap.overlapReason ?? "recent colony surface already covers the same thesis",
    };
  }

  return { pass: true, detail: "no near-twin self-history overlap detected" };
}

function evaluateSelfOverlap(
  text: string,
  previousPost: ResearchSelfHistorySummary["lastSameTopicPost"] | ResearchSelfHistorySummary["lastSameFamilyPost"],
  delta: ResearchSelfHistorySummary["changeSinceLastSameTopic"] | ResearchSelfHistorySummary["changeSinceLastSameFamily"],
  maxHours: number,
  scope: "same-topic" | "same-family",
): string | null {
  if (!previousPost || previousPost.hoursAgo > maxHours) return null;

  const overlap = compareDraftOverlap(text, previousPost.textSnippet ?? "");
  const noMaterialDelta = delta != null && !delta.hasMeaningfulChange;
  const strongTokenOverlap = overlap.sharedTerms.length >= 3 && overlap.termOverlapRatio >= 0.5;
  const numericOverlap = overlap.sharedNumbers.length > 0;

  if (scope === "same-topic" && noMaterialDelta) {
    return `recent ${scope} post ${formatHoursAgo(previousPost.hoursAgo)} ago still shares the same evidence surface`;
  }

  if (scope === "same-family" && (numericOverlap || strongTokenOverlap)) {
    const reasons = [
      numericOverlap ? `reuses numeric surface ${overlap.sharedNumbers.join(", ")}` : null,
      strongTokenOverlap ? `repeats thesis tokens ${overlap.sharedTerms.join(", ")}` : null,
      noMaterialDelta ? "shows no material evidence delta" : null,
    ].filter((value): value is string => value != null);

    return `recent ${scope} post ${formatHoursAgo(previousPost.hoursAgo)} ago ${reasons.join("; ")}`;
  }

  return null;
}

function compareDraftOverlap(currentText: string, previousText: string): {
  sharedTerms: string[];
  sharedNumbers: string[];
  termOverlapRatio: number;
} {
  const currentTerms = extractSelfRedundancyTerms(currentText);
  const previousTerms = extractSelfRedundancyTerms(previousText);
  const sharedTerms = [...currentTerms].filter((token) => previousTerms.has(token));
  const denominator = Math.max(1, Math.min(currentTerms.size, previousTerms.size));

  const currentNumbers = extractNumericTokens(currentText);
  const previousNumbers = extractNumericTokens(previousText);
  const sharedNumbers = [...currentNumbers].filter((token) => previousNumbers.has(token));

  return {
    sharedTerms,
    sharedNumbers,
    termOverlapRatio: sharedTerms.length / denominator,
  };
}

function extractSelfRedundancyTerms(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  return new Set(
    tokens.filter((token) => token.length >= 4 && !SELF_REDUNDANCY_TOKEN_STOPWORDS.has(token)),
  );
}

function extractNumericTokens(text: string): Set<string> {
  const matches = text.match(/\b\d+(?:\.\d+)?(?:bps?|%|usd)?\b/gi) ?? [];
  return new Set(matches.map((token) => token.toLowerCase()));
}

function formatHoursAgo(hoursAgo: number): string {
  return `${Number(hoursAgo.toFixed(1))}h`;
}

function checkSemanticEvidenceGrounding(
  evidenceSummary: ResearchEvidenceSummary,
  supportingEvidenceSummaries: ResearchEvidenceSummary[] = [],
): { pass: boolean; detail: string } {
  const primaryClass = evidenceSummary.semanticClass
    ?? classifyResearchEvidenceSemanticClass("generic", evidenceSummary.values, evidenceSummary.derivedMetrics);

  if (primaryClass === "metadata") {
    return {
      pass: false,
      detail: "primary evidence is metadata-shaped (search/result-count style) rather than market, macro, liquidity, or network evidence",
    };
  }

  if (primaryClass === "generic") {
    return {
      pass: false,
      detail: "primary evidence could not be classified as market, macro, liquidity, or network evidence",
    };
  }

  const supportingClasses = supportingEvidenceSummaries.map((summary) =>
    summary.semanticClass
      ?? classifyResearchEvidenceSemanticClass("generic", summary.values, summary.derivedMetrics));

  const metadataSupport = supportingClasses.filter((entry) => entry === "metadata").length;
  return {
    pass: true,
    detail: metadataSupport > 0
      ? `primary evidence is ${primaryClass}; ignored ${metadataSupport} metadata-only supporting packet(s)`
      : `primary evidence is ${primaryClass}`,
  };
}

function findResearchMetaLeak(text: string): { name: string; detail: string } | null {
  for (const entry of RESEARCH_META_PATTERNS) {
    if (entry.pattern.test(text)) {
      return {
        name: entry.name,
        detail: entry.detail,
      };
    }
  }
  return null;
}

function findResearchStyleProblem(text: string): { name: string; detail: string } | null {
  for (const entry of RESEARCH_STYLE_PATTERNS) {
    if (entry.pattern.test(text)) {
      return {
        name: entry.name,
        detail: entry.detail,
      };
    }
  }
  return null;
}

function findFamilyBaselineProblem(
  text: string,
  opportunity: ResearchOpportunity,
): { detail: string } | null {
  if (opportunity.sourceProfile.family === "funding-structure") {
    for (const entry of FUNDING_BASELINE_SLIP_PATTERNS) {
      if (entry.pattern.test(text)) {
        return {
          detail: entry.detail,
        };
      }
    }
    return null;
  }

  if (opportunity.sourceProfile.family === "spot-momentum") {
    for (const entry of SPOT_BASELINE_SLIP_PATTERNS) {
      if (entry.pattern.test(text)) {
        return {
          detail: entry.detail,
        };
      }
    }
    return null;
  }

  if (opportunity.sourceProfile.family === "etf-flows") {
    for (const entry of ETF_BASELINE_SLIP_PATTERNS) {
      if (entry.pattern.test(text)) {
        return {
          detail: entry.detail,
        };
      }
    }
    return null;
  }

  if (opportunity.sourceProfile.family === "network-activity") {
    for (const entry of NETWORK_BASELINE_SLIP_PATTERNS) {
      if (entry.pattern.test(text)) {
        return {
          detail: entry.detail,
        };
      }
    }
    return null;
  }

  if (opportunity.sourceProfile.family === "vix-credit") {
    for (const entry of VIX_CREDIT_BASELINE_SLIP_PATTERNS) {
      if (entry.pattern.test(text)) {
        return {
          detail: entry.detail,
        };
      }
    }
    return null;
  }

  if (opportunity.sourceProfile.family !== "stablecoin-supply") {
    return null;
  }

  for (const entry of STABLECOIN_BASELINE_SLIP_PATTERNS) {
    if (entry.pattern.test(text)) {
      return {
        detail: entry.detail,
      };
    }
  }

  return null;
}

function checkContextualGrounding(
  text: string,
  opportunity: ResearchOpportunity,
): { pass: boolean; detail: string } {
  const topic = opportunity.topic.toLowerCase();

  if (topic.includes("divergence") || topic.includes("sentiment")) {
    const hasDivergenceCue = DIVERGENCE_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));
    const hasSentimentCue = SENTIMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));
    if (!hasDivergenceCue || !hasSentimentCue) {
      return {
        pass: false,
        detail: "draft does not clearly name the signal-vs-market mismatch implied by the topic",
      };
    }
  }

  return {
    pass: true,
    detail: "draft reflects the research angle implied by the topic",
  };
}

function checkEvidenceValueOverlap(
  text: string,
  evidenceSummary: ResearchEvidenceSummary,
  supportingEvidenceSummaries: ResearchEvidenceSummary[] = [],
): { pass: boolean; detail: string } {
  const draftNumbers = extractNumericValues(text);
  const allEvidence = [evidenceSummary, ...supportingEvidenceSummaries];
  const evidenceNumbers = allEvidence
    .flatMap((summary) => Object.values(summary.values).concat(Object.values(summary.derivedMetrics)))
    .flatMap((value) => extractNumericValues(value));

  if (evidenceNumbers.length === 0) {
    return {
      pass: false,
      detail: "no numeric evidence values were available for grounding",
    };
  }

  const overlap = draftNumbers.find((draftValue) =>
    evidenceNumbers.some((evidenceValue) => numericOverlap(draftValue, evidenceValue)));

  if (overlap == null) {
    return {
      pass: false,
      detail: "draft does not reference any fetched evidence value",
    };
  }

  return {
    pass: true,
    detail: `draft references fetched evidence value ${formatEvidenceValue(overlap)}`,
  };
}

function extractNumericValues(text: string): number[] {
  const matches = text.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches
    .map((match) => Number.parseFloat(match.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
}

function numericOverlap(left: number, right: number): boolean {
  const tolerance = Math.max(Math.abs(right) * 0.01, 0.01);
  return Math.abs(left - right) <= tolerance;
}

function formatEvidenceValue(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
