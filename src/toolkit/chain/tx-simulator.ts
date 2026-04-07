/**
 * TX Simulation Gate — dry-run transactions via eth_call before broadcast.
 *
 * Uses the standard EVM eth_call RPC method to simulate a transaction
 * without actually submitting it. Detects reverts before spending real DEM.
 *
 * FAIL-CLOSED BY DEFAULT: If the RPC is unavailable, times out, or returns
 * a malformed/invalid response, the simulation returns { success: false }
 * so the caller blocks the transaction. This prevents an unavailable or
 * spoofed RPC from auto-approving spending real DEM.
 *
 * Callers that want graceful degradation (non-value-transfer operations)
 * can pass `failOpen: true` to get the old advisory-only behavior.
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
  /**
   * When true, network/HTTP/parse errors return { success: true, warning }
   * instead of blocking the transaction. Default: false (fail-closed).
   *
   * Use failOpen: true only for non-value-transfer operations where
   * simulation is advisory. Money-moving paths MUST use failOpen: false.
   */
  failOpen?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Check that a parsed RPC response has the expected JSON-RPC 2.0 shape. */
function isValidRpcShape(parsed: unknown): parsed is {
  jsonrpc: "2.0";
  id: number;
  result?: string;
  error?: { code: number; message: string; data?: string };
} {
  if (typeof parsed !== "object" || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  if (obj.jsonrpc !== "2.0") return false;
  if (typeof obj.id !== "number") return false;
  return true;
}

/** Check that a result string looks like a hex value (0x prefix). */
function isHexResult(result: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(result);
}

/**
 * Return a degradation result based on the failOpen setting.
 * When failOpen is true, returns { success: true, warning }.
 * When failOpen is false (default), returns { success: false, error }.
 */
function degradeResult(message: string, failOpen: boolean): SimulationResult {
  if (failOpen) {
    return { success: true, warning: message };
  }
  return { success: false, error: `simulation unavailable: ${message}` };
}

/**
 * Simulate a transaction via eth_call.
 *
 * @param opts - Transaction parameters for simulation
 * @param fetchImpl - Optional fetch implementation (for testing)
 * @returns SimulationResult — success: false on confirmed revert OR unavailable simulation (unless failOpen)
 */
export async function simulateTransaction(
  opts: SimulationOptions,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<SimulationResult> {
  const {
    rpcUrl, from, to, data, value,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    failOpen = false,
  } = opts;

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
    // Network error, timeout, DNS failure
    const message = err instanceof Error ? err.message : String(err);
    return degradeResult(`Simulation unavailable: ${message}`, failOpen);
  }

  // HTTP-level error (502, 503, etc.)
  if (!response.ok) {
    return degradeResult(
      `Simulation RPC returned HTTP ${response.status} — proceeding without simulation`,
      failOpen,
    );
  }

  // Parse JSON response
  let rpcResult: unknown;
  try {
    rpcResult = await response.json();
  } catch {
    return degradeResult(
      "Simulation RPC returned malformed response — proceeding without simulation",
      failOpen,
    );
  }

  // Validate RPC response shape: jsonrpc: "2.0", numeric id
  if (!isValidRpcShape(rpcResult)) {
    return degradeResult(
      "Simulation RPC returned invalid JSON-RPC shape — missing jsonrpc 2.0 or numeric id",
      failOpen,
    );
  }

  // Check for RPC error (revert) — always fail on confirmed reverts regardless of failOpen
  if (rpcResult.error) {
    const errMsg = rpcResult.error.data
      ? `${rpcResult.error.message} (data: ${rpcResult.error.data})`
      : rpcResult.error.message;
    return { success: false, error: errMsg };
  }

  // No result AND no error — ambiguous response
  if (rpcResult.result === undefined) {
    return degradeResult(
      "Simulation RPC returned ambiguous response (no result or error field)",
      failOpen,
    );
  }

  // Validate result is hex
  if (!isHexResult(rpcResult.result)) {
    return degradeResult(
      "Simulation RPC returned non-hex result — possible spoofed response",
      failOpen,
    );
  }

  // Success — eth_call returned valid hex data without revert
  return { success: true };
}
