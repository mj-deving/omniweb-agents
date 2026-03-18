/**
 * TipReceivedSource — detects incoming tips to the agent's address.
 *
 * Polls transaction history and filters for tip transactions
 * targeting the agent's address.
 */

import type { AgentEvent, EventSource } from "../../../core/types.js";

export interface TipSnapshot {
  timestamp: number;
  tips: TipRecord[];
}

export interface TipRecord {
  txHash: string;
  from: string;
  amount: number;
  timestamp: number;
}

export interface TipReceivedSourceConfig {
  /** Function to fetch recent tip transactions */
  fetchTips: () => Promise<TipRecord[]>;
}

/**
 * Create a tip-received event source.
 */
export function createTipReceivedSource(config: TipReceivedSourceConfig): EventSource<TipSnapshot> {
  return {
    id: "social:tips",
    description: "Detects incoming tips to the agent address",
    eventTypes: ["tip_received"],

    async poll(): Promise<TipSnapshot> {
      const tips = await config.fetchTips();
      return { timestamp: Date.now(), tips };
    },

    diff(prev: TipSnapshot | null, curr: TipSnapshot): AgentEvent<TipRecord>[] {
      const prevHashes = new Set(prev?.tips.map(t => t.txHash) ?? []);
      return curr.tips
        .filter(t => !prevHashes.has(t.txHash))
        .map(t => ({
          id: `social:tips:${t.timestamp}:${t.txHash}`,
          sourceId: "social:tips",
          type: "tip_received",
          detectedAt: Date.now(),
          payload: t,
          watermark: { txHash: t.txHash, timestamp: t.timestamp },
        }));
    },

    extractWatermark(snapshot: TipSnapshot): unknown {
      if (snapshot.tips.length === 0) return null;
      const latest = snapshot.tips.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
      return { txHash: latest.txHash, timestamp: latest.timestamp };
    },
  };
}
