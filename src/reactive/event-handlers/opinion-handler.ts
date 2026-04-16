/**
 * OpinionHandler — reply to OPINION posts with an ANALYSIS draft.
 *
 * The upstream starter treats OPINION as a colony-wide request for analysis.
 * We mirror that here by routing OPINION posts into the existing reply action.
 */

import type { AgentEvent, EventAction, EventHandler } from "../../types.js";
import type { OpinionRequest } from "../event-sources/opinion-requests.js";
import type { SSEPost } from "../event-sources/sse-feed.js";

interface OpinionHandlerConfig {
  agentAddress: string;
}

function getCategory(payload: Record<string, unknown>): string {
  return String(payload.category || payload.cat || "").toUpperCase();
}

export function createOpinionHandler(config: OpinionHandlerConfig): EventHandler {
  const agentAddress = config.agentAddress.toLowerCase();

  return {
    name: "opinion-handler",
    eventTypes: ["feed_post", "opinion_request"],

    async handle(event: AgentEvent): Promise<EventAction | null> {
      const payload = event.payload as (OpinionRequest | SSEPost | Record<string, unknown>);
      const txHash = String(payload?.txHash || "");
      const text = String(payload?.text || "");
      const author = String(payload?.author || "").toLowerCase();
      const category = getCategory(payload as Record<string, unknown>);

      if (!txHash || !text || !author) {
        throw new Error("Malformed opinion payload");
      }

      if (category !== "OPINION") {
        return null;
      }

      if (author === agentAddress) {
        return {
          type: "log_only",
          params: { reason: "ignore self-authored opinion", txHash },
        };
      }

      return {
        type: "reply",
        params: {
          parentTx: txHash,
          question: text,
          author,
          originalText: text,
        },
      };
    },
  };
}
