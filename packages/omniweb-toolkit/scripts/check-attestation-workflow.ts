#!/usr/bin/env npx tsx

import { resolve } from "node:path";

import {
  REPO_ROOT,
  getNumberArg,
  getStringArg,
  hasFlag,
  loadPackageExport,
} from "./_shared.js";

type AgentName = "sentinel" | "crawler" | "pioneer";

type SourceRecord = {
  id: string;
  name: string;
  provider: string;
  status: string;
  trustTier: string;
  responseFormat: string;
  dahr_safe?: boolean;
  tlsn_safe?: boolean;
  note?: string | null;
  url: string;
  rating: {
    overall: number;
  };
};

type SourceView = {
  sources: SourceRecord[];
};

type AttestationWorkflowReport = {
  ok: boolean;
  sourceCatalog: {
    sourceCount: number;
  };
};

type AttestationStressScenario = {
  id: string;
  title: string;
};

const DEFAULT_AGENT: AgentName = "sentinel";
const DEFAULT_CATEGORY = "ANALYSIS";
const SUPPORTING_SOURCE_FLAG = "--supporting-url";
const SUPPORTED_AGENTS: AgentName[] = ["sentinel", "crawler", "pioneer"];

const args = process.argv.slice(2);

const { ATTESTATION_STRESS_SCENARIOS } = await loadAttestationWorkflowCheck();

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-attestation-workflow.ts [options]

Single-workflow options:
  --attest-url URL          Primary URL to use in publish({ attestUrl })
  --supporting-url URL      Additional supporting source URL (repeatable)
  --topic TEXT              Topic to score against the bundled source catalog
  --text TEXT               Draft text to validate against publish-quality expectations
  --category CAT            Draft category (default: ANALYSIS)
  --confidence N            Intended confidence score (0-100)

Stress-suite options:
  --stress-suite            Run the built-in strong/weak/adversarial scenario suite
  --scenario ID             Restrict the stress suite to one built-in scenario id (repeatable)

Shared options:
  --agent NAME              Source-catalog scope: sentinel | crawler | pioneer (default: sentinel)
  --allow-insecure          Allow HTTP URLs (local dev only)
  --help, -h                Show this help

Built-in stress scenarios:
${ATTESTATION_STRESS_SCENARIOS.map((scenario) => `  - ${scenario.id}: ${scenario.title}`).join("\n")}

This script is a non-destructive operator preflight. It checks:
  - whether the primary and supporting URLs look DAHR-safe
  - whether the URLs map cleanly to the bundled source catalog
  - whether the evidence chain is too narrow, weak, or pseudo-diverse
  - whether the draft text and confidence match package publish expectations

