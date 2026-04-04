/**
 * Adapts a Demos SDK instance to the ChainReaderRpc interface
 * with concurrency control for proof ingestion batch processing.
 *
 * Single source of truth for RPC concurrency — ingestProofs() does
 * sequential processing; parallel RPC calls are governed here.
 */

import type { ChainReaderRpc } from "../chain-reader.js";
import { createLimiter } from "../util/limiter.js";

export interface RpcAdapterOptions {
  /** Max concurrent RPC calls (default: 5). */
  concurrency?: number;
}

/**
 * Create a ChainReaderRpc from a Demos SDK instance with concurrency-limited getTxByHash.
 *
 * The SDK's getTxByHash can overwhelm the RPC node if called in bulk.
 * This adapter wraps it with a concurrency limiter so ingestProofs()
 * can fire all requests and the adapter throttles them.
 */
export function createChainReaderFromSdk(
  demos: { getTxByHash?: (txHash: string) => Promise<any>; [key: string]: unknown },
  options?: RpcAdapterOptions,
): ChainReaderRpc {
  const concurrency = options?.concurrency ?? 5;
  const limit = createLimiter(concurrency);

  const rpc: ChainReaderRpc = {};

  if (typeof demos.getTxByHash === "function") {
    const sdkGetTx = demos.getTxByHash.bind(demos);
    rpc.getTxByHash = (txHash: string) => limit(() => sdkGetTx(txHash));
  }

  return rpc;
}
