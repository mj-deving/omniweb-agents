#!/usr/bin/env npx tsx

/**
 * check-colony-operator-draft.ts — Validate the hand-maintained colony-operator draft surfaces.
 *
 * Output: JSON report to stdout.
 * Exit codes: 0 = all checks passed, 1 = one or more checks failed.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PACKAGE_ROOT } from "./_shared.js";

type FileCheck = {
  path: string;
  mustContain?: string[];
  mustNotContain?: string[];
};

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx scripts/check-colony-operator-draft.ts

Options:
  --help, -h   Show this help

Output: JSON report covering the hand-maintained colony-operator draft surfaces
Exit codes: 0 = draft checks passed, 1 = one or more checks failed`);
  process.exit(0);
}

const checks: FileCheck[] = [
  {
    path: "agents/openclaw/colony-operator/IDENTITY.md",
    mustContain: [
      "OmniWeb Colony Operator",
      "Read-first SuperColony operator",
    ],
    mustNotContain: [
      "market analyst",
    ],
  },
  {
    path: "agents/openclaw/colony-operator/skills/omniweb-colony-operator/minimal-agent-starter.mjs",
    mustContain: [
      "Minimal colony-operator starter",
      '"colony-operator"',
      "source-grounded observation",
    ],
    mustNotContain: [
      "leaderboard-pattern",
      "market analyst",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/minimal-agent-starter.mjs",
    mustContain: [
      "Minimal colony-operator starter",
      '"colony-operator"',
      "source-grounded observation",
    ],
    mustNotContain: [
      "leaderboard-pattern",
      "market analyst",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/starter.ts",
    mustContain: [
      "Draft colony-operator starter",
      "one compact colony read",
      'category: "OBSERVATION"',
    ],
    mustNotContain: [
      "Full market runtime.",
      "market opportunity",
      "Selected asset:",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/agent-loop-skeleton.ts",
    mustContain: [
      "source-grounded prompt scaffold",
    ],
    mustNotContain: [
      "leaderboard-pattern",
    ],
  },
];

const results = checks.map(runCheck);
const ok = results.every((result) => result.ok);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  results,
}, null, 2));

process.exit(ok ? 0 : 1);

function runCheck(check: FileCheck) {
  const absolutePath = resolve(PACKAGE_ROOT, check.path);
  if (!existsSync(absolutePath)) {
    return {
      path: check.path,
      ok: false,
      error: "missing_file",
      missing: check.mustContain ?? [],
      forbiddenFound: [],
    };
  }

  const text = readFileSync(absolutePath, "utf8");
  const missing = (check.mustContain ?? []).filter((needle) => !text.includes(needle));
  const forbiddenFound = (check.mustNotContain ?? []).filter((needle) => text.includes(needle));

  return {
    path: check.path,
    ok: missing.length === 0 && forbiddenFound.length === 0,
    missing,
    forbiddenFound,
  };
}
