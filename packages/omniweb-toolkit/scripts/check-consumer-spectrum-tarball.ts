#!/usr/bin/env -S bunx tsx
/**
 * check-consumer-spectrum-tarball.ts - clean local-tarball proof for the full maintained consumer spectrum.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { PACKAGE_ROOT, hasFlag } from "./_shared.js";

interface CommandResult {
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface RawPackEntry {
  filename: string;
  size?: number;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
  files?: unknown[];
}

interface PackSummary {
  filename: string;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
}

const args = process.argv.slice(2);
const skipBuild = hasFlag(args, "--skip-build");
const keepTemp = hasFlag(args, "--keep-temp");

const allowedArgs = new Set([
  "--skip-build",
  "--keep-temp",
  "--help",
  "-h",
]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-consumer-spectrum-tarball.ts [options]

Build, pack, and install omniweb-toolkit into a clean temporary consumer workspace,
then prove the maintained SuperColony consumer spectrum through package-name imports.

Options:
  --skip-build   Do not run bun run build before packing
  --keep-temp    Keep the temporary consumer workspace for debugging
  --help, -h     Show this help

Output: JSON no-spend whole-spectrum local-tarball consumer proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const tempRoot = mkdtempSync(join(tmpdir(), "omniweb-consumer-spectrum-tarball-"));

let ok = false;
let buildResult: CommandResult | null = null;
let packResult: CommandResult | null = null;
let installResult: CommandResult | null = null;
let consumerResult: CommandResult | null = null;
let packEntry: PackSummary | null = null;
let consumerSummary: unknown = null;

try {
  if (!skipBuild) {
    buildResult = runCommand(["npm", "run", "build"], PACKAGE_ROOT);
    if (buildResult.exitCode !== 0) {
      throw new Error("package build failed before whole-spectrum consumer proof");
    }
  }

  packResult = runCommand([
    "npm",
    "pack",
    "--json",
    "--pack-destination",
    tempRoot,
  ], PACKAGE_ROOT);
  if (packResult.exitCode !== 0) {
    throw new Error("npm pack failed before whole-spectrum consumer proof");
  }

  const parsedPack = JSON.parse(packResult.stdout) as RawPackEntry[];
  const rawPackEntry = parsedPack[0] ?? null;
  if (!rawPackEntry?.filename) {
    throw new Error("npm pack did not report a tarball filename");
  }
  packEntry = {
    filename: rawPackEntry.filename,
    packageSize: rawPackEntry.packageSize ?? rawPackEntry.size,
    unpackedSize: rawPackEntry.unpackedSize,
    entryCount: rawPackEntry.entryCount ?? rawPackEntry.files?.length,
  };

  const tarballPath = resolve(tempRoot, basename(rawPackEntry.filename));
  writeFileSync(join(tempRoot, "package.json"), `${JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      "omniweb-toolkit": `file:${tarballPath}`,
    },
  }, null, 2)}\n`);

  installResult = runCommand([
    "npm",
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--fund=false",
    "--package-lock=false",
  ], tempRoot);
  if (installResult.exitCode !== 0) {
    throw new Error("clean consumer npm install failed");
  }

  writeFileSync(join(tempRoot, "whole-spectrum-proof.mjs"), renderConsumerProofScript());
  consumerResult = runCommand(["node", "whole-spectrum-proof.mjs"], tempRoot);
  if (consumerResult.exitCode !== 0) {
    throw new Error("whole-spectrum consumer proof script failed");
  }

  consumerSummary = JSON.parse(consumerResult.stdout);
  ok = true;
} catch (error) {
  consumerSummary = {
    error: error instanceof Error ? error.message : String(error),
  };
} finally {
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    ok,
    packageRoot: PACKAGE_ROOT,
    tempRoot: keepTemp ? tempRoot : null,
    keptTemp: keepTemp,
    skipped: {
      build: skipBuild,
    },
    pack: packEntry,
    commands: {
      build: summarizeCommand(buildResult),
      pack: summarizeCommand(packResult),
      install: summarizeCommand(installResult),
      consumer: summarizeCommand(consumerResult),
    },
    consumer: consumerSummary,
    contract: {
      ownerBead: "omniweb-agents-spectrum.10",
      localTarballInstall: ok,
      packageNameImports: ok,
      noSpend: true,
      noMutation: true,
      liveExecution: false,
      publicRegistryProof: false,
      release: false,
    },
  }, null, 2));

  if (!keepTemp) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

process.exit(ok ? 0 : 1);

function runCommand(command: string[], cwd: string): CommandResult {
  const started = Date.now();
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
  });

  return {
    command,
    cwd,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - started,
  };
}

function summarizeCommand(result: CommandResult | null): unknown {
  if (!result) return null;
  return {
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdout: result.stdout.trim().slice(0, 1600),
    stderr: result.stderr.trim().slice(0, 1600),
  };
}

function renderConsumerProofScript(): string {
  return `const root = await import("omniweb-" + "toolkit");
const runtime = await import("omniweb-" + "toolkit/runtime");
const agent = await import("omniweb-" + "toolkit/agent");
await import("omniweb-" + "toolkit/types");

const requiredRootExports = [
  "createClient",
  "summarizeRssFeed",
  "buildFeedStreamRequestPlan",
  "parseServerSentEvents",
  "classifyTransportAuth",
  "summarizeReadProfileCoverage",
  "classifyReadProfileShape",
  "buildChatWebhookPlan",
  "classifyWebhookEventPayload",
  "summarizeMarketReadCoverage",
  "classifyMarketReadShape",
  "buildMarketWriteIntentMatrix",
];
for (const exportName of requiredRootExports) {
  if (typeof root[exportName] !== "function") {
    throw new Error("missing root export: " + exportName);
  }
}

const requiredAgentExports = [
  "buildColonyOperatorCapabilityTruth",
  "buildColonyOperatorMultiActionPlan",
  "evaluateToolkitActionAdmissibility",
];
for (const exportName of requiredAgentExports) {
  if (typeof agent[exportName] !== "function") {
    throw new Error("missing agent export: " + exportName);
  }
}

const requiredRuntimeExports = [
  "buildToolkitCapabilityManifest",
  "checkWriteReadiness",
  "describeRuntimeCapabilities",
];
for (const exportName of requiredRuntimeExports) {
  if (typeof runtime[exportName] !== "function") {
    throw new Error("missing runtime export: " + exportName);
  }
}

const client = root.createClient({ timeoutMs: 1 });
if (typeof client.getFeed !== "function") {
  throw new Error("root createClient did not expose read client methods");
}

const rss = root.summarizeRssFeed("<feed><title>SuperColony</title><entry><title>One</title></entry></feed>", "application/atom+xml");
const streamPlan = root.buildFeedStreamRequestPlan({ token: "secret-token-123456", lastEventId: "evt-1" });
const streamEvents = root.parseServerSentEvents("id: evt-1\\nevent: post\\ndata: {\\\"txHash\\\":\\\"0xpost\\\"}\\n\\n");
const authExpired = root.classifyTransportAuth({ token: "secret-token-123456", status: 401, body: { error: "expired" } });

const readCoverage = root.summarizeReadProfileCoverage();
const readShapes = [
  root.classifyReadProfileShape("feed", { posts: [], hasMore: false }),
  root.classifyReadProfileShape("identity", { identity: { platform: "x", username: "alice" } }),
  root.classifyReadProfileShape("verification", { verified: true, attestations: [] }),
  root.classifyReadProfileShape("engagement", { agree: 0, disagree: 0, flag: 0 }),
];

const chatPlans = [
  root.buildChatWebhookPlan({ operation: "chat.rooms.list" }),
  root.buildChatWebhookPlan({ operation: "chat.message.send", token: "chat-token-123456", execute: true }),
  root.buildChatWebhookPlan({ operation: "webhooks.create", token: "webhook-token-123456", execute: true }),
  root.buildChatWebhookPlan({ operation: "webhooks.event.receive" }),
];
const webhookEvent = root.classifyWebhookEventPayload({ event: "post.created", payload: { txHash: "0xpost" } });

const marketReadCoverage = root.summarizeMarketReadCoverage();
const marketReadShapes = [
  root.classifyMarketReadShape("fixed-price", {
    totalDem: 0,
    totalBets: 0,
    asset: "BTC",
    horizon: "30m",
    poolAddress: "0xpool",
    roundEnd: 1779130800000,
    bets: [],
  }),
  root.classifyMarketReadShape("higher-lower", {
    asset: "BTC",
    horizon: "30m",
    totalHigher: 0,
    totalLower: 0,
    totalDem: 0,
    poolAddress: "0xpool",
    currentPrice: 76243.13,
  }),
  root.classifyMarketReadShape("eth-fixed-price", {
    error: "ETH betting not enabled (contract not deployed)",
  }),
  root.classifyMarketReadShape("graduation", {
    error: "SqliteError: no such table: graduation_markets",
  }),
];

const syntheticCapabilities = deterministicRuntimeCapabilities();
const readiness = runtime.checkWriteReadiness({ cwd: process.cwd(), homeDir: process.cwd(), env: {} });
const runtimeCapabilities = runtime.describeRuntimeCapabilities({ cwd: process.cwd(), homeDir: process.cwd(), env: {} });
const toolkitManifest = runtime.buildToolkitCapabilityManifest({
  runtimeCapabilities,
  now: new Date("2026-05-18T20:00:00.000Z"),
});
const actionTruth = agent.buildColonyOperatorCapabilityTruth({
  runtimeCapabilities: syntheticCapabilities,
  now: new Date("2026-05-18T20:00:00.000Z"),
});
const actionFamilies = actionTruth.actions.map((action) => action.actionFamily);
const requestedActions = [
  { actionFamily: "skip", timeframe: "default" },
  { actionFamily: "publish", params: { category: "OBSERVATION" }, timeframe: "now" },
  { actionFamily: "reply", params: { parentTxHash: "0xparent" }, timeframe: "after readback" },
  { actionFamily: "react", params: { targetTxHash: "0xpost", reaction: "agree" }, timeframe: "after readback" },
  { actionFamily: "tip", params: { targetTxHash: "0xpost", amount: 1 }, timeframe: "after readback" },
  { actionFamily: "VOTE", params: { asset: "BTC", horizon: "24h" }, timeframe: "24h" },
  { actionFamily: "bet-fixed", params: { asset: "BTC", horizon: "30m" }, timeframe: "30m" },
  { actionFamily: "bet-hl", params: { asset: "BTC", direction: "higher", horizon: "24h" }, timeframe: "24h" },
  { actionFamily: "register", params: { agentAddress: "0xconsumer" }, timeframe: "supervised only" },
  { actionFamily: "human-link", params: { platform: "x", username: "consumer" }, timeframe: "supervised only" },
];
const multiActionPlan = agent.buildColonyOperatorMultiActionPlan({
  mode: "dry-run",
  capabilityTruth: actionTruth,
  requestedActions,
});

const marketWriteMatrix = root.buildMarketWriteIntentMatrix({
  now: new Date("2026-05-18T20:00:00.000Z"),
  runtimeCapabilities: syntheticCapabilities,
});

const byMarketWriteFamily = new Map(marketWriteMatrix.intents.map((intent) => [intent.family, intent]));
const byPlannedFamily = new Map(multiActionPlan.plannedIntents.map((intent) => [intent.actionFamily, intent]));
const requiredActionFamilies = [
  "skip",
  "publish",
  "reply",
  "react",
  "tip",
  "VOTE",
  "bet-fixed",
  "bet-hl",
  "register",
  "human-link",
];

const checks = {
  packageRootImports: requiredRootExports.every((exportName) => typeof root[exportName] === "function"),
  subpathImports: requiredAgentExports.every((exportName) => typeof agent[exportName] === "function")
    && requiredRuntimeExports.every((exportName) => typeof runtime[exportName] === "function"),
  readClientConstructedWithoutNetwork: typeof client.getFeed === "function",
  transportNoSpend: rss.title === "SuperColony"
    && streamPlan.noSpend === true
    && streamPlan.opensStream === false
    && streamPlan.headers.authorization.includes("[redacted]")
    && streamEvents.length === 1
    && authExpired.state === "expired",
  readProfileNoSpend: readCoverage.ok === true
    && readCoverage.unsupportedFamilies.includes("levels")
    && readShapes.every((shape) => shape.verdict === "pass"),
  chatWebhookGated: root.CHAT_WEBHOOK_SURFACE.length === 8
    && chatPlans.filter((plan) => plan.mutatesRemote).every((plan) => plan.canExecuteNow === false)
    && chatPlans.every((plan) => !JSON.stringify(plan).includes("token-123456"))
    && webhookEvent.ok === true,
  marketReadsHonest: marketReadCoverage.ok === true
    && marketReadCoverage.driftedFamilies.includes("eth-fixed-price")
    && marketReadCoverage.driftedFamilies.includes("graduation")
    && marketReadShapes.every((shape) => shape.verdict === "pass" || shape.verdict === "expected_error_shape"),
  marketWriteIntentsNoSpend: marketWriteMatrix.noSpend === true
    && marketWriteMatrix.liveExecutionDisabled === true
    && marketWriteMatrix.summary.explicitExecuteRequiredFamilies.includes("fixed-price")
    && marketWriteMatrix.summary.explicitExecuteRequiredFamilies.includes("higher-lower")
    && ["binary", "commodity", "sports"].every((family) => marketWriteMatrix.summary.unsupportedFamilies.includes(family))
    && byMarketWriteFamily.get("graduation").capabilityStatus === "server_error",
  operatorActionSpectrum: requiredActionFamilies.every((family) => actionFamilies.includes(family))
    && multiActionPlan.mode === "dry-run"
    && multiActionPlan.liveExecutionAllowed === false
    && multiActionPlan.plannedIntents.length === requiredActionFamilies.length
    && byPlannedFamily.get("bet-fixed").liveExecutionGate.gate === "dry_run_only"
    && byPlannedFamily.get("bet-fixed").admissibility.status === "explicit_execute_required"
    && byPlannedFamily.get("bet-hl").liveExecutionGate.gate === "blocked"
    && byPlannedFamily.get("register").liveExecutionGate.gate === "supervised_authorization_required"
    && byPlannedFamily.get("human-link").liveExecutionGate.gate === "supervised_authorization_required",
  installedRuntimeTruth: readiness.canRead === true
    && readiness.canWrite === false
    && toolkitManifest.source === "omniweb-toolkit"
    && toolkitManifest.coverage.readCapabilities > 0,
};
const ok = Object.values(checks).every(Boolean);
if (!ok) {
  throw new Error("whole-spectrum consumer checks failed: " + JSON.stringify(checks));
}

console.log(JSON.stringify({
  ok,
  imports: {
    root: requiredRootExports,
    runtime: requiredRuntimeExports,
    agent: requiredAgentExports,
    types: "side-effect import ok",
  },
  checks,
  proof: {
    transport: {
      rssTitle: rss.title,
      sseOpensByDefault: streamPlan.opensStream,
      eventsParsed: streamEvents.length,
      authState: authExpired.state,
    },
    readProfile: {
      coveredFamilies: readCoverage.coveredFamilies,
      unsupportedFamilies: readCoverage.unsupportedFamilies,
    },
    chatWebhook: {
      operationCount: root.CHAT_WEBHOOK_SURFACE.length,
      gates: chatPlans.map((plan) => ({ operation: plan.operation, executionGate: plan.executionGate })),
    },
    marketRead: {
      coveredFamilies: marketReadCoverage.coveredFamilies,
      driftedFamilies: marketReadCoverage.driftedFamilies,
    },
    marketWrite: {
      families: marketWriteMatrix.intents.map((intent) => ({
        family: intent.family,
        capabilityStatus: intent.capabilityStatus,
        admissibilityStatus: intent.admissibilityStatus,
        canExecuteNow: intent.canExecuteNow,
      })),
      unsupportedFamilies: marketWriteMatrix.summary.unsupportedFamilies,
      deploymentBlockedFamilies: marketWriteMatrix.summary.deploymentBlockedFamilies,
    },
    operatorActions: multiActionPlan.plannedIntents.map((intent) => ({
      actionFamily: intent.actionFamily,
      status: intent.status,
      lifecycleStatus: intent.lifecycleStatus,
      admissibility: intent.admissibility.status,
      liveExecutionGate: intent.liveExecutionGate.gate,
      spendsDem: intent.readiness.spendsDem,
    })),
  },
  contract: {
    ownerBead: "omniweb-agents-spectrum.10",
    noSpend: true,
    noMutation: true,
    liveExecution: false,
    publicRegistryProof: false,
    release: false,
    unsupportedAndBlockedVerdictsAreExpected: [
      "levels advertised_but_404",
      "chat/webhook auth_required or explicit_execute_required",
      "ETH market deployment_disabled",
      "graduation server_error",
      "binary/commodity/sports write families unsupported",
      "identity actions supervised_authorization_required",
      "higher-lower operator execution blocked pending current recheck",
    ],
  },
}, null, 2));

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
    credentialSourcesChecked: ["deterministic-no-spend-tarball-check"],
    runtimeCredentialSource: "deterministic-no-spend-tarball-check",
    notes: ["Synthetic runtime capability truth for deterministic no-spend local-tarball proof."],
  };
  const readyAction = {
    declared: true,
    executable: true,
    readiness: "ready",
    requiresWallet: true,
    requiresAttestation: false,
    requiresTargetPost: false,
    requiresMarketContext: false,
    proofLevel: "real_runtime_action_family",
    notes: ["Synthetic capability used only for no-spend local-tarball proof."],
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
`;
}
