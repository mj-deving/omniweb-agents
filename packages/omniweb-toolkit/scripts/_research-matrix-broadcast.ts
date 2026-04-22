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
