/**
 * TipThanksHandler — acknowledge incoming tips.
 *
 * Pure handler: logs the tip and optionally reacts to the tipper's
 * recent post as a reciprocal gesture.
 */

import type { AgentEvent, EventAction, EventHandler } from "../../../core/types.js";
import type { TipRecord } from "../event-sources/tip-received.js";

/**
 * Create a tip-thanks event handler.
 *
 * Strategy: log all tips, react (agree) to the tipper's most recent post
 * as acknowledgment. The action executor handles the actual reaction.
 */
export function createTipThanksHandler(): EventHandler {
  return {
    name: "tip-thanks-handler",
    eventTypes: ["tip_received"],

    async handle(event: AgentEvent): Promise<EventAction | null> {
      const tip = event.payload as TipRecord;

      // Always log the tip receipt
      return {
        type: "log_only",
        params: {
          reason: "tip received",
          from: tip.from,
          amount: tip.amount,
          txHash: tip.txHash,
          acknowledgment: true,
        },
      };
    },
  };
}
