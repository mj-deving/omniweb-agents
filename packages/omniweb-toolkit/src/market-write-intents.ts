import {
  evaluateToolkitActionAdmissibilitySync,
  type ToolkitActionAdmissibilityReport,
  type ToolkitActionAdmissibilityStatus,
} from "./action-admissibility.js";
import {
  buildColonyOperatorCapabilityTruth,
  type ColonyOperatorActionFamily,
  type ColonyOperatorActionTruth,
} from "./colony-operator-capability-truth.js";
import { evaluateToolkitGuardrailsSync, type ToolkitGuardrailStatus } from "./guardrails.js";
import type { RuntimeCapabilityResult, WriteReadinessOptions } from "./readiness.js";
import { uniqueNonEmptyStrings } from "./unique-strings.js";

export type MarketWriteFamily =
  | "fixed-price"
  | "higher-lower"
  | "binary"
  | "graduation"
  | "commodity"
  | "sports"
  | "eth-fixed-price"
  | "eth-higher-lower"
  | "eth-binary";

export type MarketWriteCapabilityStatus =
  | "available"
  | "lifecycle_pending"
  | "blocked"
  | "degraded"
  | "supervised"
  | "recovery_only"
  | "deployment_disabled"
  | "server_error"
  | "unsupported";

export type MarketWriteLifecycleStatus =
  | "lifecycle_proven"
  | "pending_current_recheck"
  | "read_surface_only"
  | "deployment_blocked"
  | "server_error";

export interface MarketWriteIntent {
  family: MarketWriteFamily;
  actionFamily: ColonyOperatorActionFamily | null;
  endpoint: string | null;
  method: "POST" | "NATIVE_TRANSFER" | "NONE";
  capabilityStatus: MarketWriteCapabilityStatus;
  guardrailStatus: ToolkitGuardrailStatus;
  lifecycleStatus: MarketWriteLifecycleStatus;
  supervision: "none" | "manual_recovery" | "deployment_required" | "unsupported";
  explicitExecute: "required" | "not_supported";
  admissibilityStatus: ToolkitActionAdmissibilityStatus;
  canPlan: boolean;
  canExecuteNow: false;
  spendsDem: boolean;
  noSpendDefault: true;
  reasonCodes: string[];
  readbackSurfaces: string[];
  notes: string[];
  toolkitAdmissibility?: ToolkitActionAdmissibilityReport;
}

export interface MarketWriteIntentMatrix {
  generatedAt: string;
  source: "omniweb-toolkit";
  ownerBead: "omniweb-agents-spectrum.9";
  noSpend: true;
  noMutation: true;
  liveExecutionDisabled: true;
  intents: MarketWriteIntent[];
  summary: {
    allFamiliesPresent: boolean;
    allNoSpendDefault: boolean;
    allLiveExecutionDisabled: boolean;
    explicitExecuteRequiredFamilies: MarketWriteFamily[];
    unsupportedFamilies: MarketWriteFamily[];
    deploymentBlockedFamilies: MarketWriteFamily[];
    lifecyclePendingFamilies: MarketWriteFamily[];
  };
}

