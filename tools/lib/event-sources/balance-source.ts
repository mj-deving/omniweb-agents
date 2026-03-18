/**
 * BalanceSource — monitors agent DEM balance and emits alerts.
 *
 * Polls for current balance, emits "low_balance" when below threshold
 * and "income_received" when balance increases between polls.
 *
 * Follows standard EventSource pattern: poll → diff → events.
 */

import type { AgentEvent, EventSource } from "../../../core/types.js";

// ── Types ───────────────────────────────────────────

export interface BalanceSourceConfig {
  /** Low balance threshold in DEM — alert when below */
  lowBalanceThreshold: number;
}

export interface BalanceSnapshot {
  timestamp: number;
  balance: number;
}

export interface BalanceEventPayload {
  balance: number;
  threshold?: number;
  delta?: number;
  timestamp: number;
}

/** Injected function to query DEM balance. */
export type FetchBalanceFn = () => Promise<number>;

// ── Factory ─────────────────────────────────────────

export function createBalanceSource(
  config: BalanceSourceConfig,
  fetchBalance: FetchBalanceFn,
): EventSource<BalanceSnapshot> {
  const { lowBalanceThreshold } = config;
  let lowBalanceAlerted = false;

  return {
    id: "chain:balance",
    description: `Monitor DEM balance, alert below ${lowBalanceThreshold} DEM`,
    eventTypes: ["low_balance", "income_received"],

    async poll(): Promise<BalanceSnapshot> {
      const balance = await fetchBalance();
      return { timestamp: Date.now(), balance };
    },

    diff(prev: BalanceSnapshot | null, curr: BalanceSnapshot): AgentEvent<BalanceEventPayload>[] {
      if (!prev) return []; // Warm-up

      const events: AgentEvent<BalanceEventPayload>[] = [];

      // Low balance alert (emit once until recovered)
      if (curr.balance < lowBalanceThreshold && !lowBalanceAlerted) {
        lowBalanceAlerted = true;
        events.push({
          id: `chain:balance:low_balance:${curr.timestamp}`,
          sourceId: "chain:balance",
          type: "low_balance",
          detectedAt: curr.timestamp,
          payload: {
            balance: curr.balance,
            threshold: lowBalanceThreshold,
            timestamp: curr.timestamp,
          },
          watermark: { timestamp: curr.timestamp },
        });
      }

      // Reset alert when balance recovers
      if (curr.balance >= lowBalanceThreshold) {
        lowBalanceAlerted = false;
      }

      // Income detection
      const delta = curr.balance - prev.balance;
      if (delta > 0) {
        events.push({
          id: `chain:balance:income_received:${curr.timestamp}`,
          sourceId: "chain:balance",
          type: "income_received",
          detectedAt: curr.timestamp,
          payload: {
            balance: curr.balance,
            delta,
            timestamp: curr.timestamp,
          },
          watermark: { timestamp: curr.timestamp },
        });
      }

      return events;
    },

    extractWatermark(snapshot: BalanceSnapshot): unknown {
      return { timestamp: snapshot.timestamp, balance: snapshot.balance };
    },
  };
}
