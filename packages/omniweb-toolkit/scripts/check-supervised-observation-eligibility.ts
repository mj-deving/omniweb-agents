#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  getStringArg,
  hasFlag,
  loadPackageExport,
  PACKAGE_ROOT,
  REPO_ROOT,
} from "./_shared.ts";

const SUPPORTED_DRAFT_TEMPLATES = ["ticker-spot-observation"] as const;
const TICKER_TEMPLATE_FIXED_SYMBOL = "BTC";
type DraftTemplate = typeof SUPPORTED_DRAFT_TEMPLATES[number];

type CommandResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

type WriteReadinessFn = (opts?: {
  cwd?: string;
  agentName?: string;
  envPath?: string;
  env?: Record<string, string | undefined>;
  homeDir?: string;
  packageResolver?: (specifier: string) => string;
}) => {
  ok: boolean;
  canRead: true;
  canAuth: boolean;
  canWrite: boolean;
  missingEnv: string[];
  missingPackages: string[];
  credentialSourcesChecked: string[];
  notes: string[];
};

type SourceView = unknown;
type AttestationWorkflowReport = {
  ok: boolean;
  readiness: string;
  draft?: {
    category?: string;
    textLength?: number;
    confidence?: number;
    primaryAttestUrl?: string;
  };
  blockers?: unknown[];
  warnings?: unknown[];
  recommendations?: string[];
  [key: string]: unknown;
};

type DraftResolution = {
  text: string;
  generated: boolean;
  template: DraftTemplate | null;
  sourceName: string | null;
  evidence: Record<string, unknown>;
};

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-observation-eligibility.ts [options]

No-spend combined eligibility gate for the minimal supervised OBSERVATION path.
It answers whether the first wallet-backed publish attempt is currently eligible.

Options:
  --text TEXT                  Factual OBSERVATION draft body (optional when using --draft-template)
  --draft-template NAME        Deterministic draft builder (supported: ${SUPPORTED_DRAFT_TEMPLATES.join(", ")})
  --ticker-symbol SYMBOL       Quote symbol for ticker template (default/fixed: BTC for ticker-spot-observation)
  --ticker-currency CODE       Quote currency for ticker template (default: USD)
  --attest-url URL             Primary attestation URL (default: Blockchain.info ticker JSON)
  --confidence N               Confidence value for draft preflight (default: 60)
  --source-name TEXT           Optional source label for audit output
  --env-path PATH              Explicit credential/env file to check
  --agent-name NAME            Use ~/.config/demos/credentials-NAME if present
  --allow-insecure             Allow HTTP attestation URLs for local dev only
  --help, -h                   Show this help

Exit codes:
  0 = eligible for first wallet-backed publish attempt
  1 = not eligible / blockers found
  2 = invalid args`);
  process.exit(0);
}

const draftTemplateArg = getStringArg(args, "--draft-template")?.trim() || null;
const draftTemplate = parseDraftTemplate(draftTemplateArg);
const textArg = getStringArg(args, "--text")?.trim() || null;
const attestUrl = getStringArg(args, "--attest-url")?.trim() || "https://blockchain.info/ticker";
const confidence = getOptionalNumber("--confidence", 60, 0, 100);
const sourceName = getStringArg(args, "--source-name") ?? null;
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name") ?? null;
const allowInsecure = hasFlag(args, "--allow-insecure");
const tickerSymbol = (getStringArg(args, "--ticker-symbol") ?? TICKER_TEMPLATE_FIXED_SYMBOL).trim().toUpperCase();
const tickerCurrency = (getStringArg(args, "--ticker-currency") ?? "USD").trim().toUpperCase();

if (textArg && draftTemplate) {
  console.error("Error: choose either --text or --draft-template, not both");
  process.exit(2);
}
if (!textArg && !draftTemplate) {
  console.error("Error: provide --text or --draft-template");
  process.exit(2);
}
if (draftTemplate === "ticker-spot-observation" && tickerSymbol !== TICKER_TEMPLATE_FIXED_SYMBOL) {
  console.error(
    `Error: --draft-template ticker-spot-observation only supports --ticker-symbol ${TICKER_TEMPLATE_FIXED_SYMBOL} because https://blockchain.info/ticker is a BTC spot feed`,
  );
  process.exit(2);
}

const packagePublish = runJsonScript("./scripts/check-npm-publish.ts");
const writeReadiness = await loadWriteReadiness();
const credentialReadiness = writeReadiness({
  cwd: PACKAGE_ROOT,
  envPath,
  agentName: agentName ?? undefined,
});
const draft = await resolveDraft({
  text: textArg,
  template: draftTemplate,
  attestUrl,
  sourceName,
  tickerSymbol,
  tickerCurrency,
});
const draftPreflight = await runDraftPreflight({
  text: draft.text,
  attestUrl,
  confidence,
  allowInsecure,
});

