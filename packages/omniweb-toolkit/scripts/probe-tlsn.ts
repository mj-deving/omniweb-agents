#!/usr/bin/env npx tsx
/**
 * probe-tlsn.ts - no-spend TLSN proof lane preview.
 *
 * Default behavior is preview-only. It validates the target URL, explicit
 * wallet profile, runtime dependency shape, redaction plan, and fee policy
 * without requesting a TLSN token, generating a TLSN presentation, or storing
 * a proof. A live TLSN proof remains blocked unless a concrete no-spend quote
 * and sanitized proof-material plan are available.
 */

import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { getNumberArg, getStringArg, hasFlag, PACKAGE_ROOT, REPO_ROOT } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";
import { validateUrl } from "../../../src/toolkit/url-validator.js";
import { classifyTLSNReadiness } from "../src/tlsn-readiness-classifier.js";

const args = process.argv.slice(2);
const require = createRequire(import.meta.url);

const DEFAULT_MAX_PROOF_BYTES = 16_384;
const DEFAULT_HARD_BUDGET_DEM = 5;
const TOKEN_REQUEST_DEM = 1;

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-tlsn.ts --agent-name NAME --url URL [options]

Options:
  --url URL              Public HTTPS URL to review for TLSN proof eligibility
  --agent-name NAME      Use a named credentials profile; required unless --env-path is supplied
  --env-path PATH        Wallet credentials file; alternative to --agent-name
  --state-dir PATH       Override runtime state directory
  --max-proof-bytes N    Maximum proof/transcript bytes for quote estimate; default ${DEFAULT_MAX_PROOF_BYTES}
  --budget-dem N         Hard lane budget ceiling; default ${DEFAULT_HARD_BUDGET_DEM}
  --broadcast            Refuse live execution unless every preview gate is green
  --proof-out PATH       Write the JSON proof report to this path
  --help, -h             Show this help

Output: JSON TLSN preview report with redacted local paths and no proof material
Exit codes: 0 = classified report emitted, 1 = runtime failure before reporting, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--url",
  "--agent-name",
  "--env-path",
  "--state-dir",
  "--max-proof-bytes",
  "--budget-dem",
  "--proof-out",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const url = getStringArg(args, "--url");
const agentName = getStringArg(args, "--agent-name") || undefined;
const envPath = getStringArg(args, "--env-path") || undefined;
const stateDir = getStringArg(args, "--state-dir") || undefined;
const maxProofBytes = getNumberArg(args, "--max-proof-bytes") ?? DEFAULT_MAX_PROOF_BYTES;
const budgetDem = getNumberArg(args, "--budget-dem") ?? DEFAULT_HARD_BUDGET_DEM;
const broadcast = hasFlag(args, "--broadcast");
const proofOut = normalizeProofOut(getStringArg(args, "--proof-out"));
const command = redactProbeCommand(process.argv);

if (!url) {
  console.error("Error: --url is required");
  process.exit(2);
}
if (!Number.isFinite(maxProofBytes) || maxProofBytes <= 0) {
  console.error("Error: --max-proof-bytes must be a positive finite number");
  process.exit(2);
}
if (!Number.isFinite(budgetDem) || budgetDem <= 0) {
  console.error("Error: --budget-dem must be a positive finite number");
  process.exit(2);
}

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: true, purpose: "TLSN preview/live" },
  );
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

