export type ResearchMatrixFamily =
  | "funding-structure"
  | "etf-flows"
  | "spot-momentum"
  | "network-activity"
  | "stablecoin-supply"
  | "macro-liquidity"
  | "vix-credit";

export interface ResearchMatrixBroadcastSelectionInput {
  requestedFamily: ResearchMatrixFamily | null;
  fallbackFamilies: ResearchMatrixFamily[];
  readyFamilies: ResearchMatrixFamily[];
}

export interface ResearchMatrixBroadcastSelection {
  requestedFamily: ResearchMatrixFamily | null;
  selectedFamily: ResearchMatrixFamily | null;
  usedFallback: boolean;
}

export interface ResearchMatrixOpportunityCandidate {
  topic: string;
  sourceProfile: {
    family: ResearchMatrixFamily | string;
    primarySourceIds?: string[];
  };
}

export function selectResearchMatrixBroadcastFamily(
  input: ResearchMatrixBroadcastSelectionInput,
): ResearchMatrixBroadcastSelection {
  const requestedFamily = input.requestedFamily ?? null;
  const ready = new Set(input.readyFamilies);
  if (!requestedFamily) {
    return {
      requestedFamily,
      selectedFamily: null,
      usedFallback: false,
    };
  }

  if (ready.has(requestedFamily)) {
    return {
      requestedFamily,
      selectedFamily: requestedFamily,
      usedFallback: false,
    };
  }

  for (const family of dedupeFamilies(input.fallbackFamilies)) {
    if (family === requestedFamily) continue;
    if (ready.has(family)) {
      return {
        requestedFamily,
        selectedFamily: family,
        usedFallback: true,
      };
    }
  }

  return {
    requestedFamily,
    selectedFamily: null,
    usedFallback: false,
  };
}

function dedupeFamilies(families: ResearchMatrixFamily[]): ResearchMatrixFamily[] {
  const seen = new Set<ResearchMatrixFamily>();
  const deduped: ResearchMatrixFamily[] = [];
  for (const family of families) {
    if (seen.has(family)) continue;
    seen.add(family);
    deduped.push(family);
  }
  return deduped;
}

export function buildResearchMatrixEvaluationFamilies(input: {
  requestedFamily: ResearchMatrixFamily | null;
  fallbackFamilies: ResearchMatrixFamily[];
  supportedFamilies: ResearchMatrixFamily[];
}): ResearchMatrixFamily[] {
  if (!input.requestedFamily) {
    return [...input.supportedFamilies];
  }

  const allowed = new Set(input.supportedFamilies);
  return dedupeFamilies([input.requestedFamily, ...input.fallbackFamilies])
    .filter((family) => allowed.has(family));
}

export function chooseResearchMatrixOpportunity<T extends ResearchMatrixOpportunityCandidate>(
  family: ResearchMatrixFamily,
  opportunities: T[],
): T | null {
  const relevant = opportunities.filter((opportunity) => opportunity.sourceProfile.family === family);
  const preferred = family === "macro-liquidity"
    ? relevant.filter((opportunity) => hasMacroBalanceSheetSource(opportunity))
    : relevant;
  const pool = preferred.length > 0 ? preferred : relevant;

  let best: T | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const opportunity of pool) {
    const score = scoreResearchMatrixOpportunity(family, opportunity.topic);
    if (score > bestScore) {
      best = opportunity;
      bestScore = score;
    }
  }

  return best;
}

function scoreResearchMatrixOpportunity(
  family: ResearchMatrixFamily,
  topic: string,
): number {
  const normalized = topic.trim().toLowerCase();
  let score = 0;

  if (family === "macro-liquidity") {
    if (containsAny(normalized, ["walcl", "rrp", "rrpontsyd", "pivot", "balance sheet", "balance-sheet"])) {
      score += 100;
    }
    if (containsAny(normalized, ["federal reserve", "fed", "stealth easing", "liquidity"])) {
      score += 40;
    }
    if (containsAny(normalized, ["oil", "energy", "mining", "russia", "capital flight", "buidl", "tokenized treasury"])) {
      score -= 120;
    }
  }

  return score;
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function hasMacroBalanceSheetSource(opportunity: ResearchMatrixOpportunityCandidate): boolean {
  const ids = opportunity.sourceProfile.primarySourceIds ?? [];
  return ids.includes("fred-graph-walcl") || ids.includes("fred-graph-rrp");
}