Exit codes:
  0 = no blockers / stress suite passed
  1 = blockers found / stress suite mismatch
  2 = invalid args`);
  process.exit(0);
}

const agent = parseAgent(getStringArg(args, "--agent") ?? DEFAULT_AGENT);
const allowInsecure = hasFlag(args, "--allow-insecure");
const runStressSuite = hasFlag(args, "--stress-suite");
const scenarioIds = getMultiStringArgs(args, "--scenario");

if (!agent) {
  console.error(`Error: --agent must be one of ${SUPPORTED_AGENTS.join(", ")}`);
  process.exit(2);
}

for (const flag of [
  "--attest-url",
  "--topic",
  "--text",
  "--category",
  "--confidence",
  "--agent",
  "--scenario",
  SUPPORTING_SOURCE_FLAG,
]) {
  validateFlagHasValue(flag, args);
}

const catalogPath = resolve(REPO_ROOT, "config", "sources", "catalog.json");
const { loadAgentSourceView } = await loadAttestationWorkflowSupport();
const sourceView = loadAgentSourceView(agent, catalogPath, catalogPath, "catalog-only");
const {
  evaluateAttestationWorkflow,
  runAttestationStressSuite,
} = await loadAttestationWorkflowCheck();

if (runStressSuite) {
  const report = await runAttestationStressSuite({ sourceView }, scenarioIds);
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        mode: "stress-suite",
        agent,
        scenarioIds: scenarioIds.length > 0 ? scenarioIds : null,
        sourceCatalog: {
          path: catalogPath,
          sourceCount: sourceView.sources.length,
        },
        ...report,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

const attestUrl = getStringArg(args, "--attest-url");
const topic = getStringArg(args, "--topic")?.trim() || null;
const text = getStringArg(args, "--text")?.trim() || null;
const category = normalizeCategory(getStringArg(args, "--category") ?? DEFAULT_CATEGORY);
const confidence = getNumberArg(args, "--confidence");
const supportingUrls = getMultiStringArgs(args, SUPPORTING_SOURCE_FLAG);

if (!attestUrl) {
  console.error("Error: --attest-url URL is required unless --stress-suite is used");
  process.exit(2);
}

if (
  confidence !== undefined &&
  (!Number.isFinite(confidence) || confidence < 0 || confidence > 100)
) {
  console.error("Error: --confidence must be a number between 0 and 100");
  process.exit(2);
}

const report = await evaluateAttestationWorkflow(
  {
    attestUrl,
    supportingUrls,
    topic,
    text,
    category,
    confidence,
    allowInsecure,
  },
  { sourceView },
);

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      mode: "single",
      agent,
      sourceCatalog: {
        path: catalogPath,
        ...report.sourceCatalog,
      },
      ...report,
    },
    null,
    2,
  ),
);

process.exit(report.ok ? 0 : 1);

function parseAgent(value: string): AgentName | null {
  return SUPPORTED_AGENTS.includes(value as AgentName) ? (value as AgentName) : null;
}

function getMultiStringArgs(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === flag && argv[index + 1]) {
      values.push(argv[index + 1]);
    }
  }
  return values;
}

function validateFlagHasValue(flag: string, argv: string[]): void {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === flag && !argv[index + 1]) {
      console.error(`Error: ${flag} requires a value`);
      process.exit(2);
    }
  }
}

function normalizeCategory(value: string): string {
  return value.trim().toUpperCase();
}

async function loadAttestationWorkflowSupport(): Promise<{
  loadAgentSourceView: (
    agent: AgentName,
    catalogPath: string,
    overridePath: string,
    mode: string,
  ) => SourceView;
}> {
  const loadAgentSourceView = await loadPackageExport<
    (
      agent: AgentName,
      catalogPath: string,
      overridePath: string,
      mode: string,
    ) => SourceView
  >(
    "../dist/attestation-workflow-support.js",
    "../src/attestation-workflow-support.ts",
    "loadAgentSourceView",
  );

  return { loadAgentSourceView };
}

async function loadAttestationWorkflowCheck(): Promise<{
  ATTESTATION_STRESS_SCENARIOS: AttestationStressScenario[];
  evaluateAttestationWorkflow: (
    input: {
      attestUrl: string;
      supportingUrls: string[];
      topic: string | null;
      text: string | null;
      category: string;
      confidence?: number;
      allowInsecure: boolean;
    },
    options: { sourceView: SourceView },
  ) => Promise<AttestationWorkflowReport>;
  runAttestationStressSuite: (
    options: { sourceView: SourceView },
    scenarioIds?: string[],
  ) => Promise<AttestationWorkflowReport>;
}> {
  const [stressScenarios, evaluateAttestationWorkflow, runAttestationStressSuite] =
    await Promise.all([
      loadPackageExport<AttestationStressScenario[]>(
        "../dist/attestation-workflow-check.js",
        "../src/attestation-workflow-check.ts",
        "ATTESTATION_STRESS_SCENARIOS",
      ),
      loadPackageExport<
        (
          input: {
            attestUrl: string;
            supportingUrls: string[];
            topic: string | null;
            text: string | null;
            category: string;
            confidence?: number;
            allowInsecure: boolean;
          },
          options: { sourceView: SourceView },
        ) => Promise<AttestationWorkflowReport>
      >(
        "../dist/attestation-workflow-check.js",
        "../src/attestation-workflow-check.ts",
        "evaluateAttestationWorkflow",
      ),
      loadPackageExport<
        (
          options: { sourceView: SourceView },
          scenarioIds?: string[],
        ) => Promise<AttestationWorkflowReport>
      >(
        "../dist/attestation-workflow-check.js",
        "../src/attestation-workflow-check.ts",
        "runAttestationStressSuite",
      ),
    ]);

  return {
    ATTESTATION_STRESS_SCENARIOS: stressScenarios,
    evaluateAttestationWorkflow,
    runAttestationStressSuite,
  };
}
