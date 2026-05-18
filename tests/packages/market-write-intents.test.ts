import { describe, expect, it } from "vitest";
import {
  buildMarketWriteIntentMatrix,
  type MarketWriteFamily,
} from "../../packages/omniweb-toolkit/src/index.js";
import type { RuntimeCapabilityResult } from "../../packages/omniweb-toolkit/src/readiness.js";

describe("market write intents", () => {
  it("represents every market write family without enabling live spend", () => {
    const matrix = buildMarketWriteIntentMatrix({
      now: new Date("2026-05-18T19:20:00.000Z"),
      runtimeCapabilities: deterministicRuntimeCapabilities(),
    });
    const families = matrix.intents.map((intent) => intent.family);

    expect(matrix).toMatchObject({
      source: "omniweb-toolkit",
      ownerBead: "omniweb-agents-spectrum.9",
      noSpend: true,
      noMutation: true,
      liveExecutionDisabled: true,
    });
    expect(families).toEqual([
      "fixed-price",
      "higher-lower",
      "binary",
      "graduation",
      "commodity",
      "sports",
      "eth-fixed-price",
      "eth-higher-lower",
      "eth-binary",
    ]);
    expect(matrix.summary.allFamiliesPresent).toBe(true);
    expect(matrix.summary.allNoSpendDefault).toBe(true);
    expect(matrix.summary.allLiveExecutionDisabled).toBe(true);
    expect(matrix.intents.every((intent) => intent.canExecuteNow === false)).toBe(true);
  });

  it("routes fixed-price and higher/lower through existing guardrail and admissibility truth", () => {
    const byFamily = intentsByFamily();
    const fixedPrice = byFamily.get("fixed-price");
    const higherLower = byFamily.get("higher-lower");

    expect(fixedPrice).toMatchObject({
      actionFamily: "bet-fixed",
      method: "NATIVE_TRANSFER",
      capabilityStatus: "available",
      lifecycleStatus: "lifecycle_proven",
      explicitExecute: "required",
      admissibilityStatus: "explicit_execute_required",
      spendsDem: true,
      noSpendDefault: true,
    });
    expect(fixedPrice?.toolkitAdmissibility).toMatchObject({
      status: "explicit_execute_required",
      decision: "requires_explicit_execute",
      executionGate: "explicit_execute",
      canExecuteNow: false,
    });

    expect(higherLower).toMatchObject({
      actionFamily: "bet-hl",
      method: "NATIVE_TRANSFER",
      capabilityStatus: "lifecycle_pending",
      lifecycleStatus: "pending_current_recheck",
      explicitExecute: "required",
      admissibilityStatus: "explicit_execute_required",
      spendsDem: true,
      noSpendDefault: true,
    });
  });

  it("keeps unproven market families explicit and non-executable", () => {
    const byFamily = intentsByFamily();

    expect(["binary", "commodity", "sports"].map((family) => byFamily.get(family as MarketWriteFamily))).toEqual([
      expect.objectContaining({
        capabilityStatus: "unsupported",
        lifecycleStatus: "read_surface_only",
        explicitExecute: "not_supported",
        admissibilityStatus: "unsupported",
        canPlan: false,
      }),
      expect.objectContaining({
        capabilityStatus: "unsupported",
        lifecycleStatus: "read_surface_only",
        explicitExecute: "not_supported",
        admissibilityStatus: "unsupported",
        canPlan: false,
      }),
      expect.objectContaining({
        capabilityStatus: "unsupported",
        lifecycleStatus: "read_surface_only",
        explicitExecute: "not_supported",
        admissibilityStatus: "unsupported",
        canPlan: false,
      }),
    ]);

    expect(byFamily.get("graduation")).toMatchObject({
      capabilityStatus: "server_error",
      lifecycleStatus: "server_error",
      supervision: "deployment_required",
      admissibilityStatus: "degraded",
      canPlan: true,
      canExecuteNow: false,
    });
    expect(byFamily.get("eth-fixed-price")).toMatchObject({
      capabilityStatus: "deployment_disabled",
      lifecycleStatus: "deployment_blocked",
      supervision: "deployment_required",
      admissibilityStatus: "degraded",
      canExecuteNow: false,
    });
    expect(byFamily.get("eth-higher-lower")).toMatchObject({
      capabilityStatus: "deployment_disabled",
      lifecycleStatus: "deployment_blocked",
      supervision: "deployment_required",
      admissibilityStatus: "degraded",
      canExecuteNow: false,
    });
    expect(byFamily.get("eth-binary")).toMatchObject({
      capabilityStatus: "recovery_only",
      lifecycleStatus: "deployment_blocked",
      supervision: "manual_recovery",
      explicitExecute: "not_supported",
      admissibilityStatus: "degraded",
      canExecuteNow: false,
    });
  });

  it("preserves blocked runtime capability status instead of reporting blocked spend as available", () => {
    const matrix = buildMarketWriteIntentMatrix({
      now: new Date("2026-05-18T19:20:00.000Z"),
      runtimeCapabilities: deterministicRuntimeCapabilities({ betReadiness: "missing_credentials" }),
    });
    const fixedPrice = matrix.intents.find((intent) => intent.family === "fixed-price");

    expect(fixedPrice).toMatchObject({
      actionFamily: "bet-fixed",
      capabilityStatus: "blocked",
      admissibilityStatus: "blocked",
      canPlan: false,
      canExecuteNow: false,
      noSpendDefault: true,
    });
    expect(fixedPrice?.reasonCodes).toEqual(expect.arrayContaining([
      "missing_credentials",
      "capability_blocked",
    ]));
  });
});

function intentsByFamily(): Map<MarketWriteFamily, ReturnType<typeof buildMarketWriteIntentMatrix>["intents"][number]> {
  const matrix = buildMarketWriteIntentMatrix({
    now: new Date("2026-05-18T19:20:00.000Z"),
    runtimeCapabilities: deterministicRuntimeCapabilities(),
  });
  return new Map(matrix.intents.map((intent) => [intent.family, intent]));
}

function deterministicRuntimeCapabilities(
  options: { betReadiness?: RuntimeCapabilityResult["actionFamilies"]["bet"]["readiness"] } = {},
): RuntimeCapabilityResult {
  const readiness: RuntimeCapabilityResult["readiness"] = {
    ok: true,
    canRead: true,
    canAuth: true,
    canWrite: true,
    authState: "ready",
    writeState: "ready",
    missingEnv: [],
    missingPackages: [],
    credentialSourcesChecked: ["deterministic-no-spend-test"],
    runtimeCredentialSource: "deterministic-no-spend-test",
    notes: ["Synthetic runtime capability truth for deterministic no-spend tests."],
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
      bet: {
        ...readyAction,
        readiness: options.betReadiness ?? "ready",
        requiresMarketContext: true,
      },
    },
  };
}
