import { getSourceResponse } from "./source-cache.js";
import type { ColonyDatabase } from "./schema.js";

const CIRCUIT_BREAKER_THRESHOLD = 3;

export interface AvailableEvidence {
  sourceId: string;
  subject: string;
  metrics: string[];
  richness: number;
  freshness: number;
  stale: boolean;
}

export function computeAvailableEvidence(
  db: ColonyDatabase,
  catalogSources: Array<{ id: string; topics: string[]; domainTags: string[] }>,
  now = new Date(),
): AvailableEvidence[] {
  const evidence: AvailableEvidence[] = [];

  for (const source of catalogSources) {
    const cached = getSourceResponse(db, source.id);
    if (!cached) continue;
    if (cached.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) continue;
    if (cached.responseStatus < 200 || cached.responseStatus >= 300) continue;

    const freshness = Math.max(0, Math.floor((now.getTime() - Date.parse(cached.lastFetchedAt)) / 1000));
    if (freshness > cached.ttlSeconds) continue;

    // Index by all topics and domain tags — not just topics[0]
    // so gap topic tokens like "bitcoin" match source topics ["crypto", "bitcoin"]
    const subjects = new Set<string>();
    for (const t of source.topics) subjects.add(t.toLowerCase());
    for (const t of source.domainTags) subjects.add(t.toLowerCase());
    if (subjects.size === 0) subjects.add(source.id);

    for (const subject of subjects) {
      evidence.push({
        sourceId: source.id,
        subject,
        metrics: [...source.domainTags],
        richness: cached.responseSize,
        freshness,
        stale: false,
      });
    }
  }

  return evidence.sort((left, right) =>
    left.freshness - right.freshness
    || right.richness - left.richness
    || left.sourceId.localeCompare(right.sourceId)
  );
}
