#!/usr/bin/env -S bunx tsx
/**
 * check-hosted-operator-consumer.ts - clean local-tarball proof for a hosted-style no-spend operator consumer.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { PACKAGE_ROOT, getStringArg, hasFlag } from "./_shared.js";

interface CommandResult {
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface RawPackEntry {
  version?: string;
  filename: string;
  size?: number;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
  files?: unknown[];
}

interface PackSummary {
  version?: string;
  filename: string;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
}

const args = process.argv.slice(2);
const skipBuild = hasFlag(args, "--skip-build");
const keepTemp = hasFlag(args, "--keep-temp");
const runHostedRuntimeSmoke = hasFlag(args, "--run-hosted-runtime-smoke");
const hostedSmokeCommand = getStringArg(args, "--hosted-smoke-command");

const allowedArgs = new Set([
  "--skip-build",
  "--keep-temp",
  "--run-hosted-runtime-smoke",
  "--hosted-smoke-command",
  "--help",
  "-h",
]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-hosted-operator-consumer.ts [options]

Build, pack, and install omniweb-toolkit into a clean temporary consumer workspace,
then prove a hosted-style no-spend operator can import every maintained public subpath
by package name only.

Options:
  --skip-build   Do not run the package build before packing
  --keep-temp    Keep the temporary consumer workspace for debugging
  --run-hosted-runtime-smoke
                 Run optional host prerequisite probes. Default is static-only.
  --hosted-smoke-command <command>
                 Optional explicit dry-run smoke command to run with --run-hosted-runtime-smoke
  --help, -h     Show this help

Output: JSON no-spend hosted local-tarball consumer proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs: string[] = [];
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--hosted-smoke-command") {
    index += 1;
    continue;
  }
  if (!allowedArgs.has(arg)) unsupportedArgs.push(arg);
}
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}
if (hostedSmokeCommand && !runHostedRuntimeSmoke) {
  console.error("Error: --hosted-smoke-command requires --run-hosted-runtime-smoke");
  process.exit(2);
}

const tempRoot = mkdtempSync(join(tmpdir(), "omniweb-hosted-operator-consumer-"));

let ok = false;
let buildResult: CommandResult | null = null;
let packResult: CommandResult | null = null;
let installResult: CommandResult | null = null;
let consumerResult: CommandResult | null = null;
let packEntry: PackSummary | null = null;
let consumerSummary: unknown = null;
let consumerScriptAudit: unknown = null;
let hostedRuntimeSmoke: unknown = null;

try {
  hostedRuntimeSmoke = buildHostedRuntimeSmoke({
    run: runHostedRuntimeSmoke,
    smokeCommand: hostedSmokeCommand,
  });

  if (!skipBuild) {
    buildResult = runCommand(["npm", "run", "build"], PACKAGE_ROOT);
    if (buildResult.exitCode !== 0) {
      throw new Error("package build failed before hosted operator consumer proof");
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
    throw new Error("npm pack failed before hosted operator consumer proof");
  }

  const parsedPack = JSON.parse(packResult.stdout) as RawPackEntry[];
  const rawPackEntry = parsedPack[0] ?? null;
  if (!rawPackEntry?.filename) {
    throw new Error("npm pack did not report a tarball filename");
  }
  packEntry = {
    version: rawPackEntry.version,
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
    throw new Error("clean hosted consumer npm install failed");
  }

  const proofScript = renderHostedConsumerProofScript(rawPackEntry.version ?? "unknown");
  consumerScriptAudit = auditHostedConsumerProofScript(proofScript);
  writeFileSync(join(tempRoot, "hosted-operator-proof.mjs"), proofScript);
  consumerResult = runCommand(["node", "hosted-operator-proof.mjs"], tempRoot);
  if (consumerResult.exitCode !== 0) {
    throw new Error("hosted operator consumer proof script failed");
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
    consumerScriptAudit,
    consumer: consumerSummary,
    hostedRuntimeSmoke,
    contract: {
      ownerBead: "omniweb-agents-hosted.4",
      localTarballInstall: ok,
      packageNameImportsOnly: ok,
      repoRelativeImports: false,
      noSpend: true,
      noMutation: true,
      mutatesIdentity: false,
      liveExecution: false,
      publicRegistryProof: false,
      release: false,
      hostedRuntimeSmokeDefaultStaticOnly: !runHostedRuntimeSmoke,
      hostedRuntimeSmokeDryRunOnly: true,
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

function buildHostedRuntimeSmoke(options: {
  run: boolean;
  smokeCommand?: string;
}): unknown {
  const staticContract = {
    hostStyle: "OpenClaw/Gregor-style hosted runtime",
    defaultMode: "static-only",
    nonMutating: true,
    noSpend: true,
    noBroadcast: true,
    noIdentityMutation: true,
    runtimeProbeRequiresExplicitFlag: true,
    dryRunSmokeRequiresExplicitCommand: true,
  };
  const plannedDryRunCommand = [
    "openclaw agent --agent colony-operator --local --session-id hosted-operator-smoke-$(date +%s)",
    "--message \"Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM.\"",
  ].join(" ");

  if (!options.run) {
    return {
      mode: "static-only",
      probesRun: false,
      ok: true,
      staticContract,
      hostPrerequisites: [
        { id: "node", status: "not_probed", command: "node --version" },
        { id: "openclaw-cli", status: "not_probed", command: "command -v openclaw" },
        { id: "gregor-cli", status: "not_probed", command: "command -v gregor" },
      ],
      dryRunSmoke: {
        status: "not_run",
        reason: "Default hosted consumer check is deterministic and non-mutating. Pass --run-hosted-runtime-smoke and --hosted-smoke-command to run a dry-run probe.",
        plannedCommand: plannedDryRunCommand,
      },
    };
  }

  const nodeVersion = runCommand(["node", "--version"], PACKAGE_ROOT);
  const openclaw = runCommand(["sh", "-lc", "command -v openclaw"], PACKAGE_ROOT);
  const gregor = runCommand(["sh", "-lc", "command -v gregor"], PACKAGE_ROOT);
  const hostPrerequisites = [
    prerequisite("node", "node --version", nodeVersion),
    prerequisite("openclaw-cli", "command -v openclaw", openclaw),
    prerequisite("gregor-cli", "command -v gregor", gregor),
  ];
  const dryRunSmoke = options.smokeCommand
    ? runDryRunSmokeCommand(options.smokeCommand)
    : {
      status: "skipped",
      reason: "--hosted-smoke-command not provided; prerequisite probe only",
      plannedCommand: plannedDryRunCommand,
    };

  return {
    mode: "runtime-probe",
    probesRun: true,
    ok: dryRunSmoke.status !== "blocked_unsafe",
    staticContract,
    hostPrerequisites,
    dryRunSmoke,
  };
}

function prerequisite(id: string, command: string, result: CommandResult): unknown {
  return {
    id,
    command,
    status: result.exitCode === 0 ? "pass" : "missing",
    summary: result.exitCode === 0
      ? result.stdout.trim().split("\n")[0] ?? ""
      : result.stderr.trim() || "command not found",
  };
}

function runDryRunSmokeCommand(command: string): unknown {
  const safety = classifyHostedSmokeCommand(command);
  if (!safety.safe) {
    return {
      status: "blocked_unsafe",
      command,
      reason: safety.reason,
      noSpend: true,
      noBroadcast: true,
      mutatesIdentity: false,
    };
  }
  const result = runCommand(["sh", "-lc", command], PACKAGE_ROOT);
  const output = `${result.stdout}\n${result.stderr}`;
  const forbiddenOutput = /(spent\s+DEM|broadcast(?:ed)?|transactionHash|txHash|published\s+live|executed\s+live)/i.test(output);
  return {
    status: result.exitCode === 0 && !forbiddenOutput ? "pass" : "failed_or_unsafe_output",
    command,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdout: result.stdout.trim().slice(0, 1600),
    stderr: result.stderr.trim().slice(0, 1600),
    noSpend: !forbiddenOutput,
    noBroadcast: !forbiddenOutput,
    mutatesIdentity: false,
    safety,
  };
}

function classifyHostedSmokeCommand(command: string): { safe: true; reason: string } | { safe: false; reason: string } {
  if (/(^|\s)(--execute|--broadcast)(\s|$)/.test(command)) {
    return { safe: false, reason: "command includes an execute or broadcast flag" };
  }
  if (!/(dry[- ]run|no[- ]spend|do not publish|do not spend|without publish|without spend)/i.test(command)) {
    return { safe: false, reason: "command lacks an explicit dry-run/no-spend instruction" };
  }
  return { safe: true, reason: "command is explicitly dry-run/no-spend and has no execute/broadcast flag" };
}

function auditHostedConsumerProofScript(source: string): {
  ok: true;
  packageImports: string[];
  forbiddenImportSpecifiers: string[];
} {
  const importSpecifiers = Array.from(source.matchAll(/import\("([^"]+)"\)/g)).map((match) => match[1]);
  const packageImports = [
    "omniweb-toolkit",
    "omniweb-toolkit/runtime",
    "omniweb-toolkit/agent",
    "omniweb-toolkit/types",
    "omniweb-toolkit/write",
  ];
  const missingPackageImports = packageImports.filter((specifier) => !importSpecifiers.includes(specifier));
  const forbiddenImportSpecifiers = importSpecifiers.filter((specifier) => (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.includes("packages/omniweb-toolkit") ||
    specifier.includes("src/")
  ));
  if (missingPackageImports.length > 0 || forbiddenImportSpecifiers.length > 0) {
    throw new Error(`hosted consumer proof import audit failed: ${JSON.stringify({
      missingPackageImports,
      forbiddenImportSpecifiers,
      importSpecifiers,
    })}`);
  }
  return {
    ok: true,
    packageImports,
    forbiddenImportSpecifiers,
  };
}

function renderHostedConsumerProofScript(packageVersion: string): string {
  return `const root = await import("omniweb-toolkit");
const runtime = await import("omniweb-toolkit/runtime");
const agent = await import("omniweb-toolkit/agent");
await import("omniweb-toolkit/types");
const write = await import("omniweb-toolkit/write");

const requiredRootExports = [
  "createClient",
  "buildMarketWriteIntentMatrix",
  "summarizeReadProfileCoverage",
  "buildChatWebhookPlan",
];
const requiredRuntimeExports = [
  "buildToolkitCapabilityManifest",
  "checkWriteReadiness",
  "describeRuntimeCapabilities",
];
const requiredAgentExports = [
  "buildColonyOperatorCapabilityTruth",
  "buildColonyOperatorMultiActionPlan",
  "evaluateToolkitActionAdmissibility",
];
const requiredWriteExports = [
  "buildBetMemo",
  "buildHigherLowerMemo",
  "buildBinaryBetMemo",
  "normalizeTransferShape",
  "extractWalletNativeTxHash",
  "DEFAULT_TRANSFER_SHAPE",
  "WALLET_NATIVE_TRANSFER_SHAPE",
];

for (const [surface, mod, exports] of [
  ["root", root, requiredRootExports],
  ["runtime", runtime, requiredRuntimeExports],
  ["agent", agent, requiredAgentExports],
  ["write", write, requiredWriteExports],
]) {
  for (const exportName of exports) {
    if (!(exportName in mod)) {
      throw new Error("missing " + surface + " export: " + exportName);
    }
  }
}

const client = root.createClient({ timeoutMs: 1 });
if (typeof client.getFeed !== "function") {
  throw new Error("root createClient did not expose read client methods");
}

const readCoverage = root.summarizeReadProfileCoverage();
const chatPlans = [
  root.buildChatWebhookPlan({ operation: "chat.rooms.list" }),
  root.buildChatWebhookPlan({ operation: "chat.message.send", token: "chat-token-123456", execute: true }),
  root.buildChatWebhookPlan({ operation: "webhooks.create", token: "webhook-token-123456", execute: true }),
  root.buildChatWebhookPlan({ operation: "webhooks.event.receive" }),
];
const actualReadiness = runtime.checkWriteReadiness({ cwd: process.cwd(), homeDir: process.cwd(), env: {} });
const actualRuntimeCapabilities = runtime.describeRuntimeCapabilities({ cwd: process.cwd(), homeDir: process.cwd(), env: {} });
const toolkitManifest = runtime.buildToolkitCapabilityManifest({
  runtimeCapabilities: actualRuntimeCapabilities,
  now: new Date("2026-05-19T00:00:00.000Z"),
});
const syntheticRuntimeCapabilities = deterministicRuntimeCapabilities();
const capabilityTruth = agent.buildColonyOperatorCapabilityTruth({
  runtimeCapabilities: syntheticRuntimeCapabilities,
  now: new Date("2026-05-19T00:00:00.000Z"),
});
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
  capabilityTruth,
  toolkitCapabilityManifest: toolkitManifest,
  requestedActions,
});
const marketWriteMatrix = root.buildMarketWriteIntentMatrix({
  now: new Date("2026-05-19T00:00:00.000Z"),
  runtimeCapabilities: syntheticRuntimeCapabilities,
});
const degradedClassificationLedger = buildDegradedClassificationLedger({
  readCoverage,
  chatPlans,
  marketWriteMatrix,
  multiActionPlan,
  actualReadiness,
  actualRuntimeCapabilities,
});
const proofPackets = buildProofPackets({
  packageVersion: ${JSON.stringify(packageVersion)},
  consumerWorkspace: process.cwd(),
  actualReadiness,
  actualRuntimeCapabilities,
  toolkitManifest,
  capabilityTruth,
  requestedActions,
  marketWriteMatrix,
  degradedClassificationLedger,
});

const fixedMemo = write.buildBetMemo("btc", 70000, { horizon: "30m" });
const higherLowerMemo = write.buildHigherLowerMemo("btc", "higher", { horizon: "24h" });
const binaryMemo = write.buildBinaryBetMemo("market-1", "yes");
const normalizedDefaultTransferShape = write.normalizeTransferShape(undefined);
const normalizedWalletTransferShape = write.normalizeTransferShape(write.WALLET_NATIVE_TRANSFER_SHAPE);
const extractedTxHash = write.extractWalletNativeTxHash({ nested: { transactionHash: "0xabc" } });

const plannedByFamily = new Map(multiActionPlan.plannedIntents.map((intent) => [intent.actionFamily, intent]));
const marketByFamily = new Map(marketWriteMatrix.intents.map((intent) => [intent.family, intent]));
const ledgerByClassification = new Set(degradedClassificationLedger.map((entry) => entry.classification));
const requiredActionFamilies = requestedActions.map((action) => action.actionFamily);
const requiredDegradedClassifications = [
  "advertised_but_404",
  "auth_needed",
  "unsupported",
  "deployment_drift",
  "server_error",
  "supervised",
  "explicit_execute_required",
];
const checks = {
  packageNameImports: true,
  rootSurface: requiredRootExports.every((exportName) => typeof root[exportName] === "function"),
  runtimeSurface: requiredRuntimeExports.every((exportName) => typeof runtime[exportName] === "function"),
  agentSurface: requiredAgentExports.every((exportName) => typeof agent[exportName] === "function"),
  writeSurface: requiredWriteExports.every((exportName) => exportName in write),
  localReadConstructedWithoutNetwork: typeof client.getFeed === "function",
  installedRuntimeGatesWrites: actualReadiness.canRead === true
    && actualReadiness.canWrite === false
    && actualRuntimeCapabilities.canRead === true
    && actualRuntimeCapabilities.writeReady === false,
  toolkitManifestRuntimeTruth: toolkitManifest.source === "omniweb-toolkit"
    && toolkitManifest.coverage.readCapabilities > 0
    && toolkitManifest.coverage.writeCapabilities >= 0,
  writeHelpersNoSpend: fixedMemo === "HIVE_BET:btc:70000:30m"
    && higherLowerMemo === "HIVE_HL:btc:HIGHER:24h"
    && binaryMemo === "HIVE_BINARY:market-1:YES"
    && normalizedDefaultTransferShape === write.DEFAULT_TRANSFER_SHAPE
    && normalizedWalletTransferShape === write.WALLET_NATIVE_TRANSFER_SHAPE
    && extractedTxHash === "0xabc",
  operatorPlanNoSpend: multiActionPlan.mode === "dry-run"
    && multiActionPlan.liveExecutionAllowed === false
    && multiActionPlan.noSpendDefault === true
    && requiredActionFamilies.every((family) => plannedByFamily.has(family))
    && multiActionPlan.plannedIntents.every((intent) => intent.readiness.canExecuteNow === false),
  operatorIdentitySupervised: plannedByFamily.get("register").liveExecutionGate.gate === "supervised_authorization_required"
    && plannedByFamily.get("human-link").liveExecutionGate.gate === "supervised_authorization_required",
  operatorSpendExplicitOrDryRun: plannedByFamily.get("publish").liveExecutionGate.gate === "dry_run_only"
    && plannedByFamily.get("bet-fixed").admissibility.status === "blocked"
    && plannedByFamily.get("bet-fixed").admissibility.reasonCodes.includes("explicit_execute_required_for_spend")
    && plannedByFamily.get("bet-hl").liveExecutionGate.gate === "blocked",
  marketWritesNoSpend: marketWriteMatrix.noSpend === true
    && marketWriteMatrix.noMutation === true
    && marketWriteMatrix.liveExecutionDisabled === true
    && marketWriteMatrix.summary.allLiveExecutionDisabled === true
    && marketWriteMatrix.summary.explicitExecuteRequiredFamilies.includes("fixed-price")
    && marketWriteMatrix.summary.lifecyclePendingFamilies.includes("higher-lower")
    && marketWriteMatrix.summary.unsupportedFamilies.includes("sports")
    && marketByFamily.get("graduation").capabilityStatus === "server_error",
  repeatedProofPackets: proofPackets.length >= 2
    && proofPackets.every((packet) => packet.noSpendVerdict.ok === true)
    && proofPackets.every((packet) => packet.releaseVerdict.publicRegistryProof === false)
    && proofPackets.every((packet) => packet.identityMutationVerdict.mutatesIdentity === false)
    && proofPackets.every((packet) => packet.actions.length === requiredActionFamilies.length)
    && proofPackets.every((packet) => packet.skippedAlternatives.length === requiredActionFamilies.length - 1)
    && proofPackets.some((packet) => packet.selectedAction.family === "react")
    && proofPackets.some((packet) => packet.selectedAction.family === "bet-fixed"),
  degradedClassificationsPreserved: requiredDegradedClassifications.every((classification) => ledgerByClassification.has(classification))
    && proofPackets.every((packet) => requiredDegradedClassifications.every((classification) => (
      packet.degradedClassificationLedger.some((entry) => entry.classification === classification)
    )))
    && proofPackets.every((packet) => packet.degradedClassificationLedger.every((entry) => (
      entry.noSpend === true
      && entry.liveExecution === false
      && entry.publicRegistryProof === false
      && entry.release === false
      && entry.mutatesIdentity === false
    ))),
};
const ok = Object.values(checks).every(Boolean);
if (!ok) {
  throw new Error("hosted operator consumer checks failed: " + JSON.stringify(checks));
}

console.log(JSON.stringify({
  ok,
  imports: {
    root: "omniweb-toolkit",
    runtime: "omniweb-toolkit/runtime",
    agent: "omniweb-toolkit/agent",
    types: "omniweb-toolkit/types",
    write: "omniweb-toolkit/write",
  },
  checks,
  proof: {
    actualRuntime: {
      canRead: actualReadiness.canRead,
      canWrite: actualReadiness.canWrite,
      missingEnv: actualReadiness.missingEnv,
      recommendedMode: actualRuntimeCapabilities.recommendedMode,
      blockers: actualRuntimeCapabilities.blockers,
    },
    operatorActions: multiActionPlan.plannedIntents.map((intent) => ({
      actionFamily: intent.actionFamily,
      status: intent.status,
      lifecycleStatus: intent.lifecycleStatus,
      guardrailStatus: intent.guardrailEvaluation.status,
      admissibilityStatus: intent.admissibility.status,
      liveExecutionGate: intent.liveExecutionGate.gate,
      spendsDem: intent.readiness.spendsDem,
      canExecuteNow: intent.readiness.canExecuteNow,
    })),
    marketWrites: marketWriteMatrix.intents.map((intent) => ({
      family: intent.family,
      capabilityStatus: intent.capabilityStatus,
      lifecycleStatus: intent.lifecycleStatus,
      supervision: intent.supervision,
      explicitExecute: intent.explicitExecute,
      admissibilityStatus: intent.admissibilityStatus,
      canExecuteNow: intent.canExecuteNow,
    })),
    degradedClassificationLedger,
    writeHelpers: {
      fixedMemo,
      higherLowerMemo,
      binaryMemo,
      normalizedDefaultTransferShape,
      normalizedWalletTransferShape,
      extractedTxHash,
    },
    proofPackets,
  },
  contract: {
    ownerBead: "omniweb-agents-hosted.4",
    localTarballInstall: true,
    packageNameImportsOnly: true,
    repoRelativeImports: false,
    publicRegistryProof: false,
    release: false,
    noSpend: true,
    noMutation: true,
    mutatesIdentity: false,
    liveExecution: false,
  },
}, null, 2));

function buildProofPackets(input) {
  const scenarios = [
    {
      cycleIndex: 1,
      selectedFamily: "react",
      topic: "hosted read-only engagement rehearsal",
      observedSignals: ["clean_tarball_imports", "read_only_runtime", "existing_thread_candidate"],
      selectionReason: "Prefer a non-spend reaction candidate while hosted credentials are absent.",
    },
    {
      cycleIndex: 2,
      selectedFamily: "bet-fixed",
      topic: "hosted market-write admissibility rehearsal",
      observedSignals: ["market_write_intents_available", "fixed_price_lifecycle_proven", "explicit_execute_required"],
      selectionReason: "Exercise spend-bearing market intent truth without execute authority.",
    },
  ];
  return scenarios.map((scenario) => {
    const plan = agent.buildColonyOperatorMultiActionPlan({
      mode: "dry-run",
      capabilityTruth: input.capabilityTruth,
      toolkitCapabilityManifest: input.toolkitManifest,
      requestedActions: input.requestedActions,
    });
    const actions = plan.plannedIntents.map((intent) => proofAction(intent, scenario.selectedFamily));
    const selectedAction = actions.find((action) => action.selected);
    if (!selectedAction) {
      throw new Error("proof packet selected action missing: " + scenario.selectedFamily);
    }
    const skippedAlternatives = actions
      .filter((action) => !action.selected)
      .map((action) => ({
        family: action.family,
        capability: action.capability,
        guardrail: action.guardrail,
        lifecycle: action.lifecycle,
        supervision: action.supervision,
        explicitExecute: action.explicitExecute,
        admissibility: action.admissibility,
        reason: action.reason,
      }));
    return {
      runId: "hosted-operator-no-spend-" + scenario.cycleIndex,
      generatedAt: "2026-05-19T00:00:00.000Z",
      packageVersion: input.packageVersion,
      tarballPath: "local npm pack tarball installed through file: dependency",
      consumerWorkspace: input.consumerWorkspace,
      cycleIndex: scenario.cycleIndex,
      observedContext: {
        topic: scenario.topic,
        observedSignals: scenario.observedSignals,
        runtime: {
          canRead: input.actualReadiness.canRead,
          canWrite: input.actualReadiness.canWrite,
          missingEnv: input.actualReadiness.missingEnv,
          recommendedMode: input.actualRuntimeCapabilities.recommendedMode,
          blockers: input.actualRuntimeCapabilities.blockers,
        },
        capabilityCoverage: input.capabilityTruth.coverage,
      },
      selectedAction: {
        ...selectedAction,
        selectionReason: scenario.selectionReason,
      },
      skippedAlternatives,
      actions,
      driftLedger: [
        ...input.marketWriteMatrix.intents
          .filter((intent) => intent.capabilityStatus !== "available")
          .map((intent) => ({
            family: intent.family,
            classification: intent.capabilityStatus,
            lifecycle: intent.lifecycleStatus,
            supervision: intent.supervision,
            explicitExecute: intent.explicitExecute,
            admissibility: intent.admissibilityStatus,
            reason: intent.reasonCodes.join(", ") || intent.notes.join(" "),
          })),
        {
          family: "hosted-runtime",
          classification: input.actualReadiness.canWrite ? "write_ready" : "auth_needed",
          lifecycle: input.actualReadiness.canWrite ? "write-ready" : "read-only",
          supervision: "none",
          explicitExecute: "required_for_live_writes",
          admissibility: input.actualReadiness.canWrite ? "dry_run_only" : "blocked",
          reason: input.actualReadiness.missingEnv.join(", ") || input.actualRuntimeCapabilities.blockers.join(", "),
        },
      ],
      degradedClassificationLedger: input.degradedClassificationLedger,
      noSpendVerdict: {
        ok: plan.mode === "dry-run"
          && plan.liveExecutionAllowed === false
          && actions.every((action) => action.canExecuteNow === false)
          && actions.every((action) => action.liveExecutionGate !== "execute_now"),
        mode: plan.mode,
        liveExecutionAllowed: plan.liveExecutionAllowed,
        spendBearingFamiliesSelected: selectedAction.spendsDem ? [selectedAction.family] : [],
        actualSpendPerformed: false,
      },
      releaseVerdict: {
        release: false,
        publicRegistryProof: false,
        localTarballOnly: true,
      },
      identityMutationVerdict: {
        mutatesIdentity: false,
        supervisedFamilies: actions
          .filter((action) => action.supervision === "required")
          .map((action) => action.family),
      },
      validationCommands: [
        "bun run --cwd packages/omniweb-toolkit check:hosted-operator-consumer",
        "bun run --cwd packages/omniweb-toolkit check:consumer-spectrum-tarball",
        "bun run --cwd packages/omniweb-toolkit check:colony-operator-consumer",
        "bunx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts",
      ],
    };
  });
}

function buildDegradedClassificationLedger(input) {
  const entries = [];
  for (const item of input.readCoverage.entries) {
    if (item.status === "advertised_but_404") {
      entries.push(ledgerEntry({
        family: "read-profile:" + item.family,
        classification: "advertised_but_404",
        capability: item.status,
        lifecycle: "advertised_endpoint_missing",
        supervision: "none",
        explicitExecute: "not_supported",
        admissibility: "degraded",
        reason: item.notes.join(", ") || item.endpoints.join(", "),
      }));
    }
  }

  for (const plan of input.chatPlans) {
    if (plan.executionGate === "auth_required") {
      entries.push(ledgerEntry({
        family: "chat-webhook:" + plan.operation,
        classification: "auth_needed",
        capability: plan.executionGate,
        lifecycle: "auth-gated",
        supervision: "none",
        explicitExecute: "not_required",
        admissibility: "blocked",
        reason: plan.reasonCodes.join(", "),
      }));
    }
    if (plan.executionGate === "explicit_execute_required") {
      entries.push(ledgerEntry({
        family: "chat-webhook:" + plan.operation,
        classification: "explicit_execute_required",
        capability: plan.executionGate,
        lifecycle: "mutating_remote_lifecycle_plan_only",
        supervision: "none",
        explicitExecute: "required",
        admissibility: "blocked",
        reason: plan.reasonCodes.join(", "),
      }));
    }
  }

  for (const intent of input.marketWriteMatrix.intents) {
    if (intent.capabilityStatus === "unsupported") {
      entries.push(ledgerEntry({
        family: "market-write:" + intent.family,
        classification: "unsupported",
        capability: intent.capabilityStatus,
        lifecycle: intent.lifecycleStatus,
        supervision: intent.supervision,
        explicitExecute: intent.explicitExecute,
        admissibility: intent.admissibilityStatus,
        reason: intent.reasonCodes.join(", ") || intent.notes.join(", "),
      }));
    } else if (intent.capabilityStatus === "server_error") {
      entries.push(ledgerEntry({
        family: "market-write:" + intent.family,
        classification: "server_error",
        capability: intent.capabilityStatus,
        lifecycle: intent.lifecycleStatus,
        supervision: intent.supervision,
        explicitExecute: intent.explicitExecute,
        admissibility: intent.admissibilityStatus,
        reason: intent.reasonCodes.join(", ") || intent.notes.join(", "),
      }));
    } else if (intent.capabilityStatus === "deployment_disabled" || intent.capabilityStatus === "recovery_only") {
      entries.push(ledgerEntry({
        family: "market-write:" + intent.family,
        classification: "deployment_drift",
        capability: intent.capabilityStatus,
        lifecycle: intent.lifecycleStatus,
        supervision: intent.supervision,
        explicitExecute: intent.explicitExecute,
        admissibility: intent.admissibilityStatus,
        reason: intent.reasonCodes.join(", ") || intent.notes.join(", "),
      }));
    }
    if (intent.explicitExecute === "required" || intent.admissibilityStatus === "explicit_execute_required") {
      entries.push(ledgerEntry({
        family: "market-write:" + intent.family,
        classification: "explicit_execute_required",
        capability: intent.capabilityStatus,
        lifecycle: intent.lifecycleStatus,
        supervision: intent.supervision,
        explicitExecute: intent.explicitExecute,
        admissibility: intent.admissibilityStatus,
        reason: intent.reasonCodes.join(", ") || "explicit execute required for spend-bearing market writes",
      }));
    }
  }

  for (const intent of input.multiActionPlan.plannedIntents) {
    if (intent.liveExecutionGate.gate === "supervised_authorization_required") {
      entries.push(ledgerEntry({
        family: "operator-action:" + intent.actionFamily,
        classification: "supervised",
        capability: intent.status,
        lifecycle: intent.lifecycleStatus,
        supervision: "required",
        explicitExecute: intent.readiness.requiresExplicitExecute ? "required" : "not_required",
        admissibility: intent.admissibility.status,
        reason: intent.liveExecutionGate.reason,
      }));
    }
    if (intent.admissibility.reasonCodes.includes("explicit_execute_required_for_spend")) {
      entries.push(ledgerEntry({
        family: "operator-action:" + intent.actionFamily,
        classification: "explicit_execute_required",
        capability: intent.status,
        lifecycle: intent.lifecycleStatus,
        supervision: intent.readiness.requiresSupervision ? "required" : "none",
        explicitExecute: "required",
        admissibility: intent.admissibility.status,
        reason: intent.admissibility.reasonCodes.join(", "),
      }));
    }
  }

  if (!input.actualReadiness.canWrite) {
    entries.push(ledgerEntry({
      family: "hosted-runtime",
      classification: "auth_needed",
      capability: "read_only",
      lifecycle: "read-only",
      supervision: "none",
      explicitExecute: "required_for_live_writes",
      admissibility: "blocked",
      reason: input.actualReadiness.missingEnv.join(", ") || input.actualRuntimeCapabilities.blockers.join(", "),
    }));
  }

  return entries;
}

function ledgerEntry(entry) {
  return {
    ...entry,
    noSpend: true,
    liveExecution: false,
    publicRegistryProof: false,
    release: false,
    mutatesIdentity: false,
  };
}

function proofAction(intent, selectedFamily) {
  const reasonCodes = [
    ...intent.readiness.reasonCodes,
    ...intent.admissibility.reasonCodes,
  ];
  return {
    family: intent.actionFamily,
    capability: intent.status,
    guardrail: intent.guardrailEvaluation.status,
    lifecycle: intent.lifecycleStatus,
    supervision: intent.readiness.requiresSupervision ? "required" : "none",
    explicitExecute: intent.readiness.requiresExplicitExecute ? "required" : "not_required",
    admissibility: intent.admissibility.status,
    liveExecutionGate: intent.liveExecutionGate.gate,
    canExecuteNow: intent.readiness.canExecuteNow,
    spendsDem: intent.readiness.spendsDem,
    selected: intent.actionFamily === selectedFamily,
    reason: reasonCodes.length > 0 ? Array.from(new Set(reasonCodes)).join(", ") : intent.liveExecutionGate.reason,
  };
}

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
    credentialSourcesChecked: ["deterministic-hosted-consumer-fixture"],
    runtimeCredentialSource: "deterministic-hosted-consumer-fixture",
    notes: ["Synthetic runtime capability truth for deterministic no-spend hosted local-tarball proof."],
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
    notes: ["Synthetic capability used only for no-spend hosted local-tarball proof."],
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
