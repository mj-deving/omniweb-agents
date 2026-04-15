#!/usr/bin/env npx tsx
/**
 * run-trajectories.ts — Score recorded trajectory traces against evals/trajectories.yaml.
 *
 * This does not execute live multi-turn agent sessions itself. Instead, it scores
 * a concrete recorded trace file against the maintained trajectory specification.
 *
 * Output: JSON report to stdout.
 * Exit codes: 0 = scored successfully and meets threshold, 1 = scored successfully but below threshold, 2 = invalid args/input
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

type JsonRecord = Record<string, unknown>;

interface TrajectorySpec {
  description?: string;
  scenarios?: ScenarioSpec[];
  scoring?: {
    weights?: Record<string, number>;
    thresholds?: Record<string, number>;
  };
}

interface ScenarioSpec {
  id?: string;
  description?: string;
  steps?: StepSpec[];
  scoring?: Record<string, number>;
}

interface StepSpec {
  action?: string;
  assert?: string[];
}

interface TraceDoc {
  meta?: JsonRecord;
  scenarios?: ScenarioTrace[];
}

interface ScenarioTrace {
  id?: string;
  steps?: StepTrace[];
  metrics?: Record<string, MetricTrace>;
  notes?: string;
}

interface StepTrace {
  action?: string;
  status?: "pass" | "fail" | "skip";
  assertions?: AssertionTrace[];
  notes?: string;
}

interface AssertionTrace {
  text?: string;
  passed?: boolean;
  evidence?: string;
}

interface MetricTrace {
  passed?: boolean;
  score?: number;
  evidence?: string;
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx evals/run-trajectories.ts [--trace PATH] [--scenario ID] [--template]

Options:
  --trace PATH    Trace JSON file to score against evals/trajectories.yaml
  --scenario ID   Score only one scenario id
  --template      Print a JSON trace template derived from the trajectory spec
  --help, -h      Show this help

Trace format:
  {
    "meta": { "runId": "..." },
    "scenarios": [
      {
        "id": "publish-flow",
        "metrics": {
          "correctOrder": { "passed": true, "evidence": "..." }
        },
        "steps": [
          {
            "action": "Read signals with getSignals()",
            "status": "pass",
            "assertions": [
              { "text": "Returns SignalData[] or null", "passed": true, "evidence": "..." }
            ]
          }
        ]
      }
    ]
  }

Output: JSON report with per-scenario scoring and overall threshold classification
Exit codes: 0 = pass, 1 = warn/fail threshold, 2 = invalid args/input`);
  process.exit(0);
}

const templateOnly = args.includes("--template");
const tracePath = getStringArg(args, "--trace");
const scenarioFilter = getStringArg(args, "--scenario");
const packageRoot = resolve(import.meta.dirname, "..");
const trajectoriesPath = resolve(packageRoot, "evals", "trajectories.yaml");
const spec = parse(readFileSync(trajectoriesPath, "utf8")) as TrajectorySpec;
const scenarios = Array.isArray(spec.scenarios) ? spec.scenarios : [];
const selectedScenarios = scenarioFilter
  ? scenarios.filter((scenario) => scenario.id === scenarioFilter)
  : scenarios;

if (selectedScenarios.length === 0) {
  console.error(`No trajectory scenarios matched${scenarioFilter ? `: ${scenarioFilter}` : ""}`);
  process.exit(2);
}

if (templateOnly) {
  console.log(JSON.stringify(buildTemplate(selectedScenarios), null, 2));
  process.exit(0);
}

if (!tracePath) {
  console.error("Error: --trace PATH is required unless --template is used");
  process.exit(2);
}

const trace = JSON.parse(readFileSync(resolve(tracePath), "utf8")) as TraceDoc;
const traceScenarios = Array.isArray(trace.scenarios) ? trace.scenarios : [];
const thresholds = isRecord(spec.scoring?.thresholds) ? spec.scoring!.thresholds! : { pass: 70, warn: 50, fail: 0 };

const results = selectedScenarios.map((scenario) => {
  const traceScenario = traceScenarios.find((entry) => entry.id === scenario.id);
  return scoreScenario(scenario, traceScenario);
});

const overallScore = round2(results.reduce((sum, result) => sum + result.score, 0) / results.length);
const overallStatus = results.every((result) => result.status === "PASS")
  ? classifyScore(overallScore, thresholds)
  : "FAIL";
const ok = overallStatus === "PASS";

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  trajectoriesPath,
  tracePath: resolve(tracePath),
  scenarioFilter: scenarioFilter ?? null,
  ok,
  overallScore,
  overallStatus,
  thresholds,
  results,
}, null, 2));

process.exit(ok ? 0 : 1);

function scoreScenario(specScenario: ScenarioSpec, traceScenario?: ScenarioTrace) {
  const specSteps = Array.isArray(specScenario.steps) ? specScenario.steps : [];
  const traceSteps = Array.isArray(traceScenario?.steps) ? traceScenario!.steps : [];
  const scoring = isRecord(specScenario.scoring) ? specScenario.scoring as Record<string, number> : {};
  const metricEntries = Object.entries(scoring);

  const stepResults = specSteps.map((specStep, index) => {
    const traceStep = traceSteps[index];
    const actionMatches = !!traceStep && traceStep.action === specStep.action;
    const traceAssertions = Array.isArray(traceStep?.assertions) ? traceStep!.assertions : [];
    const assertionResults = (specStep.assert ?? []).map((expected) => {
      const actual = traceAssertions.find((entry) => entry.text === expected);
      return {
        text: expected,
        present: !!actual,
        passed: actual?.passed === true,
        evidence: actual?.evidence ?? null,
      };
    });

    return {
      action: specStep.action ?? null,
      traceAction: traceStep?.action ?? null,
      actionMatches,
      status: traceStep?.status ?? null,
      assertionResults,
      notes: traceStep?.notes ?? null,
      assertionPassRate: assertionResults.length === 0
        ? 0
        : round2(assertionResults.filter((entry) => entry.present && entry.passed).length / assertionResults.length),
    };
  });

  const metricResults = metricEntries.map(([metric, weight]) => {
    const traceMetric = isRecord(traceScenario?.metrics) ? traceScenario!.metrics![metric] as MetricTrace | undefined : undefined;
    const normalizedScore = normalizeMetric(traceMetric);
    return {
      metric,
      weight,
      score: round2(normalizedScore * 100),
      weightedContribution: round2(normalizedScore * weight),
      evidence: traceMetric?.evidence ?? null,
      present: !!traceMetric,
    };
  });

  const score = round2(metricResults.reduce((sum, metric) => sum + metric.weightedContribution, 0));
  const thresholds = isRecord(spec.scoring?.thresholds) ? spec.scoring!.thresholds! : { pass: 70, warn: 50, fail: 0 };
  const stepCoverage = {
    expectedSteps: specSteps.length,
    matchedSteps: stepResults.filter((step) => step.actionMatches && step.status === "pass").length,
    expectedAssertions: stepResults.reduce((sum, step) => sum + step.assertionResults.length, 0),
    matchedAssertions: stepResults.reduce((sum, step) => (
      sum + step.assertionResults.filter((entry) => entry.present && entry.passed).length
    ), 0),
  };
  const hasCompleteCoverage =
    !!traceScenario &&
    stepCoverage.matchedSteps === stepCoverage.expectedSteps &&
    stepCoverage.matchedAssertions === stepCoverage.expectedAssertions;
  const scoreStatus = classifyScore(score, thresholds);
  const status = hasCompleteCoverage ? scoreStatus : "FAIL";

  return {
    id: specScenario.id ?? "<invalid>",
    description: specScenario.description ?? null,
    tracePresent: !!traceScenario,
    score,
    status,
    scoreStatus,
    coverageOk: hasCompleteCoverage,
    statusReason: hasCompleteCoverage
      ? null
      : "trace is missing required step/action/assertion coverage",
    stepCoverage,
    stepResults,
    metricResults,
    notes: traceScenario?.notes ?? null,
    missingTrace: !traceScenario,
  };
}

function buildTemplate(scenarios: ScenarioSpec[]): TraceDoc {
  return {
    meta: {
      runId: "replace-me",
      capturedAt: new Date().toISOString(),
      notes: "Fill this with evidence from a concrete agent session run.",
    },
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id ?? "replace-me",
      notes: "",
      metrics: Object.fromEntries(
        Object.keys(isRecord(scenario.scoring) ? scenario.scoring as Record<string, number> : {}).map((metric) => [
          metric,
          {
            passed: false,
            evidence: "",
          },
        ]),
      ),
      steps: (scenario.steps ?? []).map((step) => ({
        action: step.action ?? "",
        status: "fail",
        notes: "",
        assertions: (step.assert ?? []).map((text) => ({
          text,
          passed: false,
          evidence: "",
        })),
      })),
    })),
  };
}

function normalizeMetric(metric: MetricTrace | undefined): number {
  if (!metric) return 0;
  if (typeof metric.score === "number" && Number.isFinite(metric.score)) {
    return metric.score > 1 ? clamp(metric.score / 100, 0, 1) : clamp(metric.score, 0, 1);
  }
  if (metric.passed === true) return 1;
  return 0;
}

function classifyScore(score: number, thresholds: Record<string, number>): "PASS" | "WARN" | "FAIL" {
  const pass = typeof thresholds.pass === "number" ? thresholds.pass : 70;
  const warn = typeof thresholds.warn === "number" ? thresholds.warn : 50;
  if (score >= pass) return "PASS";
  if (score >= warn) return "WARN";
  return "FAIL";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getStringArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  return argv[index + 1];
}
