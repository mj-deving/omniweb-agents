/**
 * TX Simulation Gate — dry-run transactions via eth_call before broadcast.
 *
 * Uses the standard EVM eth_call RPC method to simulate a transaction
 * without actually submitting it. Detects reverts before spending real DEM.
 *
 * GRACEFUL DEGRADATION: If the RPC is unavailable, times out, or returns
 * a malformed response, the simulation returns { success: true, warning }
 * so the caller can proceed with the real transaction. Simulation failures
 * must never block transactions — they are advisory only.
 */

export interface SimulationResult {
  success: boolean;
  error?: string;
  warning?: string;
  gasEstimate?: bigint;
}

export interface SimulationOptions {
  rpcUrl: string;
  from: string;
  to: string;
  data: string;
  value?: string;
  /** RPC call timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Simulate a transaction via eth_call.
 *
 * @param opts - Transaction parameters for simulation
 * @param fetchImpl - Optional fetch implementation (for testing)
 * @returns SimulationResult — success: false only on confirmed revert
 */
export async function simulateTransaction(
  opts: SimulationOptions,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<SimulationResult> {
  const { rpcUrl, from, to, data, value, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  // Build eth_call params — omit value if not provided
  const txParams: Record<string, string> = { from, to, data };
  if (value !== undefined) {
    txParams.value = value;
  }

  const rpcPayload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [txParams, "latest"],
  };

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (err) {
    // Network error, timeout, DNS failure — degrade gracefully
    const message = err instanceof Error ? err.message : String(err);
    return { success: true, warning: `Simulation unavailable: ${message}` };
  }

  // HTTP-level error (502, 503, etc.) — degrade gracefully
  if (!response.ok) {
    return {
      success: true,
      warning: `Simulation RPC returned HTTP ${response.status} — proceeding without simulation`,
    };
  }

  // Parse JSON response
  let rpcResult: { result?: string; error?: { code: number; message: string; data?: string } };
  try {
    rpcResult = await response.json();
  } catch {
    return {
      success: true,
      warning: "Simulation RPC returned malformed response — proceeding without simulation",
    };
  }

  // Check for RPC error (revert)
  if (rpcResult.error) {
    const errMsg = rpcResult.error.data
      ? `${rpcResult.error.message} (data: ${rpcResult.error.data})`
      : rpcResult.error.message;
    return { success: false, error: errMsg };
  }

  // No result AND no error — ambiguous response, degrade gracefully
  if (rpcResult.result === undefined) {
    return {
      success: true,
      warning: "Simulation RPC returned ambiguous response (no result or error field)",
    };
  }

  // Success — eth_call returned data without revert
  return { success: true };
}
