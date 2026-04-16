/**
 * Chain transaction pipeline.
 *
 * Enforces store/sign -> confirm -> broadcast sequencing so callers cannot
 * accidentally stop after confirm and leave the transaction unbroadcast.
 */

export interface ChainTxResult {
  txHash: string;
  blockNumber?: number;
}

export interface ChainTxStages<TPayload, TStored, TConfirmed, TBroadcast> {
  store(payload: TPayload): Promise<TStored>;
  confirm(stored: TStored): Promise<TConfirmed>;
  broadcast(confirmed: TConfirmed): Promise<TBroadcast>;
}

function extractTxHash(value: unknown): string | null {
  const candidates = [
    value,
    getPath(value, ["txHash"]),
    getPath(value, ["hash"]),
    getPath(value, ["transactionHash"]),
    getPath(value, ["response", "data", "transaction", "hash"]),
    getPath(value, ["response", "data", "txHash"]),
    getPath(value, ["response", "data", "hash"]),
    getPath(value, ["response", "results", "tx1", "hash"]),
    getPath(value, ["data", "transaction", "hash"]),
  ];

  const responseResults = getPath(value, ["response", "results"]);
  if (responseResults && typeof responseResults === "object") {
    for (const result of Object.values(responseResults as Record<string, unknown>)) {
      if (result && typeof result === "object" && typeof (result as Record<string, unknown>).hash === "string") {
        candidates.push((result as Record<string, unknown>).hash);
      }
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

function extractBlockNumber(value: unknown): number | undefined {
  const candidates = [
    value,
    getPath(value, ["blockNumber"]),
    getPath(value, ["response", "data", "transaction", "blockNumber"]),
    getPath(value, ["data", "transaction", "blockNumber"]),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function getPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function getBroadcastStatus(value: unknown): number | null {
  const status = getPath(value, ["result"]);
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function formatBroadcastFailure(value: unknown): string {
  const message = getPath(value, ["response", "message"]);
  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function executeChainTx<TPayload, TStored, TConfirmed, TBroadcast>(
  stages: ChainTxStages<TPayload, TStored, TConfirmed, TBroadcast>,
  payload: TPayload,
): Promise<ChainTxResult> {
  const stored = await stages.store(payload);
  const confirmed = await stages.confirm(stored);
  const confirmedTxHash = extractTxHash(confirmed);

  if (!confirmedTxHash) {
    throw new Error("Confirmed transaction missing txHash");
  }

  const broadcastResult = await stages.broadcast(confirmed);
  const broadcastStatus = getBroadcastStatus(broadcastResult);
  if (broadcastStatus !== null && (broadcastStatus < 200 || broadcastStatus >= 300)) {
    throw new Error(
      `Broadcast failed with result ${broadcastStatus}: ${formatBroadcastFailure(broadcastResult)}`,
    );
  }
  const txHash = extractTxHash(broadcastResult) ?? confirmedTxHash;

  return {
    txHash,
    blockNumber: extractBlockNumber(confirmed),
  };
}
