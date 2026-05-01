#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_BASE_URL,
  fetchText,
  getStringArg,
  hasFlag,
  loadConnect,
  loadPackageExport,
  REPO_ROOT,
} from "./_shared.ts";
import { runDirectSupervisedPublish } from "./_supervised-direct-publish.ts";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";

const SUPPORTED_DRAFT_TEMPLATES = ["ticker-spot-observation"] as const;
type DraftTemplate = typeof SUPPORTED_DRAFT_TEMPLATES[number];

type DraftResolution = {
  text: string;
  sourceName: string | null;
  generated: boolean;
  template: DraftTemplate | null;
  evidence: Record<string, unknown>;
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
  publishQuality?: {
    checks?: unknown[];
  };
  blockers?: unknown[];
  warnings?: unknown[];
  recommendations?: string[];
  [key: string]: unknown;
};

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-observation.ts [options]

Options:
  --text TEXT                  Factual OBSERVATION post body (optional when using --draft-template)
  --draft-template NAME        Deterministic draft builder (supported: ${SUPPORTED_DRAFT_TEMPLATES.join(", ")})
  --ticker-symbol SYMBOL       Quote symbol for ticker template (default: BTC)
  --ticker-currency CODE       Quote currency for ticker template (default: USD)
  --preflight-only             Stop after deterministic draft + attestation/publish-quality preflight
  --attest-url URL             Required primary attestation URL used for publish()
  --confidence N               Optional confidence percentage (0-100, default: 60)
  --source-name TEXT           Optional source label for audit output
  --env-path PATH              Override wallet credentials file passed to connect()
  --agent-name NAME            Use ~/.config/demos/credentials-NAME if present
  --state-dir PATH             Forwarded to connect()/state persistence
  --allow-insecure             Forwarded to connect() for local debugging only
  --record-pending-verdict     Queue a delayed follow-up using the OBSERVATION verdict schedule
  --pending-verdict-queue P    Override the pending verdict queue path
  --verify-timeout-ms N        Visibility verification timeout (default: 45000)
  --verify-poll-ms N           Visibility poll interval (default: 5000)
  --verify-limit N             Feed limit for visibility checks (default: 50)
  --dry-run                    Build the cycle record without spending DEM
  --out PATH                   Write the JSON report to a file as well as stdout
  --help, -h                   Show this help