try {
  const target = await summarizeTargetUrl(url);
  const dependencyReadiness = await inspectDependencyReadiness();
  const quote = buildQuoteSummary(maxProofBytes, budgetDem);
  const redactionPlan = buildRedactionPlan();
  const readiness = classifyTLSNReadiness({
    targetUrlValid: target.validation.valid,
    requiredDependenciesReady:
      dependencyOk(dependencyReadiness, "localBridge")
      && dependencyOk(dependencyReadiness, "packageRuntime")
      && dependencyOk(dependencyReadiness, "playwright")
      && dependencyOk(dependencyReadiness, "tlsnJs")
      && dependencyOk(dependencyReadiness, "tlsnJsBuild"),
    optionalDependencyWarnings: dependencyOk(dependencyReadiness, "sdkTlsnotarySubpath")
      ? []
      : ["tlsn_sdk_tlsnotary_subpath_unreliable"],
    concreteQuote: quote.concrete,
    estimatedWorstCaseDem: quote.estimatedWorstCaseDem,
    hardBudgetDem: quote.hardBudgetDem,
    sanitizedProofMaterialPath: null,
    proofMaterialSanitizerProven: redactionPlan.proofMaterialSanitizableBeforeLive,
  });
  const liveGate = buildLiveGate({
    broadcast,
    targetOk: target.validation.valid,
    dependencyReadiness,
    quoteConcrete: quote.concrete,
    quoteWithinBudget: quote.withinBudget,
    proofMaterialSanitizable: false,
  });

  emitJsonReport({
    attemptedBroadcast: false,
    liveFlagPresent: broadcast,
    ok: readiness.ok,
    status: readiness.verdict,
    command,
    bead: "omniweb-agents-9st0.5",
    runtimeTarget: summarizeProbeRuntimeTarget({ envPath, agentName, stateDir }),
    target,
    dependencyReadiness,
    quote,
    redactionPlan,
    successorReadiness: readiness,
    liveGate,
    noSpendGuarantee: [
      "does not call omni.colony.attestTlsn",
      "does not request tlsnotary token",
      "does not start browser TLSN proof",
      "does not store proof on-chain or IPFS",
      "does not emit TLSN presentation, transcript, secrets, attestation hex, or signed payload",
    ],
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function summarizeTargetUrl(rawUrl: string): Promise<Record<string, unknown>> {
  let parsed: URL | null = null;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // validateUrl will return the user-facing invalid-url reason.
  }
  const validation = await validateUrl(rawUrl);
  return {
    reviewedUrl: parsed ? `${parsed.origin}${parsed.pathname}` : rawUrl,
    queryRedacted: parsed ? parsed.search.length > 0 : false,
    method: "GET",
    validation,
  };
}

async function inspectDependencyReadiness(): Promise<Record<string, unknown>> {
  const localBridgePath = resolve(REPO_ROOT, "src", "lib", "tlsn-playwright-bridge.ts");
  const tlsnRuntimePath = resolve(PACKAGE_ROOT, "src", "tlsn-runtime.ts");
  const tlsnBuild = inspectTlsnJsBuild();
  const sdkTlsnotarySubpath = await inspectDynamicImport("@kynesyslabs/demosdk/tlsnotary");

  return {
    localBridge: {
      ok: existsSync(localBridgePath),
      path: "src/lib/tlsn-playwright-bridge.ts",
    },
    packageRuntime: {
      ok: existsSync(tlsnRuntimePath),
      path: "packages/omniweb-toolkit/src/tlsn-runtime.ts",
    },
    playwright: inspectResolvable("playwright"),
    tlsnJs: inspectResolvable("tlsn-js"),
    tlsnJsBuild: tlsnBuild,
    sdkTlsnotarySubpath: {
      ...sdkTlsnotarySubpath,
      requiredForMaintainedBridge: false,
      note: "The maintained bridge uses tlsn-js browser/WASM assets; this SDK subpath is tracked because prior inventory found it unreliable in Node.",
    },
  };
}

function inspectResolvable(specifier: string): Record<string, unknown> {
  try {
    require.resolve(specifier);
    return { ok: true, specifier, resolved: "present-redacted" };
  } catch (err) {
    return {
      ok: false,
      specifier,
      error: sanitizeError(err),
    };
  }
}

function inspectTlsnJsBuild(): Record<string, unknown> {
  try {
    const libPath = require.resolve("tlsn-js/build/lib.js");
    const files = readdirSync(dirname(libPath));
    const wasmAsset = files.find((name) => /^[a-f0-9]{20}\.wasm$/i.test(name));
    return {
      ok: Boolean(wasmAsset),
      lib: "tlsn-js/build/lib.js",
      wasmAsset: wasmAsset ? "present-redacted" : null,
    };
  } catch (err) {
    return {
      ok: false,
      lib: "tlsn-js/build/lib.js",
      error: sanitizeError(err),
    };
  }
}

async function inspectDynamicImport(specifier: string): Promise<Record<string, unknown>> {
  try {
    await import(specifier);
    return { ok: true, specifier };
  } catch (err) {
    return {
      ok: false,
      specifier,
      error: sanitizeError(err),
    };
  }
}

function buildQuoteSummary(maxBytes: number, budget: number): Record<string, unknown> {
  const proofSizeKb = Math.ceil(maxBytes / 1024);
  const protocolStorageFeeDem = 1 + proofSizeKb;
  const estimatedStorageFeeDem = 2 * protocolStorageFeeDem;
  const estimatedWorstCaseDem = TOKEN_REQUEST_DEM + estimatedStorageFeeDem;
  return {
    concrete: false,
    reason: "No maintained no-spend TLSN quote endpoint is available; this is a policy estimate from SDK/reference fee rules, not a product quote.",
    source: "identity-attestation-messaging-network-crypto-inventory-2026-05-22.md plus tlsn-playwright-bridge.ts fee formula",
    tokenRequestDem: TOKEN_REQUEST_DEM,
    maxProofBytes: maxBytes,
    estimatedProofSizeKb: proofSizeKb,
    protocolStorageFeeDem,
    bridgeSafetyMultiplier: 2,
    estimatedStorageFeeDem,
    estimatedWorstCaseDem,
    hardBudgetDem: budget,
    withinBudget: estimatedWorstCaseDem <= budget,
  };
}

function buildRedactionPlan(): Record<string, unknown> {
  return {
    persistAllowed: [
      "reviewed URL origin/path with query redacted",
      "HTTP method",
      "dependency readiness booleans",
      "fee estimate metadata",
      "credential target kind and public agent name",
      "future tx hashes/token id only if live proof passes all gates",
    ],
    persistForbidden: [
      "TLSN presentation JSON",
      "raw transcript sent/received bytes",
      "attestationHex",
      "secretsHex",
      "proof byte ranges",
      "session URL",
      "proxy URL",
      "notary websocket URL",
      "signed transactions or signatures",
      "credentials, tokens, or local credential paths",
    ],
    proofMaterialSanitizableBeforeLive: false,
    blocker: "The current maintained bridge returns presentation material from the browser proof path; no sanitizer has been proven on a real proof artifact in this no-spend preview.",
  };
}

function buildLiveGate(input: {
  broadcast: boolean;
  targetOk: boolean;
  dependencyReadiness: Record<string, unknown>;
  quoteConcrete: boolean;
  quoteWithinBudget: boolean;
  proofMaterialSanitizable: boolean;
}): Record<string, unknown> {
  const reasons: string[] = [];
  if (!input.targetOk) reasons.push("target URL validation failed");
  if (!dependencyOk(input.dependencyReadiness, "localBridge")) reasons.push("local TLSN bridge missing");
  if (!dependencyOk(input.dependencyReadiness, "packageRuntime")) reasons.push("package TLSN runtime missing");
  if (!dependencyOk(input.dependencyReadiness, "playwright")) reasons.push("playwright runtime unavailable");
  if (!dependencyOk(input.dependencyReadiness, "tlsnJs")) reasons.push("tlsn-js package unavailable");
  if (!dependencyOk(input.dependencyReadiness, "tlsnJsBuild")) reasons.push("tlsn-js browser/WASM asset unavailable");
  if (!input.quoteConcrete) reasons.push("storage quote is not concrete");
  if (!input.quoteWithinBudget) reasons.push("estimated worst-case fee exceeds hard lane budget");
  if (!input.proofMaterialSanitizable) reasons.push("sanitized proof material path is not proven");

  return {
    ok: reasons.length === 0,
    explicitLiveFlag: "--broadcast",
    liveRequested: input.broadcast,
    liveExecutionAttempted: false,
    reasons,
  };
}

function dependencyOk(readiness: Record<string, unknown>, key: string): boolean {
  const value = readiness[key];
  return typeof value === "object" && value !== null && (value as Record<string, unknown>).ok === true;
}

function sanitizeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message
    .replaceAll(REPO_ROOT, "<redacted-repo-path>")
    .replaceAll(PACKAGE_ROOT, "<redacted-package-path>")
    .replace(/file:\/\/\/[^\s'")]+/g, "file://<redacted-local-path>")
    .replace(/\/(?:home|Users|tmp|private|var|mnt|workspace)\/[^\s'")]+/g, "<redacted-local-path>");
}

function normalizeProofOut(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (isAbsolute(raw)) return raw;
  return raw.startsWith("packages/") ? resolve(REPO_ROOT, raw) : raw;
}
