export interface RuntimeBalanceSide {
  ok: boolean;
  dem: number | null;
  cached?: boolean;
  error?: unknown;
}

export interface RuntimeBalanceDivergence {
  hasDivergence: boolean;
  kind: "none" | "availability_gap" | "colony_gt_chain" | "chain_gt_colony";
  demDelta: number | null;
  message?: string;
  blocksWriteReadiness: boolean;
}

export interface RuntimeBalanceTruth {
  checkedAt: string;
  rpcUrl: string | null;
  address: string | null;
  chainBlockNumber: number | null;
  effectiveDem: number | null;
  effectiveSource: "colony" | "chain_fallback" | "unavailable";
  colony: RuntimeBalanceSide;
  chain: RuntimeBalanceSide;
  divergence: RuntimeBalanceDivergence;
  readiness: "ready" | "blocked_upstream_balance_truth" | "balance_unavailable";
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeSide(input: {
  ok: boolean;
  dem: unknown;
  cached?: boolean;
  error?: unknown;
}): RuntimeBalanceSide {
  return {
    ok: input.ok,
    dem: toFiniteNumber(input.dem),
    cached: input.cached,
    error: input.ok ? undefined : input.error,
  };
}

export function deriveRuntimeBalanceTruth(input: {
  rpcUrl?: string | null;
  address?: string | null;
  chainBlockNumber?: number | null;
  colony: { ok: boolean; dem: unknown; cached?: boolean; error?: unknown };
  chain: { ok: boolean; dem: unknown; error?: unknown };
}): RuntimeBalanceTruth {
  const colony = normalizeSide(input.colony);
  const chain = normalizeSide(input.chain);

  const useChainFallback =
    chain.ok &&
    (chain.dem ?? 0) > 0 &&
    (!colony.ok || (colony.dem ?? 0) <= 0);

  const effectiveDem = useChainFallback
    ? chain.dem
    : colony.ok
      ? colony.dem
      : chain.ok
        ? chain.dem
        : null;

  let divergence: RuntimeBalanceDivergence = {
    hasDivergence: false,
    kind: "none",
    demDelta: null,
    blocksWriteReadiness: false,
  };

  if (colony.ok && chain.ok && colony.dem !== null && chain.dem !== null && colony.dem !== chain.dem) {
    const demDelta = Number((colony.dem - chain.dem).toFixed(6));
    const kind = demDelta > 0 ? "colony_gt_chain" : "chain_gt_colony";
    divergence = {
      hasDivergence: true,
      kind,
      demDelta,
      blocksWriteReadiness: true,
      message:
        kind === "colony_gt_chain"
          ? `Colony/API balance reports ${colony.dem} DEM but raw chain balance on the active RPC reports ${chain.dem} DEM.`
          : `Raw chain balance on the active RPC reports ${chain.dem} DEM but colony/API balance reports ${colony.dem} DEM.`,
    };
  } else if ((colony.ok && !chain.ok) || (!colony.ok && chain.ok)) {
    divergence = {
      hasDivergence: true,
      kind: "availability_gap",
      demDelta: null,
      blocksWriteReadiness: false,
      message: colony.ok
        ? "Colony/API balance is available but raw chain balance on the active RPC is unavailable."
        : "Raw chain balance on the active RPC is available but colony/API balance is unavailable.",
    };
  }

  const readiness = divergence.blocksWriteReadiness
    ? "blocked_upstream_balance_truth"
    : effectiveDem === null
      ? "balance_unavailable"
      : "ready";

  return {
    checkedAt: new Date().toISOString(),
    rpcUrl: input.rpcUrl ?? null,
    address: input.address ?? null,
    chainBlockNumber: input.chainBlockNumber ?? null,
    effectiveDem,
    effectiveSource: effectiveDem === null
      ? "unavailable"
      : useChainFallback
        ? "chain_fallback"
        : "colony",
    colony,
    chain,
    divergence,
    readiness,
  };
}

export async function readRuntimeBalanceTruth(omni: any): Promise<RuntimeBalanceTruth> {
  const [colonyResult, chainResult, blockNumber] = await Promise.all([
    omni.colony.getBalance(),
    omni.chain.getBalance(omni.address),
    typeof omni.chain?.getBlockNumber === "function" ? omni.chain.getBlockNumber() : Promise.resolve(null),
  ]);

  const balanceData = colonyResult?.ok
    ? colonyResult.data as { balance?: number | string; available?: number | string; cached?: boolean } | undefined
    : undefined;

  return deriveRuntimeBalanceTruth({
    rpcUrl: omni?.runtime?.rpcUrl ?? null,
    address: omni?.address ?? null,
    chainBlockNumber: typeof blockNumber === "number" ? blockNumber : null,
    colony: {
      ok: colonyResult?.ok === true,
      dem: balanceData?.balance ?? balanceData?.available,
      cached: balanceData?.cached,
      error: colonyResult?.ok ? undefined : colonyResult?.error ?? { code: "UNAVAILABLE", message: "Balance result unavailable" },
    },
    chain: {
      ok: chainResult?.ok === true,
      dem: chainResult?.balance,
      error: chainResult?.ok ? undefined : chainResult?.error ?? { code: "UNAVAILABLE", message: "Chain balance unavailable" },
    },
  });
}
