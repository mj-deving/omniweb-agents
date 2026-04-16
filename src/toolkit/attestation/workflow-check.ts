import { checkPublishQuality } from "../publish/quality-gate.js";
import { inferProvider, type SourceRecordV2 } from "../sources/catalog.js";
import { selectSourceForTopicV2 } from "../sources/policy.js";
import { validateUrl, type UrlValidationOptions, type UrlValidationResult } from "../url-validator.js";

export type CheckResult = {
  name: string;
  pass: boolean;
  severity: "blocker" | "warning" | "info";
  detail: string;
};

export type CatalogMatch = {
  source: SourceRecordV2;
  score: number;
  hostMatches: boolean;
  providerMatches: boolean;
  staticPathMatches: number;
  staticQueryMatches: number;
};

export type SourceAssessment = {
  url: string;
  hostname: string | null;
  provider: string | null;
  urlValidation: {
    ok: boolean;
    reason?: string;
  };
  catalogMatch: {
    found: boolean;
    source?: {
      id: string;
      name: string;
      provider: string;
      status: string;
      trustTier: string;
      responseFormat: string;
      dahrSafe: boolean;
      tlsnSafe: boolean;
      ratingOverall: number;
      note: string | null;
    };
    score?: number;
  };
  checks: CheckResult[];
};

export type WorkflowSourceView = {
  sources: SourceRecordV2[];
};

export type AttestationWorkflowInput = {
  attestUrl: string;
  supportingUrls?: string[];
  topic?: string | null;
  text?: string | null;
  category: string;
  confidence?: number;
  allowInsecure?: boolean;
};

export type AttestationWorkflowReport = {
  ok: boolean;
  readiness: "ready" | "needs_attention" | "blocked";
  topic: string | null;
  draft: {
    category: string;
    textLength: number;
    confidence: number | null;
    primaryAttestUrl: string;
    supportingUrls: string[];
  };
  sourceCatalog: {
    sourceCount: number;
    recommendedDahrCandidates: Array<{
      id: string;
      name: string;
      provider: string;
      status: string;
      ratingOverall: number;
      url: string;
      score: number;
    }>;
  };
  primaryAttestation: SourceAssessment;
  supportingEvidence: SourceAssessment[];
  evidenceChain: {
    totalSources: number;
    supportingSourceCount: number;
    uniqueHosts: string[];
    uniqueProviders: string[];
    checks: CheckResult[];
  };
  publishQuality: {
    checks: CheckResult[];
  };
  topicAlignment: {
    checks: CheckResult[];
  };
  blockers: CheckResult[];
  warnings: CheckResult[];
  recommendations: string[];
};

export type AttestationStressScenario = {
  id: string;
  title: string;
  expectation: {
    readiness: AttestationWorkflowReport["readiness"];
  };
  input: AttestationWorkflowInput;
};

export type AttestationStressSuiteReport = {
  ok: boolean;
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  scenarios: Array<{
    id: string;
    title: string;
    expectedReadiness: AttestationWorkflowReport["readiness"];
    actualReadiness: AttestationWorkflowReport["readiness"];
    pass: boolean;
    blockers: CheckResult[];
    warnings: CheckResult[];
    recommendations: string[];
  }>;
};

const SYNTHESIS_CATEGORIES = new Set(["ANALYSIS"]);
const LONG_FORM_CATEGORIES = new Set(["ANALYSIS", "OBSERVATION", "PREDICTION"]);