const REQUIRED_MARKET_WRITE_FAMILIES: MarketWriteFamily[] = [
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

export function buildMarketWriteIntentMatrix(
  options: WriteReadinessOptions & { now?: Date; runtimeCapabilities?: RuntimeCapabilityResult } = {},
): MarketWriteIntentMatrix {
  const capabilityTruth = buildColonyOperatorCapabilityTruth(options);
  const fixedAction = requiredAction(capabilityTruth.actions, "bet-fixed");
  const higherLowerAction = requiredAction(capabilityTruth.actions, "bet-hl");
  const intents: MarketWriteIntent[] = [
    fromActionTruth("fixed-price", fixedAction, {
      endpoint: "native DEM transfer with HIVE_BET memo + /api/bets/place recovery",
      method: "NATIVE_TRANSFER",
      lifecycleStatus: "lifecycle_proven",
      readbackSurfaces: ["chain", "active-pool", "resolved-winners"],
      notes: ["Fixed-price DEM pool writes are lifecycle-proven but still spend-bearing and require explicit execute."],
    }, options),
    fromActionTruth("higher-lower", higherLowerAction, {
      endpoint: "native DEM transfer with HIVE_HL memo + /api/bets/higher-lower/place recovery",
      method: "NATIVE_TRANSFER",
      lifecycleStatus: "pending_current_recheck",
      readbackSurfaces: ["chain", "higher-lower-pool", "resolved-winners"],
      notes: [
        "PR3 proved the maintained higher/lower write through pool readback at the fixed 5 DEM path.",
        "The consumer intent stays lifecycle-pending for the default operator path until a widened operator-cycle/delayed-winners recheck is deliberate.",
        "0.1 DEM is not a proven higher/lower live floor; the historical fractional attempt failed with Not an integer.",
      ],
    }, options),
    blockedIntent("binary", {
      endpoint: null,
      capabilityStatus: "unsupported",
      lifecycleStatus: "read_surface_only",
      supervision: "unsupported",
      explicitExecute: "not_supported",
      admissibilityStatus: "unsupported",
      spendsDem: true,
      reasonCodes: ["binary_market_write_not_first_class", "read_surface_only"],
      readbackSurfaces: ["binary-pools"],
      notes: ["Binary pools are readable, but a first-class DEM binary write path is not exposed by the maintained toolkit surface."],
    }),
    blockedIntent("graduation", {
      endpoint: "/api/bets/graduation/markets",
      capabilityStatus: "server_error",
      lifecycleStatus: "server_error",
      supervision: "deployment_required",
      explicitExecute: "not_supported",
      admissibilityStatus: "degraded",
      spendsDem: true,
      reasonCodes: ["graduation_markets_live_500", "graduation_markets_table_missing"],
      readbackSurfaces: ["graduation-markets"],
      notes: ["Graduation markets currently return a server error on the read surface, so write intent is blocked before spend."],
    }),
    blockedIntent("commodity", {
      endpoint: null,
      capabilityStatus: "unsupported",
      lifecycleStatus: "read_surface_only",
      supervision: "unsupported",
      explicitExecute: "not_supported",
      admissibilityStatus: "unsupported",
      spendsDem: true,
      reasonCodes: ["commodity_market_write_not_first_class", "read_surface_only"],
      readbackSurfaces: ["commodity-pool"],
      notes: ["Commodity pools are readable, but no maintained commodity write method or admissible execution path exists yet."],
    }),
    blockedIntent("sports", {
      endpoint: null,
      capabilityStatus: "unsupported",
      lifecycleStatus: "read_surface_only",
      supervision: "unsupported",
      explicitExecute: "not_supported",
      admissibilityStatus: "unsupported",
      spendsDem: true,
      reasonCodes: ["sports_market_write_not_first_class", "read_surface_only"],
      readbackSurfaces: ["sports-markets", "sports-pool", "sports-winners"],
      notes: ["Sports markets are readable, but no maintained sports write method or admissible execution path exists yet."],
    }),
    blockedIntent("eth-fixed-price", {
      endpoint: "/api/bets/eth/pool",
      capabilityStatus: "deployment_disabled",
      lifecycleStatus: "deployment_blocked",
      supervision: "deployment_required",
      explicitExecute: "not_supported",
      admissibilityStatus: "degraded",
      spendsDem: false,
      reasonCodes: ["eth_betting_contract_not_deployed", "live_read_returned_503"],
      readbackSurfaces: ["eth-pool"],
      notes: ["Current host reports ETH betting is not enabled; do not widen spend authority from the DEM fixed-price proof."],
    }),
    blockedIntent("eth-higher-lower", {
      endpoint: "/api/bets/eth/hl/pool",
      capabilityStatus: "deployment_disabled",
      lifecycleStatus: "deployment_blocked",
      supervision: "deployment_required",
      explicitExecute: "not_supported",
      admissibilityStatus: "degraded",
      spendsDem: false,
      reasonCodes: ["eth_higher_lower_contract_not_deployed", "live_read_returned_503"],
      readbackSurfaces: ["eth-higher-lower-pool"],
      notes: ["Current host reports ETH higher/lower is not enabled; it remains a deployment-blocked intent only."],
    }),
    blockedIntent("eth-binary", {
      endpoint: "/api/bets/eth/binary/place",
      capabilityStatus: "recovery_only",
      lifecycleStatus: "deployment_blocked",
      supervision: "manual_recovery",
      explicitExecute: "not_supported",
      admissibilityStatus: "degraded",
      spendsDem: false,
      reasonCodes: ["eth_binary_enabled_false", "manual_registration_recovery_only"],
      readbackSurfaces: ["eth-binary-pools"],
      notes: [
        "The toolkit has an ETH binary registration helper, but it remains blocked until there is both a safe paired send path and an owned tx.",
      ],
    }),
  ];

  const presentFamilies = intents.map((intent) => intent.family);
  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    ownerBead: "omniweb-agents-spectrum.9",
    noSpend: true,
    noMutation: true,
    liveExecutionDisabled: true,
    intents,
    summary: {
      allFamiliesPresent: REQUIRED_MARKET_WRITE_FAMILIES.every((family) => presentFamilies.includes(family)),
      allNoSpendDefault: intents.every((intent) => intent.noSpendDefault === true),
      allLiveExecutionDisabled: intents.every((intent) => intent.canExecuteNow === false),
      explicitExecuteRequiredFamilies: intents
        .filter((intent) => intent.explicitExecute === "required")
        .map((intent) => intent.family),
      unsupportedFamilies: intents
        .filter((intent) => intent.capabilityStatus === "unsupported")
        .map((intent) => intent.family),
      deploymentBlockedFamilies: intents
        .filter((intent) => intent.lifecycleStatus === "deployment_blocked" || intent.lifecycleStatus === "server_error")
        .map((intent) => intent.family),
      lifecyclePendingFamilies: intents
        .filter((intent) => intent.lifecycleStatus === "pending_current_recheck")
        .map((intent) => intent.family),
    },
  };
}

