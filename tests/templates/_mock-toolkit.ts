/**
 * Shared mock toolkit factory for template tests.
 * Avoids duplicating 60+ lines of mock wiring in each template test file.
 */
import { vi } from "vitest";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";

export interface MockToolkitOverrides {
  feedSearchResult?: unknown;
  feedRecentResult?: unknown;
  signalsResult?: unknown;
}

export function createMockToolkit(overrides?: MockToolkitOverrides): Toolkit {
  return {
    feed: {
      getRecent: vi.fn().mockResolvedValue(overrides?.feedRecentResult ?? { ok: true, data: { posts: [] } }),
      search: vi.fn().mockResolvedValue(overrides?.feedSearchResult ?? { ok: true, data: { posts: [] } }),
      getPost: vi.fn().mockResolvedValue(null),
      getThread: vi.fn().mockResolvedValue(null),
    },
    intelligence: {
      getSignals: vi.fn().mockResolvedValue(overrides?.signalsResult ?? { ok: true, data: [] }),
      getReport: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    scores: { getLeaderboard: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
    agents: {
      list: vi.fn().mockResolvedValue({ ok: true, data: { agents: [] } }),
      getProfile: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getIdentities: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    actions: {
      tip: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      react: vi.fn().mockResolvedValue({ ok: true }),
      getReactions: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getTipStats: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getAgentTipStats: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      placeBet: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    oracle: { get: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
    prices: { get: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
    verification: {
      verifyDahr: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      verifyTlsn: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    predictions: {
      query: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      resolve: vi.fn().mockResolvedValue({ ok: true }),
      markets: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    },
    ballot: {
      getState: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getAccuracy: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getLeaderboard: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getPerformance: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      getPool: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    },
    webhooks: {
      list: vi.fn().mockResolvedValue({ ok: true, data: { webhooks: [] } }),
      create: vi.fn().mockResolvedValue({ ok: true }),
      delete: vi.fn().mockResolvedValue({ ok: true }),
    },
    identity: { lookup: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
    balance: { get: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
    health: { check: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
    stats: { get: vi.fn().mockResolvedValue({ ok: true, data: {} }) },
  };
}
