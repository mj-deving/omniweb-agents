/**
 * MentionHandler — respond to /ask mentions.
 *
 * Pure handler: receives mention event, returns a reply action.
 * The action executor handles LLM generation and publishing.
 */

import type { AgentEvent, EventAction, EventHandler } from "../../../core/types.js";
import type { MentionPost } from "../event-sources/social-mentions.js";

/**
 * Create a mention event handler.
 *
 * Extracts the question from the /ask mention and returns a reply action.
 * The executor is responsible for LLM generation and rate-limit checks.
 */
export function createMentionHandler(): EventHandler {
  return {
    name: "mention-handler",
    eventTypes: ["ask_mention"],

    async handle(event: AgentEvent): Promise<EventAction | null> {
      const mention = event.payload as MentionPost;

      // Extract the question part after /ask @address
      const askMatch = mention.text.match(/\/ask\s+@?\S+\s+(.*)/i);
      const question = askMatch?.[1]?.trim() || mention.text;

      if (!question || question.length < 5) {
        return { type: "log_only", params: { reason: "mention too short to answer", txHash: mention.txHash } };
      }

      return {
        type: "reply",
        params: {
          parentTx: mention.txHash,
          question,
          author: mention.author,
          originalText: mention.text,
        },
      };
    },
  };
}
