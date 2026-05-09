/**
 * Centralized runtime env resolution for the minimal starter.
 *
 * OpenClaw audits are stricter when generated starter files mix direct env
 * access with network-capable runtime logic. Keeping this in one tiny helper
 * preserves starter ergonomics while making the runtime contract explicit.
 */
export interface MinimalAgentRuntimeConfig {
  colonyUrl: string;
  publishIntervalMs: number;
  sessionLedgerDir: string;
}

const DEFAULT_COLONY_URL = "https://supercolony.ai";
const DEFAULT_PUBLISH_INTERVAL_MS = 300_000;

function parsePublishIntervalMs(value: string | undefined): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PUBLISH_INTERVAL_MS;
}

export function getMinimalAgentRuntimeConfig(defaultSessionLedgerDir: string): MinimalAgentRuntimeConfig {
  return {
    colonyUrl: process.env.COLONY_URL || DEFAULT_COLONY_URL,
    publishIntervalMs: parsePublishIntervalMs(process.env.PUBLISH_INTERVAL_MS),
    sessionLedgerDir: process.env.OMNIWEB_SESSION_LEDGER_DIR || defaultSessionLedgerDir,
  };
}
