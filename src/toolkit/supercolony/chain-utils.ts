/**
 * Chain utility wrappers -- faucet funding and wallet generation.
 *
 * These wrap SDK/RPC operations that are not part of the Identities class
 * but are commonly needed for agent bootstrapping.
 */

import type { Demos } from "@kynesyslabs/demosdk/websdk";

/**
 * Request testnet faucet funding for an address.
 * Calls the faucet RPC endpoint directly.
 * Returns null if faucet is unavailable or request fails.
 */
export async function requestFaucetFunding(
  rpcUrl: string,
  address: string,
): Promise<{ txHash: string; amount: number } | null> {
  try {
    const response = await globalThis.fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "faucet",
        params: [address],
        id: 1,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const json = (await response.json()) as {
      result?: { txHash?: string; amount?: number };
      error?: { message?: string };
    };

    if (json.error || !json.result) return null;
    const { txHash, amount } = json.result;
    if (!txHash) return null;
    return { txHash, amount: amount ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Generate a new mnemonic phrase using the SDK.
 * Wraps demos.newMnemonic() for convenience.
 */
export function generateMnemonic(demos: Demos): string {
  return demos.newMnemonic();
}
