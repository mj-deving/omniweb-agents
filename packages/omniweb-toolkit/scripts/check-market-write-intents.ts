#!/usr/bin/env npx tsx
/**
 * check-market-write-intents.ts — No-spend proof for market write intent coverage.
 */

import { hasFlag, loadPackageExport } from "./_shared.js";

type MarketWriteFamily = string;
type MarketWriteIntentMatrix = {
  noSpend: boolean;
  noMutation: boolean;
  liveExecutionDisabled: boolean;
  intents: Array<{
    family: string;
    actionFamily?: string;
    explicitExecute?: string;
    spendsDem?: boolean;
    lifecycleStatus?: string;
    toolkitAdmissibility?: { status?: string };
    noSpendDefault?: boolean;
    canExecuteNow?: boolean;
    admissibilityStatus?: string;
    capabilityStatus?: string;
    supervision?: string;
  }>;
  summary: {
    allFamiliesPresent: boolean;
    allNoSpendDefault: boolean;
    allLiveExecutionDisabled: boolean;
    lifecyclePendingFamilies: string[];
    unsupportedFamilies: string[];
    deploymentBlockedFamilies: string[];
    explicitExecuteRequiredFamilies: string[];
  };
};

const args = process.argv.slice(2);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bun ./scripts/check-market-write-intents.ts

No-spend proof for market write intent coverage.

Options:
  --help, -h  Show this help`);
  process.exit(0);
}
if (args.length > 0) {
  console.error(`Error: unsupported arguments: ${args.join(" ")}`);
  process.exit(2);
}

const buildMarketWriteIntentMatrix = await loadPackageExport<
  (input: Record<string, unknown>) => MarketWriteIntentMatrix
>(
  "../dist/index.js",
  "../src/index.js",
  "buildMarketWriteIntentMatrix",
);

const matrix = buildMarketWriteIntentMatrix({
  now: new Date("2026-05-18T19:20:00.000Z"),
  runtimeCapabilities: deterministicRuntimeCapabilities(),
});

const requiredFamilies: MarketWriteFamily[] = [
  "fixed-price",
  "higher-lower",
  "binary",
  "graduation",
  "commodity",
  "sports",
  "eth-fixed-price",
  "eth-higher-lower",
  "eth-binary",
];

const byFamily = new Map(matrix.intents.map((intent) => [intent.family, intent]));
const fixedPrice = byFamily.get("fixed-price");
const higherLower = byFamily.get("higher-lower");
const ethFixed = byFamily.get("eth-fixed-price");
const ethHigherLower = byFamily.get("eth-higher-lower");
const graduation = byFamily.get("graduation");
const ethBinary = byFamily.get("eth-binary");

const checks = {
  allFamiliesPresent: matrix.summary.allFamiliesPresent
    && requiredFamilies.every((family) => byFamily.has(family)),
  noSpendDefault: matrix.noSpend === true
    && matrix.summary.allNoSpendDefault
    && matrix.intents.every((intent) => intent.noSpendDefault === true),
  noMutationDefault: matrix.noMutation === true,
  liveExecutionDisabled: matrix.liveExecutionDisabled === true
    && matrix.summary.allLiveExecutionDisabled
    && matrix.intents.every((intent) => intent.canExecuteNow === false),
  fixedPriceUsesExistingAdmissibility: fixedPrice?.actionFamily === "bet-fixed"
    && fixedPrice.explicitExecute === "required"
    && fixedPrice.spendsDem === true
    && fixedPrice.lifecycleStatus === "lifecycle_proven"
    && fixedPrice.toolkitAdmissibility?.status === "explicit_execute_required",
  higherLowerRemainsPending: higherLower?.actionFamily === "bet-hl"
    && higherLower.explicitExecute === "required"
    && higherLower.spendsDem === true
    && higherLower.lifecycleStatus === "pending_current_recheck"
    && matrix.summary.lifecyclePendingFamilies.includes("higher-lower"),
  unsupportedFamiliesHonest: (["binary", "commodity", "sports"] satisfies MarketWriteFamily[]).every((family) => (
    matrix.summary.unsupportedFamilies.includes(family)
      && byFamily.get(family)?.admissibilityStatus === "unsupported"
  )),
  deploymentAndServerBlocksHonest: ethFixed?.capabilityStatus === "deployment_disabled"
    && ethHigherLower?.capabilityStatus === "deployment_disabled"
    && graduation?.capabilityStatus === "server_error"
    && matrix.summary.deploymentBlockedFamilies.includes("eth-fixed-price")
    && matrix.summary.deploymentBlockedFamilies.includes("eth-higher-lower")
    && matrix.summary.deploymentBlockedFamilies.includes("graduation"),
  ethBinaryRecoveryOnly: ethBinary?.capabilityStatus === "recovery_only"
    && ethBinary.supervision === "manual_recovery"
    && ethBinary.explicitExecute === "not_supported",
  explicitExecuteOnlyForMaintainedSpendProofs: matrix.summary.explicitExecuteRequiredFamilies.length === 2
    && matrix.summary.explicitExecuteRequiredFamilies.includes("fixed-price")
    && matrix.summary.explicitExecuteRequiredFamilies.includes("higher-lower"),
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  matrix,
  liveEvidence: {
    source: "omniweb-agents-spectrum.8 market-read probes",
    checkedAt: "2026-05-18T18:58:47Z/2026-05-18T18:59:30Z",
    readSurfaceOnly: [
      "binary",
      "commodity",
      "sports",
    ],
    deploymentBlocked: [
      {
        family: "eth-fixed-price",
        endpoint: "/api/bets/eth/pool?asset=BTC&horizon=30m",
        status: 503,
        error: "ETH betting not enabled (contract not deployed)",
      },
      {
        family: "eth-higher-lower",
        endpoint: "/api/bets/eth/hl/pool?asset=BTC&horizon=30m",
        status: 503,
        error: "ETH Higher/Lower betting not enabled (contract not deployed)",
      },
      {
        family: "graduation",
        endpoint: "/api/bets/graduation/markets?limit=2&status=active",
        status: 500,
        error: "SqliteError: no such table: graduation_markets",
      },
    ],
  },
  contract: {
    ownerBead: "omniweb-agents-spectrum.9",
    noSpend: true,
    noMutation: true,
    liveExecution: false,
    publicRegistryProof: false,
    release: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);

function deterministicRuntimeCapabilities() {
  const readiness = {
    ok: true,
    canRead: true,
    canAuth: true,
    canWrite: true,
    authState: "ready",
    writeState: "ready",
    missingEnv: [],
    missingPackages: [],
    credentialSourcesChecked: ["deterministic-no-spend-check"],
    runtimeCredentialSource: "deterministic-no-spend-check",
    notes: ["Synthetic runtime capability truth for deterministic no-spend package checks."],
  };
  const readyAction = {
    declared: true,
    executable: true,
    readiness: "ready" as const,
    requiresWallet: true,
    requiresAttestation: false,
    requiresTargetPost: false,
    requiresMarketContext: false,
    proofLevel: "real_runtime_action_family" as const,
    notes: ["Synthetic capability used only for no-spend intent/admissibility proof."],
  };
  return {
    canRead: true,
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness,
    actionFamilies: {
      publish: { ...readyAction, requiresAttestation: true },
      reply: { ...readyAction, requiresAttestation: true, requiresTargetPost: true },
      react: { ...readyAction, requiresTargetPost: true },
      tip: { ...readyAction, requiresTargetPost: true },
      bet: { ...readyAction, requiresMarketContext: true },
    },
  };
}