export const ATTESTATION_STRESS_SCENARIOS: AttestationStressScenario[] = [
  {
    id: "strong-single-source-observation",
    title: "Single-source observation from a strong catalog-backed JSON source",
    expectation: { readiness: "ready" },
    input: {
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      category: "OBSERVATION",
      text: "BTC spot is $67123.40 from CoinGecko right now, which gives us one clean factual observation from a catalog-backed JSON source. This is not a broad market thesis or synthesis post, just a direct metric report grounded in one attested value at the time of capture.",
      confidence: 68,
    },
  },
  {
    id: "strong-multi-source-analysis",
    title: "Cross-provider analysis with primary and supporting evidence",
    expectation: { readiness: "ready" },
    input: {
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      supportingUrls: ["https://blockchain.info/ticker"],
      category: "ANALYSIS",
      text: "BTC is printing $67123.40 on CoinGecko while Blockchain.info shows corroborating spot data from an independent provider, which supports the move as broad market consensus rather than one stale feed. Because two established providers are aligned on the same market state, this analysis has real corroboration instead of one-provider drift.",
      confidence: 72,
    },
  },
  {
    id: "weak-same-provider-analysis",
    title: "Multi-source analysis that only stacks one provider",
    expectation: { readiness: "needs_attention" },
    input: {
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      supportingUrls: ["https://api.coingecko.com/api/v3/coins/bitcoin"],
      category: "ANALYSIS",
      text: "BTC is firm because CoinGecko price and coin metadata both look strong, but this still needs an outside provider before we should trust the synthesis. The chain has two URLs, yet both collapse back to one provider, so the apparent corroboration is weaker than it first looks.",
      confidence: 66,
      topic: "BTC spot confirmation",
    },
  },
  {
    id: "adversarial-rss-feed",
    title: "RSS feed passed as a DAHR attestation source",
    expectation: { readiness: "blocked" },
    input: {
      attestUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
      category: "ANALYSIS",
      text: "Headline summary from an RSS feed with no JSON API backing should be blocked from DAHR attestation. Even if the URL is public and safe to fetch, the evidence plan is adversarial to the expected DAHR workflow because the source format does not fit the supported publish path.",
      confidence: 60,
    },
  },
];

type EvaluateWorkflowDeps = {
  sourceView: WorkflowSourceView;
  validateUrlFn?: (url: string, opts?: UrlValidationOptions) => Promise<UrlValidationResult>;
};

export async function evaluateAttestationWorkflow(
  input: AttestationWorkflowInput,
  deps: EvaluateWorkflowDeps,
): Promise<AttestationWorkflowReport> {
  const supportingUrls = input.supportingUrls ?? [];
  const topic = input.topic?.trim() || null;
  const validateUrlFn = deps.validateUrlFn ?? validateUrl;

  const primaryAssessment = await assessUrl(
    input.attestUrl,
    input.allowInsecure === true,
    deps.sourceView,
    validateUrlFn,
  );
  const supportingAssessments = await Promise.all(
    supportingUrls.map((url) => assessUrl(url, input.allowInsecure === true, deps.sourceView, validateUrlFn)),
  );

  const uniqueHosts = new Set<string>();
  const uniqueProviders = new Set<string>();
  for (const assessment of [primaryAssessment, ...supportingAssessments]) {
    if (assessment.hostname) uniqueHosts.add(assessment.hostname);
    if (assessment.provider) uniqueProviders.add(assessment.provider);
  }

  const topicCandidates = topic
    ? selectSourceForTopicV2(topic, deps.sourceView as never, "DAHR", 5)
    : [];
  const recommendedCatalogCandidates = topicCandidates.map((candidate) => ({
    id: candidate.source.id,
    name: candidate.source.name,
    provider: candidate.source.provider,
    status: candidate.source.status,
    ratingOverall: candidate.source.rating.overall,
    url: candidate.url,
    score: candidate.score,
  }));

  const evidenceChecks = buildEvidenceChecks({
    category: input.category,
    primaryAssessment,
    supportingAssessments,
    uniqueHosts,
    uniqueProviders,
  });
  const publishQualityChecks = buildPublishQualityChecks({
    text: input.text ?? null,
    category: input.category,
    confidence: input.confidence,
    supportingCount: supportingAssessments.length,
  });
  const topicAlignmentChecks = buildTopicAlignmentChecks(topic, primaryAssessment, recommendedCatalogCandidates);

  const allChecks = [
    ...primaryAssessment.checks,
    ...supportingAssessments.flatMap((assessment) => assessment.checks),
    ...evidenceChecks,
    ...publishQualityChecks,
    ...topicAlignmentChecks,
  ];

  const blockers = allChecks.filter((check) => !check.pass && check.severity === "blocker");
  const warnings = allChecks.filter((check) => !check.pass && check.severity === "warning");

  return {
    ok: blockers.length === 0,
    readiness: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs_attention" : "ready",
    topic,
    draft: {
      category: input.category,
      textLength: input.text?.length ?? 0,
      confidence: input.confidence ?? null,
      primaryAttestUrl: input.attestUrl,
      supportingUrls,
    },
    sourceCatalog: {
      sourceCount: deps.sourceView.sources.length,
      recommendedDahrCandidates: recommendedCatalogCandidates,
    },
    primaryAttestation: primaryAssessment,
    supportingEvidence: supportingAssessments,
    evidenceChain: {
      totalSources: 1 + supportingAssessments.length,
      supportingSourceCount: supportingAssessments.length,
      uniqueHosts: Array.from(uniqueHosts).sort(),
      uniqueProviders: Array.from(uniqueProviders).sort(),
      checks: evidenceChecks,
    },
    publishQuality: {
      checks: publishQualityChecks,
    },
    topicAlignment: {
      checks: topicAlignmentChecks,
    },
    blockers,
    warnings,
    recommendations: buildRecommendations({
      category: input.category,
      topic,
      text: input.text ?? null,
      confidence: input.confidence,
      primaryAssessment,
      supportingAssessments,
      topicCandidates: recommendedCatalogCandidates,
      warnings,
    }),
  };
}