`);
  process.exit(0);
}

const textArg = getStringArg(args, "--text")?.trim() || null;
const draftTemplateArg = getStringArg(args, "--draft-template")?.trim() || null;
const draftTemplate = parseDraftTemplate(draftTemplateArg);
const attestUrl = getRequiredArg("--attest-url");
const confidence = getOptionalNumber("--confidence", 60, 0, 100);
const sourceNameArg = getStringArg(args, "--source-name") ?? null;
const tickerSymbol = (getStringArg(args, "--ticker-symbol") ?? "BTC").trim().toUpperCase();
const tickerCurrency = (getStringArg(args, "--ticker-currency") ?? "USD").trim().toUpperCase();
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name") ?? null;
const stateDir = getStringArg(args, "--state-dir");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const preflightOnly = hasFlag(args, "--preflight-only");
const recordPendingVerdict = hasFlag(args, "--record-pending-verdict");
const pendingVerdictQueuePath = getStringArg(args, "--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);
const dryRun = hasFlag(args, "--dry-run");
const outputPath = getStringArg(args, "--out");

if (textArg && draftTemplate) {
  throw new Error("Choose either --text or --draft-template, not both");
}
if (!textArg && !draftTemplate) {
  throw new Error("Provide --text or --draft-template");
}
if (recordPendingVerdict && (dryRun || preflightOnly)) {
  throw new Error("--record-pending-verdict only applies to real published runs");
}

const draft = await resolveDraft({
  text: textArg,
  template: draftTemplate,
  attestUrl,
  sourceName: sourceNameArg,
  tickerSymbol,
  tickerCurrency,
});

const preflight = await runObservationPreflight({
  attestUrl,
  text: draft.text,
  confidence,
  allowInsecure: allowInsecureUrls,
});

const baseReport = {
  ok: preflight.ok,
  checkedAt: new Date().toISOString(),
  preflightOnly,
  dryRun,
  sourceName: draft.sourceName,
  draft: {
    text: draft.text,
    textLength: draft.text.length,
    generated: draft.generated,
    template: draft.template,
    evidence: draft.evidence,
  },
  preflight,
};

if (!preflight.ok || preflightOnly) {
  await emitReport(baseReport, outputPath);
  process.exit(preflight.ok ? 0 : 1);
}

const buildMinimalAttestationPlanFromUrls = await loadPackageExport<
  (opts: {
    topic: string;
    agent: string;
    urls: string[];
  }) => unknown
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildMinimalAttestationPlanFromUrls",
);

const verifyPublishVisibility = await loadPackageExport<
  (omni: unknown, txHash: string | undefined, text: string, opts: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  }) => Promise<unknown>
>("../dist/publish-visibility.js", "../src/publish-visibility.ts", "verifyPublishVisibility");
const connect = await loadConnect();
const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });

const attestationPlan = buildMinimalAttestationPlanFromUrls({
  topic: "supervised-observation",
  agent: "observation-check",
  urls: [attestUrl],
});

const decision = {
  kind: "publish",
  category: "OBSERVATION",
  text: draft.text,
  attestUrl,
  confidence,
  attestationPlan,
  facts: {
    observationSourceName: draft.sourceName,
    ...draft.evidence,
  },
  audit: {
    promptPacket: {
      objective: "Publish one supervised factual OBSERVATION post from a single attested source.",
      sourceName: draft.sourceName,
      confidence,
      draftTemplate: draft.template,
    },
  },
} as const;

const record = await runDirectSupervisedPublish({
  omni,
  dryRun,
  stateDir,
  decision,
  verifyPublishVisibility,
  verification: {
    timeoutMs: verifyTimeoutMs,
    pollMs: verifyPollMs,
    limit: verifyLimit,
  },
});

const verdictSchedule = scheduleSupervisedVerdict("OBSERVATION", record.startedAt);
let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && record.outcome.status === "published" && record.outcome.txHash) {
  const queued = await enqueuePendingVerdict(buildPendingVerdictEntry({
    txHash: record.outcome.txHash,
    category: "OBSERVATION",
    text: draft.text,
    startedAt: record.startedAt,
    sourceRunPath: null,
    stateDir: record.stateDir,
    checkAfterMs: verdictSchedule.followUpEarliestMs,
  }), pendingVerdictQueuePath);

  pendingVerdict = {
    id: queued.entry.id,
    queuePath: pendingVerdictQueuePath,
    checkAt: queued.entry.checkAt,
    inserted: queued.inserted,
  };
}

await emitReport(
  {
    ...baseReport,
    ok: record.outcome.status === "published" || record.outcome.status === "dry_run",
    verdictSchedule,
    pendingVerdict,
    record,
  },
  outputPath,
);

process.exit(record.outcome.status === "published" || record.outcome.status === "dry_run" ? 0 : 1);

async function emitReport(report: Record<string, unknown>, path?: string): Promise<void> {
  if (path) {
    const resolvedPath = resolve(path);
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
}

async function runObservationPreflight(opts: {
  attestUrl: string;
  text: string;
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
      sourceName: input.sourceName,
      generated: false,
      template: null,
      evidence: {},
    };
  }

  if (input.template === "ticker-spot-observation") {
    return buildTickerSpotObservationDraft(input);
  }

  throw new Error(`Unsupported --draft-template: ${String(input.template)}`);
}

async function buildTickerSpotObservationDraft(input: {
  attestUrl: string;
  sourceName: string | null;
  tickerSymbol: string;
  tickerCurrency: string;
}): Promise<DraftResolution> {
  const response = await fetchTextFromAbsoluteUrl(input.attestUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${input.attestUrl}: ${response.error ?? `HTTP ${response.status}`}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch (error) {
    throw new Error(`Ticker template expected JSON at ${input.attestUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const quote = (parsed as Record<string, unknown>)?.[input.tickerCurrency];
  if (!quote || typeof quote !== "object") {
    throw new Error(`Ticker template could not find ${input.tickerCurrency} quote in ${input.attestUrl}`);
  }

  const last = Number((quote as Record<string, unknown>).last);
  if (!Number.isFinite(last) || last <= 0) {
    throw new Error(`Ticker template expected a positive numeric ${input.tickerCurrency}.last value in ${input.attestUrl}`);
  }

  const host = new URL(input.attestUrl).hostname.replace(/^www\./, "");
  const formattedPrice = formatTickerNumber(last, input.tickerCurrency);
  const text = `${host} ticker still prints ${input.tickerSymbol} at ${formattedPrice} ${input.tickerCurrency}. This probe stays a factual OBSERVATION: one attested ${input.tickerSymbol}/${input.tickerCurrency} spot snapshot from a public JSON feed, reported directly without a causal take, unsupported macro inference, or short-horizon forecast.`;

  return {
    text,
    sourceName: input.sourceName ?? `${host}-${input.tickerSymbol.toLowerCase()}-${input.tickerCurrency.toLowerCase()}`,
    generated: true,
    template: "ticker-spot-observation",
    evidence: {
      template: "ticker-spot-observation",
      tickerSymbol: input.tickerSymbol,
      tickerCurrency: input.tickerCurrency,
      tickerLast: last,
      tickerLastFormatted: formattedPrice,
      fetchedFrom: input.attestUrl,
    },
  };
}

async function fetchTextFromAbsoluteUrl(url: string): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  const parsed = new URL(url);
  if (url.startsWith(DEFAULT_BASE_URL)) {
    const path = `${parsed.pathname}${parsed.search}`;
    return fetchText(path);
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseDraftTemplate(value: string | null): DraftTemplate | null {
  if (!value) return null;
  if ((SUPPORTED_DRAFT_TEMPLATES as readonly string[]).includes(value)) {
    return value as DraftTemplate;
  }
  throw new Error(`Unsupported --draft-template: ${value}`);
}

function formatTickerNumber(value: number, currency: string): string {
  if (currency === "USD") {
    return value.toFixed(2);
  }
  if (value >= 1000) {
    return value.toFixed(2);
  }
  return value.toFixed(4);
}

function getRequiredArg(flag: string): string {
  const value = getStringArg(args, flag);
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

function getOptionalNumber(flag: string, fallback: number, min: number, max: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}
