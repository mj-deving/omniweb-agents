import { describe, expect, it } from "vitest";

import type {
  AgentSourceView,
  SourceIndex,
  SourceRecordV2,
} from "../../../src/toolkit/sources/catalog.js";
import {
  resolveSourceSelectionForSourceId,
  selectSourceForTopicV2,
} from "../../../src/toolkit/sources/policy.js";

function makeSourceRecord(overrides: Partial<SourceRecordV2> = {}): SourceRecordV2 {
  return {
    id: overrides.id ?? "macro-reserve-source",
    name: overrides.name ?? "Macro Reserve Source",
    provider: overrides.provider ?? "generic",
    url: overrides.url ?? "https://example.com/{query}",
    urlPattern: overrides.urlPattern ?? "example.com/{VAR}",
    topics: overrides.topics ?? ["reserve"],
    tlsn_safe: overrides.tlsn_safe ?? false,
    dahr_safe: overrides.dahr_safe ?? true,
    max_response_kb: overrides.max_response_kb ?? 16,
    note: overrides.note,
    topicAliases: overrides.topicAliases ?? [],
    domainTags: overrides.domainTags ?? ["regulation"],
    responseFormat: overrides.responseFormat ?? "json",
    scope: overrides.scope ?? {
      visibility: "global",
      importedFrom: ["sentinel"],
    },
    runtime: overrides.runtime ?? {
      timeoutMs: 5000,
      retry: {
        maxAttempts: 1,
        backoffMs: 0,
        retryOn: [],
      },
    },
    trustTier: overrides.trustTier ?? "community",
    status: overrides.status ?? "quarantined",
    rating: overrides.rating ?? {
      overall: 72,
      uptime: 70,
      relevance: 75,
      freshness: 70,
      sizeStability: 70,
      engagement: 70,
      trust: 70,
      testCount: 1,
      successCount: 1,
      consecutiveFailures: 0,
    },
    lifecycle: overrides.lifecycle ?? {
      discoveredAt: "2026-01-01T00:00:00.000Z",
      discoveredBy: "manual",
    },
  };
}

function makeSourceView(source: SourceRecordV2): AgentSourceView {
  const byId = new Map([[source.id, source]]);
  const byTopicToken = new Map<string, Set<string>>(
    (source.topics ?? []).map((token) => [token.toLowerCase(), new Set([source.id])]),
  );
  const byDomainTag = new Map<string, Set<string>>(
    source.domainTags.map((tag) => [tag.toLowerCase(), new Set([source.id])]),
  );
  const index: SourceIndex = {
    byId,
    byTopicToken,
    byDomainTag,
    byProvider: new Map([[source.provider, new Set([source.id])]]),
    byAgent: new Map([["sentinel", new Set([source.id])]]),
    byMethod: {
      TLSN: new Set(source.tlsn_safe ? [source.id] : []),
      DAHR: new Set(source.dahr_safe ? [source.id] : []),
    },
  };

  return {
    agent: "sentinel",
    catalogVersion: 2,
    sources: [source],
    index,
  };
}

describe("source policy shared helpers", () => {
  it("uses topic-vocabulary expansion when selecting sources by domain tag", () => {
    const source = makeSourceRecord();
    const sourceView = makeSourceView(source);

    const ranked = selectSourceForTopicV2(
      "USDC regulatory reserve risk",
      sourceView,
      "DAHR",
      5,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.source.id).toBe(source.id);
  });

  it("can resolve a specific source id through the shared URL-resolution path", () => {
    const source = makeSourceRecord({
      id: "preferred-direct",
      url: "https://example.com/{asset}",
      domainTags: ["macro"],
      topics: ["reserve"],
    });
    const sourceView = makeSourceView(source);

    const selection = resolveSourceSelectionForSourceId(
      "USDC regulatory reserve risk",
      sourceView,
      source.id,
      "DAHR",
    );

    expect(selection).not.toBeNull();
    expect(selection?.source.id).toBe(source.id);
    expect(selection?.url).toContain("usd-coin");
  });
});