export async function runAttestationStressSuite(
  deps: EvaluateWorkflowDeps,
  scenarioIds?: string[],
): Promise<AttestationStressSuiteReport> {
  const selectedScenarios = scenarioIds && scenarioIds.length > 0
    ? ATTESTATION_STRESS_SCENARIOS.filter((scenario) => scenarioIds.includes(scenario.id))
    : ATTESTATION_STRESS_SCENARIOS;

  const results = await Promise.all(selectedScenarios.map(async (scenario) => {
    const report = await evaluateAttestationWorkflow(scenario.input, deps);
    return {
      id: scenario.id,
      title: scenario.title,
      expectedReadiness: scenario.expectation.readiness,
      actualReadiness: report.readiness,
      pass: report.readiness === scenario.expectation.readiness,
      blockers: report.blockers,
      warnings: report.warnings,
      recommendations: report.recommendations,
    };
  }));

  const passedCount = results.filter((result) => result.pass).length;
  return {
    ok: passedCount === results.length,
    scenarioCount: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    scenarios: results,
  };
}

function buildEvidenceChecks(input: {
  category: string;
  primaryAssessment: SourceAssessment;
  supportingAssessments: SourceAssessment[];
  uniqueHosts: Set<string>;
  uniqueProviders: Set<string>;
}): CheckResult[] {
  const totalSources = 1 + input.supportingAssessments.length;
  const synthesisStyle = SYNTHESIS_CATEGORIES.has(input.category);
  const matchedSources = [input.primaryAssessment, ...input.supportingAssessments].filter((assessment) => assessment.catalogMatch.found);
  const allMatchedSourcesHealthy = matchedSources.every((assessment) => {
    const source = assessment.catalogMatch.source;
    return source && source.status === "active" && source.ratingOverall >= 50;
  });

  return [
    {
      name: "analysis-style-post-has-supporting-sources",
      pass: !synthesisStyle || totalSources >= 2,
      severity: "warning",
      detail: synthesisStyle
        ? `${totalSources} total source(s) for ${input.category}`
        : `${input.category} does not require multi-source evidence by default`,
    },
    {
      name: "supporting-sources-add-provider-diversity",
      pass: input.supportingAssessments.length === 0 || input.uniqueProviders.size >= 2,
      severity: "warning",
      detail: `${input.uniqueProviders.size} unique provider(s) across ${totalSources} source(s)`,
    },
    {
      name: "supporting-sources-add-host-diversity",
      pass: input.supportingAssessments.length === 0 || input.uniqueHosts.size >= 2,
      severity: "warning",
      detail: `${input.uniqueHosts.size} unique host(s) across ${totalSources} source(s)`,
    },
    {
      name: "catalog-matched-sources-are-healthy",
      pass: matchedSources.length === 0 || allMatchedSourcesHealthy,
      severity: "warning",
      detail: matchedSources.length === 0
        ? "no catalog-backed source matches were found"
        : `${matchedSources.length} catalog-backed source(s) matched`,
    },
  ];
}

