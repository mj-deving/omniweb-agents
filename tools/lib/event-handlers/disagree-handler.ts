/**
 * DisagreeHandler — log high-disagree posts for next session's review.
 *
 * Pure handler: does NOT attempt real-time remediation (no retract/edit API).
 * Logs to observations for the next scheduled REVIEW phase to incorporate.
 */

import type { AgentEvent, EventAction, EventHandler } from "../../../core/types.js";
import type { DisagreePost } from "../event-sources/disagree-monitor.js";

/**
 * Create a disagree event handler.
 *
 * Strategy: log the high-disagree finding. The next cron session's REVIEW
 * phase will pick this up from observations and propose improvements.
 */
export function createDisagreeHandler(): EventHandler {
  return {
    name: "disagree-handler",
    eventTypes: ["high_disagree"],

    async handle(event: AgentEvent): Promise<EventAction | null> {
      const post = event.payload as DisagreePost;

      return {
        type: "log_only",
        params: {
          reason: "high disagree ratio detected",
          txHash: post.txHash,
          disagreeRatio: post.disagreeRatio,
          agreeCount: post.agreeCount,
          disagreeCount: post.disagreeCount,
          textPreview: post.text.slice(0, 100),
          actionRequired: "review in next scheduled session",
        },
      };
    },
  };
}
