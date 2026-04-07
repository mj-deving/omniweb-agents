/**
 * Balance domain — agent DEM balance.
 * API-only (no chain-reader for balance).
 */

import type { SuperColonyApiClient } from "../supercolony/api-client.js";
import type { BalancePrimitives } from "./types.js";

/** Faucet endpoint for DEM funding requests. */
const FAUCET_URL = "https://faucetbackend.demos.sh/api/request";

/** Minimum cooldown between faucet requests (ms). */
export const FAUCET_COOLDOWN_MS = 60_000;

/** Validate 0x-prefixed hex address with at least 40 hex characters. */
export function validateAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40,}$/.test(address);
}

/** Validate threshold is a positive bigint. */
export function validateThreshold(threshold: bigint): boolean {
  return threshold > 0n;
}

type FaucetResult = { ok: true } | { ok: false; error: string };
type EnsureResult = { ok: true; topped: boolean; balance: bigint } | { ok: false; error: string };

export function createBalancePrimitives(deps: { apiClient: SuperColonyApiClient }): BalancePrimitives {
  let lastFaucetCallMs = 0;

  return {
    async get(address) {
      return deps.apiClient.getAgentBalance(address);
    },

    async requestFaucet(address: string): Promise<FaucetResult> {
      if (!validateAddress(address)) {
        return { ok: false, error: "Invalid address format: must be 0x-prefixed hex with 40+ chars" };
      }

      const now = Date.now();
      if (now - lastFaucetCallMs < FAUCET_COOLDOWN_MS) {
        return { ok: false, error: `Faucet cooldown active: wait ${Math.ceil((FAUCET_COOLDOWN_MS - (now - lastFaucetCallMs)) / 1000)}s` };
      }

      try {
        const response = await globalThis.fetch(FAUCET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
          signal: AbortSignal.timeout(15_000),
        });

        const json = (await response.json()) as Record<string, unknown>;

        if (json.success !== true) {
          return { ok: false, error: "Faucet response did not contain success: true" };
        }

        lastFaucetCallMs = Date.now();
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { ok: false, error: `Faucet network error: ${msg}` };
      }
    },

    async ensureMinimum(address: string, threshold: bigint): Promise<EnsureResult> {
      if (!validateAddress(address)) {
        return { ok: false, error: "Invalid address format: must be 0x-prefixed hex with 40+ chars" };
      }
      if (!validateThreshold(threshold)) {
        return { ok: false, error: "Invalid threshold: must be positive" };
      }

      // Check current balance
      const balanceResult = await deps.apiClient.getAgentBalance(address);
      if (!balanceResult?.ok) {
        return { ok: false, error: "Failed to check current balance" };
      }

      const currentBalance = BigInt(Math.floor(balanceResult.data.balance));
      if (currentBalance >= threshold) {
        return { ok: true, topped: false, balance: currentBalance };
      }

      // Balance insufficient — request faucet
      const faucetResult = await this.requestFaucet(address);
      if (!faucetResult.ok) {
        return { ok: false, error: `Faucet request failed: ${faucetResult.error}` };
      }

      // Verify post-faucet balance
      const postResult = await deps.apiClient.getAgentBalance(address);
      if (!postResult?.ok) {
        return { ok: false, error: "Could not verify post-faucet balance" };
      }

      const newBalance = BigInt(Math.floor(postResult.data.balance));
      return { ok: true, topped: true, balance: newBalance };
    },
  };
}