function fromActionTruth(
  family: MarketWriteFamily,
  actionTruth: ColonyOperatorActionTruth,
  details: {
    endpoint: string;
    method: MarketWriteIntent["method"];
    lifecycleStatus: MarketWriteLifecycleStatus;
    readbackSurfaces: string[];
    notes: string[];
  },
  options: WriteReadinessOptions & { now?: Date; runtimeCapabilities?: RuntimeCapabilityResult },
): MarketWriteIntent {
  const guardrailEvaluation = evaluateToolkitGuardrailsSync({
    now: options.now,
    mode: "dry-run",
    explicitExecute: false,
    actionFamily: actionTruth.actionFamily,
    actionTruth,
    runtimeCapabilities: options.runtimeCapabilities,
  });
  const toolkitAdmissibility = evaluateToolkitActionAdmissibilitySync({
    ...options,
    mode: "dry-run",
    explicitExecute: false,
    actionFamily: actionTruth.actionFamily,
    actionTruth,
    guardrailEvaluation,
  });
  return {
    family,
    actionFamily: actionTruth.actionFamily,
    endpoint: details.endpoint,
    method: details.method,
    capabilityStatus: marketCapabilityStatusFromAction(actionTruth.status),
    guardrailStatus: guardrailEvaluation.status,
    lifecycleStatus: details.lifecycleStatus,
    supervision: "none",
    explicitExecute: "required",
    admissibilityStatus: toolkitAdmissibility.status,
    canPlan: toolkitAdmissibility.canPlan,
    canExecuteNow: false,
    spendsDem: actionTruth.spendsDem,
    noSpendDefault: true,
    reasonCodes: uniqueNonEmptyStrings([
      ...actionTruth.reasonCodes,
      ...toolkitAdmissibility.reasonCodes,
      "live_execution_disabled_for_consumer_spectrum_epic",
    ]),
    readbackSurfaces: details.readbackSurfaces,
    notes: details.notes,
    toolkitAdmissibility,
  };
}

function marketCapabilityStatusFromAction(
  status: ColonyOperatorActionTruth["status"],
): MarketWriteCapabilityStatus {
  if (status === "executable") return "available";
  if (status === "lifecycle-pending") return "lifecycle_pending";
  if (status === "blocked") return "blocked";
  if (status === "degraded") return "degraded";
  if (status === "supervised") return "supervised";
  return "unsupported";
}

function blockedIntent(
  family: MarketWriteFamily,
  details: Omit<MarketWriteIntent, "family" | "actionFamily" | "method" | "guardrailStatus" | "canPlan" | "canExecuteNow" | "noSpendDefault"> & {
    method?: MarketWriteIntent["method"];
  },
): MarketWriteIntent {
  return {
    family,
    actionFamily: null,
    method: details.method ?? (details.endpoint ? "POST" : "NONE"),
    guardrailStatus: details.admissibilityStatus === "unsupported" ? "block" : "degraded",
    canPlan: details.admissibilityStatus !== "unsupported",
    canExecuteNow: false,
    noSpendDefault: true,
    ...details,
  };
}

function requiredAction(
  actions: ColonyOperatorActionTruth[],
  family: Extract<ColonyOperatorActionFamily, "bet-fixed" | "bet-hl">,
): ColonyOperatorActionTruth {
  const action = actions.find((item) => item.actionFamily === family);
  if (!action) throw new Error(`missing ${family} action truth`);
  return action;
}