const gates = [
  {
    name: "package_publish",
    ok: packagePublish.ok,
    required: true,
    detail: packagePublish.ok
      ? (packagePublish.report?.releaseDecision ?? "package publish gate passed")
      : ((packagePublish.report?.nextAction ?? packagePublish.stderr) || packagePublish.stdout || "package publish gate failed"),
    blockers: packagePublish.report?.blockers ?? ["package_publish_failed"],
  },
  {
    name: "credential_readiness",
    ok: credentialReadiness.canAuth,
    required: true,
    detail: credentialReadiness.canAuth
      ? `credential source available via ${credentialReadiness.credentialSourcesChecked.join(" -> ")}`
      : `missing write credentials; checked ${credentialReadiness.credentialSourcesChecked.join(" -> ")}`,
    blockers: credentialReadiness.canAuth ? [] : ["missing_credentials"],
  },
  {
    name: "draft_quality_preflight",
    ok: draftPreflight.ok,
    required: true,
    detail: draftPreflight.ok
      ? `draft preflight passed at ${draft.text.length} chars`
      : summarizeDraftBlockers(draftPreflight),
    blockers: normalizeWorkflowBlockers(draftPreflight),
  },
];

const orderedRequirements = [
  "check:publish green",
  "credential readiness explicit",
  "draft quality gate green",
];
const blockers = gates.flatMap((gate) => gate.ok ? [] : gate.blockers);