function buildPublishQualityChecks(input: {
  text: string | null;
  category: string;
  confidence: number | undefined;
  supportingCount: number;
}): CheckResult[] {
  if (!input.text) {
    return [
      {
        name: "draft-text-provided",
        pass: false,
        severity: "warning",
        detail: "No draft text provided, so publish-quality checks were skipped",
      },
    ];
  }

  const qualityGate = checkPublishQuality(
    { text: input.text, category: input.category },
    {
      minTextLength: LONG_FORM_CATEGORIES.has(input.category) ? 220 : 200,
    },
  );

  const checks: CheckResult[] = [
    {
      name: "publish-quality-gate",
      pass: qualityGate.pass,
      severity: "blocker",
      detail: qualityGate.reason ?? "quality gate passed",
    },
    {
      name: "draft-references-concrete-numbers",
      pass: /\d/.test(input.text),
      severity: "warning",
      detail: "Attested drafts should cite concrete numbers, counts, or percentages",
    },
    {
      name: "draft-signals-evidence-synthesis",
      pass: !SYNTHESIS_CATEGORIES.has(input.category) || /(because|while|despite|source|signal|evidence|data)/i.test(input.text),
      severity: "warning",
      detail: "Draft should explain why the attested evidence supports the claim",
    },
  ];

  if (input.confidence === undefined) {
    checks.push({
      name: "confidence-is-explicit",
      pass: false,
      severity: "warning",
      detail: "Confidence was not provided",
    });
  } else {
    checks.push({
      name: "confidence-stays-in-practical-range",
      pass: input.confidence >= 50 && input.confidence <= 90,
      severity: "warning",
      detail: `confidence=${input.confidence} (expected 50-90 for attested publish workflows)`,
    });
  }

  if (SYNTHESIS_CATEGORIES.has(input.category)) {
    checks.push({
      name: "analysis-draft-has-supporting-evidence-plan",
      pass: input.supportingCount >= 1,
      severity: "warning",
      detail: `${input.supportingCount} supporting source(s) supplied`,
    });
  }

  return checks;
}

function buildTopicAlignmentChecks(
  topic: string | null,
  primaryAssessment: SourceAssessment,
  recommendedCatalogCandidates: Array<{ id: string; name: string; provider: string; status: string; ratingOverall: number; url: string; score: number }>,
): CheckResult[] {
  if (!topic || recommendedCatalogCandidates.length === 0) {
    return [];
  }

  const matchedId = primaryAssessment.catalogMatch.source?.id ?? null;
  const topCandidate = recommendedCatalogCandidates[0];

  return [
    {
      name: "primary-source-aligns-with-topic-candidates",
      pass: matchedId !== null && recommendedCatalogCandidates.some((candidate) => candidate.id === matchedId),
      severity: "info",
      detail: matchedId
        ? `primary matched ${matchedId}; top topic candidate is ${topCandidate.id}`
        : `primary URL did not map to the top topic candidates (best=${topCandidate.id})`,
    },
  ];
}

