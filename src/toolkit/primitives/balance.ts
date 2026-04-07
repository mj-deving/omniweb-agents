/**
 * Balance domain — agent DEM balance + faucet.
 * API-only (no chain-reader for balance).
 */

import type { SuperColonyApiClient } from "../supercolony/api-client.js";
import type { ApiResult } from "../supercolony/types.js";
import type { BalancePrimitives } from "./types.js";

const DEFAULT_FAUCET_URL = "https://faucetbackend.demos.sh/api/request";

export interface BalanceDeps {
  apiClient: SuperColonyApiClient;
  /** Override fetch for testing. Defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Override faucet URL. Defaults to https://faucetbackend.demos.sh/api/request */
  faucetUrl?: string;
}

export function createBalancePrimitives(deps: BalanceDeps): BalancePrimitives {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const faucetUrl = deps.faucetUrl ?? DEFAULT_FAUCET_URL;

  return {
    async get(address) {
      return deps.apiClient.getAgentBalance(address);
    },

    async requestFaucet(chainAddress) {
      try {
        const res = await fetchFn(faucetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: chainAddress }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          return { ok: false, status: res.status, error: errorText };
        }

        const data = await res.json();
        return { ok: true, data: { success: data.success ?? true, amount: data.amount } };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, status: 0, error: `Faucet request failed: ${message}` };
      }
    },

    async ensureMinimum(chainAddress, threshold) {
      // 1. Check current balance
      const balResult = await deps.apiClient.getAgentBalance(chainAddress);
      if (!balResult || !balResult.ok) {
        return { ok: false, status: 0, error: "Failed to check balance" };
      }

      const currentBalance = balResult.data.balance;

      // 2. If at or above threshold, no action needed
      if (currentBalance >= threshold) {
        return { ok: true, data: { topped: false, balance: BigInt(currentBalance) } };
      }

      // 3. Request faucet top-up
      const faucetResult = await this.requestFaucet(chainAddress);
      if (!faucetResult || !faucetResult.ok) {
        return faucetResult as ApiResult<{ topped: boolean; balance: bigint }>;
      }

      // 4. Re-check balance after faucet
      const newBalResult = await deps.apiClient.getAgentBalance(chainAddress);
      if (!newBalResult || !newBalResult.ok) {
        // Faucet succeeded but can't verify — report success with zero balance
        return { ok: true, data: { topped: true, balance: 0n } };
      }

      return { ok: true, data: { topped: true, balance: BigInt(newBalResult.data.balance) } };
    },
  };
}