const report = {
  ok: gates.every((gate) => gate.ok),
  checkedAt: new Date().toISOString(),
  mode: "no-spend-supervised-observation-eligibility",
  orderedRequirements,
  eligibleForWalletBackedPublish: gates.every((gate) => gate.ok),
  draft: {
    text: draft.text,
    textLength: draft.text.length,
    generated: draft.generated,
    template: draft.template,
    sourceName: draft.sourceName,
    evidence: draft.evidence,
    attestUrl,
    confidence,
  },
  gates,
  packagePublish: packagePublish.report,
  credentialReadiness: {
    ...credentialReadiness,
    envPath: envPath ?? ".env",
    agentName,
  },
  draftPreflight,
  blockers,
  nextAction: gates.every((gate) => gate.ok)
    ? "Eligible for the first wallet-backed publish attempt; preserve exact command and spend boundary before executing."
    : buildNextAction(gates),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

async function resolveDraft(input: {
  text: string | null;
  template: DraftTemplate | null;
  attestUrl: string;
  sourceName: string | null;
  tickerSymbol: string;
  tickerCurrency: string;
}): Promise<DraftResolution> {
  if (input.text) {
    return {
      text: input.text,
      generated: false,
      template: null,
      sourceName: input.sourceName,
      evidence: {},
    };
  }

  if (input.template === "ticker-spot-observation") {
    const response = await fetch(input.attestUrl, {
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Ticker template fetch failed: HTTP ${response.status} for ${input.attestUrl}`);
    }
    const parsed = await response.json() as Record<string, unknown>;
    const quote = parsed[input.tickerCurrency] as Record<string, unknown> | undefined;
    if (!quote) {
      throw new Error(`Ticker template could not find ${input.tickerCurrency} quote in ${input.attestUrl}`);
    }
    const last = Number(quote.last);
    if (!Number.isFinite(last) || last <= 0) {
      throw new Error(`Ticker template expected positive ${input.tickerCurrency}.last in ${input.attestUrl}`);
    }
    const host = new URL(input.attestUrl).hostname.replace(/^www\./, "");
    const formattedPrice = formatTickerNumber(last, input.tickerCurrency);
    const text = `${host} ticker still prints ${input.tickerSymbol} at ${formattedPrice} ${input.tickerCurrency}. This probe stays a factual OBSERVATION: one attested ${input.tickerSymbol}/${input.tickerCurrency} spot snapshot from a public JSON feed, reported directly without a causal take, unsupported macro inference, or short-horizon forecast.`;
    return {
      text,
      generated: true,
      template: input.template,
      sourceName: input.sourceName ?? `${host}-${input.tickerSymbol.toLowerCase()}-${input.tickerCurrency.toLowerCase()}`,
      evidence: {
        template: input.template,
        tickerSymbol: input.tickerSymbol,
        tickerCurrency: input.tickerCurrency,
        tickerLast: last,
        tickerLastFormatted: formattedPrice,
        fetchedFrom: input.attestUrl,
      },
    };
  }

  throw new Error(`Unsupported draft template: ${String(input.template)}`);
}

async function runDraftPreflight(opts: {
  text: string;
  attestUrl: string;
  confidence: number;
  allowInsecure: boolean;
}): Promise<AttestationWorkflowReport> {
  const loadAgentSourceView = await loadPackageExport<
    (agent: string, primaryCatalogPath: string, fallbackCatalogPath: string, mode: string) => SourceView
  >(
    "../dist/attestation-workflow-support.js",
    "../src/attestation-workflow-support.ts",
    "loadAgentSourceView",
  );
  const evaluateAttestationWorkflow = await loadPackageExport<
    (input: {
      attestUrl: string;
      supportingUrls: string[];
      topic: string | null;
      text: string;
      category: string;
      confidence: number;
      allowInsecure: boolean;
    }, deps: { sourceView: SourceView }) => Promise<AttestationWorkflowReport>
  >(
    "../dist/attestation-workflow-check.js",
    "../src/attestation-workflow-check.ts",
    "evaluateAttestationWorkflow",
  );

  const catalogPath = resolve(REPO_ROOT, "config", "sources", "catalog.json");
  const sourceView = loadAgentSourceView("sentinel", catalogPath, catalogPath, "catalog-only");

  return evaluateAttestationWorkflow(
    {
      attestUrl: opts.attestUrl,
      supportingUrls: [],
      topic: null,
      text: opts.text,
      category: "OBSERVATION",
      confidence: opts.confidence,
      allowInsecure: opts.allowInsecure,
    },
    { sourceView },
  );
}

async function loadWriteReadiness(): Promise<WriteReadinessFn> {
  try {
    const mod = await import("../dist/index.js");
    if (typeof mod.checkWriteReadiness === "function") {
      return mod.checkWriteReadiness as WriteReadinessFn;
    }
  } catch {
    // fall back to source
  }

  const mod = await import("../src/index.ts");
  if (typeof mod.checkWriteReadiness !== "function") {
    throw new Error("checkWriteReadiness export not found in dist/index.js or src/index.ts");
  }
  return mod.checkWriteReadiness as WriteReadinessFn;
}

function runJsonScript(relativePath: string): { ok: boolean; report: any; stdout: string; stderr: string; exitCode: number } {
  const result = runNodeScript(relativePath);
  let report: any = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return {
    ok: result.ok && Boolean(report?.ok),
    report,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

function runNodeScript(relativePath: string): CommandResult {
  const result = spawnSync("node", ["--import", "tsx", relativePath], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function normalizeWorkflowBlockers(report: AttestationWorkflowReport): string[] {
  const fromBlockers = Array.isArray(report.blockers)
    ? report.blockers
      .map((entry) => typeof entry === "object" && entry && "name" in entry ? String((entry as { name?: unknown }).name ?? "draft_preflight_failed") : null)
      .filter((value): value is string => Boolean(value))
    : [];
  return fromBlockers.length > 0 ? fromBlockers : report.ok ? [] : ["draft_preflight_failed"];
}

function summarizeDraftBlockers(report: AttestationWorkflowReport): string {
  const blockerDetail = Array.isArray(report.blockers)
    ? report.blockers
      .map((entry) => typeof entry === "object" && entry && "detail" in entry ? String((entry as { detail?: unknown }).detail ?? "") : "")
      .find((value) => value.length > 0)
    : "";
  return blockerDetail || "draft preflight failed";
}

function buildNextAction(gates: Array<{ name: string; ok: boolean; detail: string }>): string {
  const firstFailure = gates.find((gate) => !gate.ok);
  if (!firstFailure) {
    return "Eligible for wallet-backed publish.";
  }
  if (firstFailure.name === "package_publish") {
    return "Resolve package publish gate first (build/package checks and npm auth), then rerun eligibility.";
  }
  if (firstFailure.name === "credential_readiness") {
    return "Provide valid write credentials in an accepted source, then rerun eligibility.";
  }
  return "Fix the draft-quality / attestation preflight until it is green, then rerun eligibility.";
}

function parseDraftTemplate(value: string | null): DraftTemplate | null {
  if (!value) return null;
  if ((SUPPORTED_DRAFT_TEMPLATES as readonly string[]).includes(value)) {
    return value as DraftTemplate;
  }
  console.error(`Error: unsupported --draft-template ${value}`);
  process.exit(2);
}

function formatTickerNumber(value: number, currency: string): string {
  if (currency === "USD") return value.toFixed(2);
  if (value >= 1000) return value.toFixed(2);
  return value.toFixed(4);
}

function getOptionalNumber(flag: string, fallback: number, min: number, max: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    console.error(`Error: invalid ${flag} value: ${raw}`);
    process.exit(2);
  }
  return parsed;
}
