#!/usr/bin/env -S bunx tsx

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ensureLocalPackageResolution, hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface OperatorEnvelope {
  mode: "dry-run" | "execute";
  selectedAction: {
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    executionPathFamily: string;
    intent?: {
      actionFamily: string;
      actionType: string;
      marketKind?: string;
      status: string;
      executionPathFamily: string;
    };
  };
  skippedAlternatives: Array<{
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    intent?: {
      actionFamily: string;
      actionType: string;
      marketKind?: string;
      status: string;
      executionPathFamily: string;
    };
  }>;
  capabilitySummary: {
    selectedFamily: string;
    executableFamilies: string[];
    supervisedFamilies: string[];
    blockedFamilies: string[];
    lifecyclePendingFamilies: string[];
    unsupportedFamilies: string[];
    explicitExecuteFamilies: string[];
    spendFamilies: string[];
    noSpendDefault: boolean;
    allRequiredFamiliesHaveIntent: boolean;
  };
  capabilityDiscovery: {
    source: "omniweb-toolkit";
    compact: {
      availableReadCapabilities: string[];
      availableWriteCapabilities: string[];
      blockedCapabilities: string[];
      richResponseCapabilities: string[];
      proofResponseCapabilities: string[];
      defaultBoundaries: {
        noSpendDefault: boolean;
        liveExecutionRequiresExplicitExecute: boolean;
        strategyLayer: string;
        protocolLayer: string;
      };
    };
    fullDetailAccess: {
      manifestField: string;
      capabilityIds: string[];
      includes: string[];
    };
    operatorHelp: {
      format: string;
      manifestField: string;
      defaultMode: string;
      commandCount: number;
      readCommandCount: number;
      writeCommandCount: number;
      commands: Array<{
        command: string;
        capabilityId: string;
        params: Array<{ name: string; required: boolean; type: string }>;
        responseDepth: string;
        proofTier: string;
        readbackSurfaces: string[];
        noSpend: boolean;
        noMutation: boolean;
        usage: string;
      }>;
      readCommands: Array<{
        command: string;
        capabilityId: string;
        params: Array<{ name: string; required: boolean; type: string }>;
        responseDepth: string;
        proofTier: string;
        readbackSurfaces: string[];
        noSpend: boolean;
        noMutation: boolean;
        usage: string;
      }>;
    };
    responseDepthAccess: {
      manifestField: string;
      preservedFields: string[];
      missingSurfaces: string[];
      surfaces: Array<{
        id: string;
        methods: string[];
        readbackSurfaces: string[];
        envelopeFields: string[];
        preservationStatus: string;
      }>;
    };
  };
  capabilityTruth: {
    coverage: {
      allRequiredFamiliesPresent: boolean;
      allRequiredFamiliesHaveIntent: boolean;
      noSpendDefault: boolean;
    };
  };
  toolkitCapabilityManifest: {
    source: "omniweb-toolkit";
    capabilities: Array<{
      id: string;
      methods: string[];
      params: Array<{ name: string; required: boolean; type: string }>;
      methodParams: Record<string, Array<{ name: string; required: boolean; type: string }>>;
      methodRequirements: Record<string, Record<string, unknown>>;
      requirements: Record<string, unknown>;
      responseDepth: string;
      proofTier: string;
      lifecycle: Record<string, unknown>;
      status: string;
    }>;
  };
  lifecyclePlan: {
    required: boolean;
    status: string;
    recordId: string | null;
  };
  execution: {
    dryRun: boolean;
    status: string;
    demSpendEstimate: number;
    productReadback: {
      attempted: boolean;
      visible: boolean;
      indexedVisible: boolean;
    };
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-entrypoint.ts

Run the maintained Colony Operator entrypoint in no-spend mode and assert that it returns the AC-2 execution envelope: selected action, skipped alternatives, capability truth, lifecycle plan, execution mode, and spend status.

Output: JSON maintained-entrypoint proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const stateDir = mkdtempSync(join(tmpdir(), "omniweb-colony-operator-entrypoint-"));
const started = Date.now();
ensureLocalPackageResolution(resolve(PACKAGE_ROOT, "agents/openclaw/colony-operator"));
const starterModule = await import(pathToFileURL(resolve(
  PACKAGE_ROOT,
  "agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts",
)).href);
const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");

let envelope: OperatorEnvelope | null = null;
let failure: string | null = null;

try {
  envelope = await runColonyOperatorCycle(starterModule.observe, {
    stateDir,
    cwd: PACKAGE_ROOT,
    sessionSlug: "colony-operator-entrypoint-check",
    omni: makeMockOmni(),
  });
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const checks = {
  noThrow: failure == null,
  envelopeReturned: envelope != null,
  dryRunDefault: envelope?.mode === "dry-run" && envelope.execution.dryRun === true,
  noSpendDefault: envelope?.execution.demSpendEstimate === 0 && envelope.capabilityTruth.coverage.noSpendDefault === true,
  selectedActionPresent: typeof envelope?.selectedAction.actionFamily === "string",
  selectedActionIntentPresent: envelope?.selectedAction.intent?.actionFamily === envelope?.selectedAction.actionFamily,
  skippedAlternativesPresent: Array.isArray(envelope?.skippedAlternatives) && envelope.skippedAlternatives.length >= 5,
  skippedAlternativeIntentsPresent: envelope?.skippedAlternatives.every((item) => item.intent?.actionFamily === item.actionFamily) === true,
  capabilityTruthPresent: envelope?.capabilityTruth.coverage.allRequiredFamiliesPresent === true,
  capabilitySummaryPresent: envelope?.capabilitySummary.selectedFamily === envelope?.selectedAction.actionFamily
    && envelope?.capabilitySummary.allRequiredFamiliesHaveIntent === true
    && envelope?.capabilitySummary.lifecyclePendingFamilies.includes("bet-hl") === true,
  compactDiscoveryPresent: envelope?.capabilityDiscovery.source === "omniweb-toolkit"
    && envelope.capabilityDiscovery.compact.availableReadCapabilities.includes("colony.feed")
    && envelope.capabilityDiscovery.compact.richResponseCapabilities.includes("colony.post-detail")
    && envelope.capabilityDiscovery.compact.proofResponseCapabilities.includes("colony.publish")
    && envelope.capabilityDiscovery.compact.defaultBoundaries.protocolLayer === "toolkit/runtime",
  fullManifestAccessPresent: envelope?.capabilityDiscovery.fullDetailAccess.manifestField === "toolkitCapabilityManifest"
    && envelope.capabilityDiscovery.fullDetailAccess.includes.includes("params")
    && envelope.capabilityDiscovery.fullDetailAccess.includes.includes("methodParams")
    && envelope.capabilityDiscovery.fullDetailAccess.includes.includes("methodRequirements")
    && envelope.capabilityDiscovery.fullDetailAccess.includes.includes("proofTier")
    && envelope.toolkitCapabilityManifest.capabilities.some((capability) => (
      capability.id === "colony.publish"
      && capability.methods.includes("omni.colony.publish")
      && capability.params.some((param) => param.name === "text" && param.required)
    )),
  operatorHelpPresent: envelope?.capabilityDiscovery.operatorHelp.format === "toolkit-help.v1"
    && envelope.capabilityDiscovery.operatorHelp.manifestField === "toolkitCapabilityManifest"
    && envelope.capabilityDiscovery.operatorHelp.defaultMode === "read-first-no-spend"
    && envelope.capabilityDiscovery.operatorHelp.commandCount >= envelope.toolkitCapabilityManifest.capabilities.length
    && envelope.capabilityDiscovery.operatorHelp.readCommands.some((command) => (
      command.command === "createClient().getFeed"
      && command.noSpend
      && command.noMutation
      && command.params.some((param) => param.name === "limit")
      && command.usage.includes("--limit")
    ))
    && envelope.capabilityDiscovery.operatorHelp.readCommands.some((command) => command.command === "createClient().getThread")
    && envelope.capabilityDiscovery.operatorHelp.readCommands.some((command) => command.command === "createClient().getChatMessages")
    && envelope.capabilityDiscovery.operatorHelp.readCommands.some((command) => (
      command.command === "omni.escrow.getClaimable"
      && command.noSpend
      && command.noMutation
    ))
    && envelope.capabilityDiscovery.operatorHelp.commands.every((command) => {
      const capability = envelope?.toolkitCapabilityManifest.capabilities.find((item) => item.id === command.capabilityId);
      const expectedParams = capability?.methodParams[command.command] ?? capability?.params ?? [];
      return capability != null
        && expectedParams.map((param) => param.name).join("\0") === command.params.map((param) => param.name).join("\0");
    }),
  responseDepthAccessPresent: envelope?.capabilityDiscovery.responseDepthAccess.manifestField === "toolkitCapabilityManifest"
    && envelope.capabilityDiscovery.responseDepthAccess.missingSurfaces.length === 0
    && envelope.capabilityDiscovery.responseDepthAccess.surfaces.every((surface) => surface.preservationStatus === "preserved")
    && envelope.capabilityDiscovery.responseDepthAccess.surfaces.some((surface) => (
      surface.id === "post-detail-thread"
      && surface.methods.includes("omni.colony.getPostDetail")
      && surface.readbackSurfaces.includes("thread")
    ))
    && envelope.capabilityDiscovery.responseDepthAccess.surfaces.some((surface) => (
      surface.id === "lifecycle-proof-packets"
      && surface.envelopeFields.includes("lifecyclePlan.proofPath")
      && surface.readbackSurfaces.includes("resolved-winners")
    )),
  lifecyclePlanPresent: envelope?.lifecyclePlan.required === true && envelope.lifecyclePlan.status === "planned",
  noProductMutationClaimed: envelope?.execution.productReadback.attempted === false,
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  stateDir,
  checks,
  contract: {
    maintainedOperatorEntrypoint: ok,
    runtimeCapabilityDiscovery: Boolean(checks.compactDiscoveryPresent && checks.fullManifestAccessPresent && checks.operatorHelpPresent),
    responseDepthPreserved: checks.responseDepthAccessPresent,
    explicitExecuteRequiredForLiveWrites: checks.dryRunDefault && checks.lifecyclePlanPresent,
    spendsDem: false,
    liveWriteProven: false,
  },
  result: envelope
    ? {
        mode: envelope.mode,
        selectedAction: envelope.selectedAction,
        skippedAlternativeCount: envelope.skippedAlternatives.length,
        skippedAlternatives: envelope.skippedAlternatives.map((alternative) => ({
          actionFamily: alternative.actionFamily,
          status: alternative.status,
          lifecycleStatus: alternative.lifecycleStatus,
          intent: alternative.intent,
        })),
        capabilityDiscovery: envelope.capabilityDiscovery,
        toolkitCapabilityManifest: {
          source: envelope.toolkitCapabilityManifest.source,
          capabilityCount: envelope.toolkitCapabilityManifest.capabilities.length,
          sampleCapabilities: envelope.toolkitCapabilityManifest.capabilities
            .filter((capability) => ["colony.feed", "colony.publish", "colony.post-detail", "colony.identity"].includes(capability.id))
            .map((capability) => ({
              id: capability.id,
              methods: capability.methods,
              params: capability.params,
              methodParams: capability.methodParams,
              methodRequirements: capability.methodRequirements,
              requirements: capability.requirements,
              responseDepth: capability.responseDepth,
              proofTier: capability.proofTier,
              lifecycle: capability.lifecycle,
              status: capability.status,
            })),
        },
        capabilitySummary: envelope.capabilitySummary,
        lifecyclePlan: envelope.lifecyclePlan,
        execution: envelope.execution,
      }
    : null,
  failure,
}, null, 2));

process.exit(ok ? 0 : 1);

function makeMockOmni(): any {
  const matchedTxHash = "0xcolony-thread-1";
  const topic = "btc funding flip";
  return {
    colony: {
      getSignals: async () => ({
        ok: true,
        data: [
          { shortTopic: topic, confidence: 77, direction: "bearish", assets: ["BTC"] },
          { shortTopic: "eth perp basis cooling", confidence: 61, direction: "neutral", assets: ["ETH"] },
        ],
      }),
      getConvergence: async () => ({
        ok: true,
        data: {
          mindshare: {
            series: [{
              shortTopic: topic,
              agentCount: 3,
              totalPosts: 4,
              agrees: 2,
              disagrees: 1,
              confidence: 74,
              sourceTxHashes: [matchedTxHash],
              assets: ["BTC"],
            }],
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [{
            txHash: matchedTxHash,
            author: "0xagent",
            timestamp: Date.UTC(2026, 4, 3, 18, 0, 0),
            replyCount: 0,
            score: 19,
            reactions: { agree: 3, disagree: 0, flag: 0 },
            payload: {
              cat: "OBSERVATION",
              text: `${topic} now has multi-surface support.`,
              sourceAttestations: [{ url: "https://app.supercolony.ai/api/signals" }],
            },
          }],
        },
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: { agents: [{ address: "0xagent" }, { address: "0xpeer" }] },
      }),
      getBalance: async () => ({
        ok: true,
        data: { balance: 42 },
      }),
    },
    runtime: {
      sdkBridge: {},
    },
  };
}
