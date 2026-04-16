/**
 * OpinionRequestSource — detects unreplied OPINION requests.
 *
 * Mirrors the official starter pattern:
 * 1. watch the live stream for new OPINION posts
 * 2. poll/search for missed OPINION posts
 * 3. skip opinion threads we've already replied to
 */

import type { AgentEvent, EventSource } from "../../types.js";
import { extractLatestWatermark } from "./watermark-utils.js";

export interface OpinionRequest {
  txHash: string;
  author: string;
  timestamp: number;
  text: string;
  category: "OPINION";
  assets: string[];
  tags: string[];
}

export interface OpinionThreadPost {
  author: string;
}

export interface OpinionRequestSnapshot {
  timestamp: number;
  opinions: OpinionRequest[];
}

export interface OpinionRequestSourceConfig {
  fetchOpinions: () => Promise<OpinionRequest[]>;
  fetchThread: (txHash: string) => Promise<OpinionThreadPost[]>;
  agentAddress: string;
}

export function createOpinionRequestSource(
  config: OpinionRequestSourceConfig,
): EventSource<OpinionRequestSnapshot> {
  const agentAddress = config.agentAddress.toLowerCase();

  return {
    id: "social:opinions",
    description: "Detects OPINION requests we have not replied to yet",
    eventTypes: ["opinion_request"],

    async poll(): Promise<OpinionRequestSnapshot> {
      const opinions = (await config.fetchOpinions())
        .filter((post) => post.txHash && post.text)
        .filter((post) => post.author.toLowerCase() !== agentAddress);

      const threadChecks = await Promise.allSettled(
        opinions.map(async (opinion) => {
          const thread = await config.fetchThread(opinion.txHash);
          const alreadyReplied = thread.some(
            (post) => String(post.author || "").toLowerCase() === agentAddress,
          );
          return alreadyReplied ? null : opinion;
        }),
      );

      return {
        timestamp: Date.now(),
        opinions: threadChecks
          .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : [])),
      };
    },

    diff(prev: OpinionRequestSnapshot | null, curr: OpinionRequestSnapshot): AgentEvent<OpinionRequest>[] {
      const prevHashes = new Set(prev?.opinions.map((opinion) => opinion.txHash) ?? []);
      return curr.opinions
        .filter((opinion) => !prevHashes.has(opinion.txHash))
        .map((opinion) => ({
          id: `social:opinions:${opinion.timestamp}:${opinion.txHash}`,
          sourceId: "social:opinions",
          type: "opinion_request",
          detectedAt: Date.now(),
          payload: opinion,
          watermark: { txHash: opinion.txHash, timestamp: opinion.timestamp },
        }));
    },

    extractWatermark(snapshot: OpinionRequestSnapshot): unknown {
      return extractLatestWatermark(snapshot.opinions, (opinion) => ({
        txHash: opinion.txHash,
        timestamp: opinion.timestamp,
      }));
    },
  };
}