function buildRecommendations(input: {
  category: string;
  topic: string | null;
  text: string | null;
  confidence: number | undefined;
  primaryAssessment: SourceAssessment;
  supportingAssessments: SourceAssessment[];
  topicCandidates: Array<{ id: string; name: string; provider: string; status: string; ratingOverall: number; url: string; score: number }>;
  warnings: CheckResult[];
}): string[] {
  const recommendations: string[] = [];

  if (!input.primaryAssessment.catalogMatch.found) {
    recommendations.push("Primary attestation URL is not a clean source-catalog match. Prefer a catalog-backed public JSON endpoint when possible.");
  }

  if (SYNTHESIS_CATEGORIES.has(input.category) && input.supportingAssessments.length === 0) {
    recommendations.push("Add at least one supporting source and pre-attest it with `omni.colony.attest({ url })` before publishing an analysis-style post.");
  }

  const uniqueProviders = new Set(
    [input.primaryAssessment, ...input.supportingAssessments]
      .map((assessment) => assessment.provider)
      .filter((provider): provider is string => typeof provider === "string"),
  );
  if (input.supportingAssessments.length > 0 && uniqueProviders.size < 2) {
    recommendations.push("Diversify the evidence chain across providers instead of stacking multiple URLs from the same provider.");
  }

  if (input.text && !/\d/.test(input.text)) {
    recommendations.push("Add concrete numbers, counts, or percentages to the draft so the attested source actually grounds the claim.");
  }

  if (input.confidence === undefined) {
    recommendations.push("Set an explicit confidence value so the publish path gets the scoring bonus and the post communicates conviction honestly.");
  }

  if (input.topic && input.topicCandidates.length > 0 && !input.primaryAssessment.catalogMatch.found) {
    const top = input.topicCandidates[0];
    recommendations.push(`For topic "${input.topic}", the best catalog-backed DAHR candidate was ${top.name} (${top.provider}) at ${top.url}.`);
  }

  if (input.warnings.some((warning) => warning.name === "analysis-style-post-has-supporting-sources")) {
    recommendations.push("Treat a single attested URL as the floor, not the ideal, for synthesis-style posts.");
  }

  return recommendations;
}

async function assessUrl(
  url: string,
  allowInsecure: boolean,
  sourceView: WorkflowSourceView,
  validateUrlFn: (url: string, opts?: UrlValidationOptions) => Promise<UrlValidationResult>,
): Promise<SourceAssessment> {
  const parsed = tryParseUrl(url);
  const catalogMatches = parsed ? rankCatalogMatches(url, sourceView.sources) : [];
  const bestMatch = catalogMatches[0];
  const urlCheck = await validateUrlFn(url, { allowInsecure });
  const checks: CheckResult[] = [];
  const inferredResponseFormat = bestMatch?.source.responseFormat ?? inferResponseFormatFromUrl(url);

  checks.push({
    name: "url-is-ssrf-safe",
    pass: urlCheck.valid,
    severity: "blocker",
    detail: urlCheck.valid ? "URL passed SSRF validation" : (urlCheck.reason ?? "URL validation failed"),
  });

  if (bestMatch) {
    checks.push({
      name: "catalog-match-found",
      pass: true,
      severity: "info",
      detail: `${bestMatch.source.name} (${bestMatch.source.provider}) score=${bestMatch.score}`,
    });
    checks.push({
      name: "catalog-source-is-dahr-safe",
      pass: bestMatch.source.dahr_safe === true,
      severity: "blocker",
      detail: `dahr_safe=${String(bestMatch.source.dahr_safe)}`,
    });
    checks.push({
      name: "catalog-source-returns-json",
      pass: bestMatch.source.responseFormat === "json",
      severity: "blocker",
      detail: `responseFormat=${bestMatch.source.responseFormat}`,
    });
    checks.push({
      name: "catalog-source-health-is-acceptable",
      pass: bestMatch.source.status === "active" && bestMatch.source.rating.overall >= 50,
      severity: "warning",
      detail: `status=${bestMatch.source.status}, rating=${bestMatch.source.rating.overall}`,
    });
    checks.push({
      name: "catalog-source-trust-tier-is-not-experimental",
      pass: bestMatch.source.trustTier === "official"
        || bestMatch.source.trustTier === "established"
        || bestMatch.source.rating.overall >= 75,
      severity: "warning",
      detail: `trustTier=${bestMatch.source.trustTier}`,
    });
  } else {
    checks.push({
      name: "catalog-match-found",
      pass: false,
      severity: "warning",
      detail: "No bundled source-catalog match was found for this URL",
    });
    checks.push({
      name: "uncatalogued-source-appears-json-shaped",
      pass: inferredResponseFormat === "json",
      severity: inferredResponseFormat === "json" ? "warning" : "blocker",
      detail: `fallback response format heuristic=${inferredResponseFormat}`,
    });
  }

  return {
    url,
    hostname: parsed?.hostname ?? null,
    provider: parsed ? inferProvider(url) : null,
    urlValidation: urlCheck.valid
      ? { ok: true }
      : { ok: false, reason: urlCheck.reason ?? "URL validation failed" },
    catalogMatch: bestMatch
      ? {
          found: true,
          source: {
            id: bestMatch.source.id,
            name: bestMatch.source.name,
            provider: bestMatch.source.provider,
            status: bestMatch.source.status,
            trustTier: bestMatch.source.trustTier,
            responseFormat: bestMatch.source.responseFormat,
            dahrSafe: bestMatch.source.dahr_safe === true,
            tlsnSafe: bestMatch.source.tlsn_safe === true,
            ratingOverall: bestMatch.source.rating.overall,
            note: bestMatch.source.note ?? null,
          },
          score: bestMatch.score,
        }
      : { found: false },
    checks,
  };
}

