/**
 * ReplyHandler — evaluate a reply to agent's post and decide engagement.
 *
 * Pure handler: receives reply event, returns an EventAction or null.
 * No side effects — the action executor handles rate limits and publishing.
 */

import type { AgentEvent, EventAction, EventHandler } from "../../../core/types.js";
import type { ReplyPost } from "../event-sources/social-replies.js";

/**
 * Create a reply event handler.
 *
 * Strategy: agree with substantive replies (>50 chars), skip short ones.
 * Future: LLM-based reply evaluation for more nuanced engagement.
 */
export function createReplyHandler(): EventHandler {
  return {
    name: "reply-handler",
    eventTypes: ["reply"],

    async handle(event: AgentEvent): Promise<EventAction | null> {
      const reply = event.payload as ReplyPost;

      // Skip very short replies (likely noise)
      if (reply.text.length < 30) {
        return { type: "log_only", params: { reason: "reply too short", txHash: reply.txHash } };
      }

      // Default: agree with substantive replies
      return {
        type: "react",
        params: {
          txHash: reply.txHash,
          reaction: "agree",
          reason: `Substantive reply from ${reply.author.slice(0, 10)}`,
        },
      };
    },
  };
}
