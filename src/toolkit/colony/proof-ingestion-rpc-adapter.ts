/**
 * Adapts a Demos SDK instance to the ChainReaderRpc interface
 * with concurrency control for proof ingestion batch processing.
 *
 * Single source of truth for RPC concurrency — ingestProofs() does
 * sequential processing; parallel RPC calls are governed here.
 */

import type { ChainReaderRpc } from "../chain-reader.js";

export interface RpcAdapterOptions {
  /** Max concurrent RPC calls (default: 5). */
  concurrency?: number;
}

/**
 * Simple concurrency limiter (no external dependency).
 * Returns a function that wraps async work with a concurrency cap.
 */
function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    } else {
      active++;
    }

    try {
      return await fn();
    } finally {
      active--;
      next();
    }
  };
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