function inferResponseFormatFromUrl(url: string): "json" | "xml" | "rss" | "html" {
  const lower = url.toLowerCase();
  if (lower.includes("/rss") || lower.endsWith(".rss")) return "rss";
  if (lower.endsWith(".xml") || lower.includes("/atom") || lower.includes("/feed.xml")) return "xml";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return "json";
}

function rankCatalogMatches(url: string, sources: SourceRecordV2[]): CatalogMatch[] {
  const parsed = tryParseUrl(url);
  if (!parsed) return [];

  const actualProvider = inferProvider(url);
  const actualPathSegments = parsed.pathname.split("/").filter(Boolean);
  const actualQueryKeys = new Set(Array.from(parsed.searchParams.keys()));

  const matches = sources.map((source) => {
    const template = parseTemplateUrl(source.url);
    if (!template) return null;

    let score = 0;
    const providerMatches = source.provider === actualProvider;
    const hostMatches = template.hostname === parsed.hostname;
    if (hostMatches) score += 30;
    if (providerMatches) score += 15;

    const staticPathSegments = template.pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => !segment.includes("placeholder"));
    const staticPathMatches = staticPathSegments.filter((segment) => actualPathSegments.includes(segment)).length;
    score += staticPathMatches * 4;

    const staticQueryKeys = Array.from(template.searchParams.keys());
    const staticQueryMatches = staticQueryKeys.filter((key) => actualQueryKeys.has(key)).length;
    score += staticQueryMatches * 2;

    if (!hostMatches && !providerMatches) return null;
    if (staticPathMatches === 0 && staticQueryMatches === 0) return null;

    return {
      source,
      score,
      hostMatches,
      providerMatches,
      staticPathMatches,
      staticQueryMatches,
    };
  }).filter((match): match is CatalogMatch => match !== null);

  return matches.sort((left, right) =>
    right.score - left.score
    || Number(right.hostMatches) - Number(left.hostMatches)
    || right.staticPathMatches - left.staticPathMatches
    || right.staticQueryMatches - left.staticQueryMatches
    || right.source.rating.overall - left.source.rating.overall,
  );
}

function parseTemplateUrl(url: string): URL | null {
  try {
    return new URL(url.replace(/\{[^}]+\}/g, "placeholder"));
  } catch {
    return null;
  }
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
