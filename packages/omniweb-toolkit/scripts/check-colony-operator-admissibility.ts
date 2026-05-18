#!/usr/bin/env npx tsx

import { hasFlag, loadPackageExport } from "./_shared.js";

interface AdmissibilityManifest {
  authority: string;
  statusVocabulary: string[];
  runtimeTruth: { admissibilityField: string };
}

interface AdmissibilityReport {
  status: string;
  executionGate: string;
  canExecuteNow: boolean;
  reasonCodes: string[];
  supervisedRequirements: string[];
  degradedReasonCodes: string[];
  guardrails: {
    status: string;
    blockedReasonCodes: string[];
  };
}

interface CapabilityTruth {
  actions: Array<{
    actionFamily: string;
    status: string;
    reasonCodes: string[];
  }>;
}

interface MultiActionPlan {
  plannedIntents: Array<{
    actionFamily: string;
    request: { params?: Record<string, unknown>; timeframe?: string };
    admissibility: AdmissibilityReport;
  }>;
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-admissibility.ts

Assert that toolkit action admissibility is exported, runtime-owned, and attached to colony-operator planning.

Output: JSON admissibility proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const buildToolkitActionAdmissibilityManifest = await loadPackageExport<
  (opts?: Record<string, unknown>) => AdmissibilityManifest
>("../dist/agent.js", "../src/agent.ts", "buildToolkitActionAdmissibilityManifest");
const evaluateToolkitActionAdmissibility = await loadPackageExport<
  (input?: Record<string, unknown>) => Promise<AdmissibilityReport>
>("../dist/agent.js", "../src/agent.ts", "evaluateToolkitActionAdmissibility");
const buildColonyOperatorCapabilityTruth = await loadPackageExport<
  (opts?: Record<string, unknown>) => CapabilityTruth
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorCapabilityTruth");
const buildColonyOperatorMultiActionPlan = await loadPackageExport<
  (opts: Record<string, unknown>) => MultiActionPlan
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorMultiActionPlan");

const started = Date.now();
const manifest = buildToolkitActionAdmissibilityManifest({
  now: new Date("2026-05-18T12:30:00.000Z"),
});
const capabilityTruth = buildColonyOperatorCapabilityTruth({
  runtimeCapabilities: readyRuntime(),
});
const byFamily = Object.fromEntries(capabilityTruth.actions.map((action) => [action.actionFamily, action]));
const publishDryRun = await evaluateToolkitActionAdmissibility({
  mode: "dry-run",
  explicitExecute: false,
  actionFamily: "publish",
  actionTruth: byFamily.publish,
});
const unsafePublish = await evaluateToolkitActionAdmissibility({
  mode: "execute",
  explicitExecute: true,
  actionFamily: "publish",
  actionTruth: byFamily.publish,
  guardrails: {
    urls: ["https://127.0.0.1/proof"],
  },
});
const register = await evaluateToolkitActionAdmissibility({
  mode: "execute",
  explicitExecute: true,
  actionFamily: "register",
  actionTruth: byFamily.register,
});
const higherLower = await evaluateToolkitActionAdmissibility({
  mode: "execute",
  explicitExecute: true,
  actionFamily: "bet-hl",
  actionTruth: byFamily["bet-hl"],
});
const react = await evaluateToolkitActionAdmissibility({
  mode: "execute",
  explicitExecute: true,
  actionFamily: "react",
  actionTruth: byFamily.react,
  requestedAction: {
    actionFamily: "react",
    params: { targetTxHash: "0xpost", reaction: "agree" },
  },
});
const plan = buildColonyOperatorMultiActionPlan({
  mode: "dry-run",
  capabilityTruth,
  requestedActions: [
    { actionFamily: "publish", params: { text: "BTC follow-up" }, timeframe: "now" },
    { actionFamily: "bet-hl", params: { asset: "ETH", horizon: "24h", direction: "higher" }, timeframe: "24h" },
    { actionFamily: "register", params: { agentAddress: "0xoperator" }, timeframe: "supervised" },
  ],
});
const planByFamily = Object.fromEntries(plan.plannedIntents.map((intent) => [intent.actionFamily, intent]));

const checks = {
  manifestRuntimeAuthority: manifest.authority === "toolkit-runtime"
    && manifest.runtimeTruth.admissibilityField === "admissibility"
    && includesAll(manifest.statusVocabulary, ["allowed", "explicit_execute_required", "supervised", "blocked", "degraded", "unsupported"]),
  explicitExecuteGate: publishDryRun.status === "explicit_execute_required"
    && publishDryRun.executionGate === "explicit_execute"
    && publishDryRun.canExecuteNow === false,
  unsafeGuardrailBlocks: unsafePublish.status === "blocked"
    && unsafePublish.guardrails.status === "block"
    && unsafePublish.guardrails.blockedReasonCodes.includes("private_ipv4_url_blocked"),
  supervisedIdentity: register.status === "supervised"
    && register.executionGate === "supervision"
    && register.supervisedRequirements.includes("identity_supervision_required"),
  lifecyclePendingDegraded: higherLower.status === "degraded"
    && higherLower.degradedReasonCodes.includes("capability_lifecycle_pending")
    && higherLower.reasonCodes.includes("higher_lower_current_delayed_readback_pending"),
  reactAllowed: react.status === "allowed"
    && react.canExecuteNow === true
    && react.executionGate === "none",
  multiActionAdmissibilityAttached: plan.plannedIntents.length === 3
    && planByFamily.publish?.admissibility.status === "explicit_execute_required"
    && planByFamily["bet-hl"]?.admissibility.reasonCodes.includes("higher_lower_current_delayed_readback_pending")
    && planByFamily.register?.admissibility.status === "supervised"
    && planByFamily.register?.request.timeframe === "supervised",
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  checks,
  reports: {
    publishDryRun: publishDryRun.status,
    unsafePublish: unsafePublish.status,
    register: register.status,
    higherLower: higherLower.status,
    react: react.status,
  },
}, null, 2));

process.exit(ok ? 0 : 1);

function includesAll(values: string[], expected: string[]): boolean {
  return expected.every((value) => values.includes(value));
}

function readyRuntime(): Record<string, unknown> {
  return {
    canRead: true,
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness: {
      ok: true,
      canRead: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
      credentialSourcesChecked: [],
      runtimeCredentialSource: null,
      notes: [],
    },
    actionFamilies: {
      publish: readyActionFamily(),
      reply: readyActionFamily({ requiresTargetPost: true }),
      react: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true }),
      tip: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true }),
      bet: readyActionFamily({ requiresAttestation: false, requiresMarketContext: true }),
    },
  };
}

function readyActionFamily(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    declared: true,
    executable: true,
    readiness: "ready",
    requiresWallet: true,
    requiresAttestation: true,
    requiresTargetPost: false,
    requiresMarketContext: false,
    proofLevel: "real_runtime_action_family",
    notes: [],
    ...overrides,
  };
}
