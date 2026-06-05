#!/usr/bin/env -S bunx tsx

/**
 * check-colony-operator-primary.ts — Validate the primary hand-maintained colony-operator surfaces.
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
  mustNotContainUnlessNegated?: string[];
};

const currentFrontDoorDoctrine = [
  "`colony-operator` remains the default OmniWeb/OpenClaw consumer path.",
  "The maintained default proof path is read-first and no-spend.",
  "The May 2026 live operator packet is historical provenance for one bounded",
  "needs a fresh explicit proof packet with agent/wallet target, DEM budget,",
  "not equal default front doors.",
];

const staleLiveWriteClaims = [
  "standing live-write authority",
  "standing authorization",
  "blanket launch-grade authority",
  "general live-write authority",
  "fully-proved live wallet-backed operation",
  "default live-write authority",
  "default live write authority",
  "live-write authorization",
];

const currentDoctrineSurfaces = [
  "README.md",
  "SKILL.md",
  "TOOLKIT.md",
  "agents/openclaw/colony-operator/README.md",
];

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: bunx tsx scripts/check-colony-operator-primary.ts

Options:
  --help, -h   Show this help

Output: JSON report covering the primary hand-maintained colony-operator surfaces
Exit codes: 0 = checks passed, 1 = one or more checks failed`);
  process.exit(0);
}

const checks: FileCheck[] = [
  ...currentDoctrineSurfaces.map((path) => ({
    path,
    mustContain: currentFrontDoorDoctrine,
    mustNotContainUnlessNegated: staleLiveWriteClaims,
  })),
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
      "runColonyOperatorCycle",
      "OMNIWEB_EXECUTE=true",
      '"colony-operator"',
      "source-grounded observation",
    ],
    mustNotContain: [
      "checkWriteReadiness",
      "omni.colony.publish(",
      "leaderboard-pattern",
      "market analyst",
    ],
  },
  {
    path: "agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md",
    mustContain: [
      "Anti-drift rule: do not re-teach protocol mechanics here.",
      "Capability names, params, proof tiers, response depth, readiness, lifecycle status, and official-surface coverage belong to toolkit/runtime discovery.",
      "Ask runtime truth for mechanics before acting",
      "runtime discovery decides what is supported, ready, supervised, advanced, pending, degraded, or blocked",
    ],
    mustNotContain: [
      "PR #360",
      "5xp4.15",
    ],
  },
  {
    path: "agents/openclaw/colony-operator/skills/omniweb-colony-operator/PLAYBOOK.md",
    mustContain: [
      "runtime discovery from `omniweb-toolkit/agent`",
      "The runtime/toolkit layer owns protocol mechanics",
      "buildOfficialSkillCoverageReport()",
      "Use runtime discovery to confirm the current read surfaces",
    ],
    mustNotContain: [
      "5xp4.14",
      "5xp4.15",
      "PR #360",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/SKILL.md",
    mustContain: [
      "Do not duplicate protocol mechanics here",
      "capability IDs, params, proof tiers, response depth, lifecycle/readback status, and official-surface coverage belong to `omniweb-toolkit/agent` discovery",
      "buildOfficialSkillCoverageReport()",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/PLAYBOOK.md",
    mustContain: [
      "This playbook owns strategy",
      "The runtime/toolkit layer owns mechanics",
      "buildOfficialSkillCoverageReport()",
      "not a hidden executor or protocol reference",
    ],
  },
  {
    path: "references/colony-operator-skill-skeleton.md",
    mustContain: [
      "This is not the protocol source of truth.",
      "Toolkit/runtime discovery owns method names, params, readiness, proof tiers, response-depth access, lifecycle/readback surfaces, and official-surface coverage.",
      "buildColonyOperatorCapabilityDiscovery()",
      "This skeleton should stay strategy-focused.",
      "Do not duplicate runtime capability mechanics in skill/playbook prose.",
    ],
    mustNotContain: [
      "Status: maintained reference checkpoint grounded in `qe16`",
      "feed payload now includes an extra top-level `agent` field",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/minimal-agent-starter.mjs",
    mustContain: [
      "Minimal colony-operator starter",
      "runColonyOperatorCycle",
      "OMNIWEB_EXECUTE=true",
      '"colony-operator"',
      "source-grounded observation",
    ],
    mustNotContain: [
      "checkWriteReadiness",
      "omni.colony.publish(",
      "leaderboard-pattern",
      "market analyst",
    ],
  },
  {
    path: "agents/registry/omniweb-colony-operator/starter.ts",
    mustContain: [
      "Primary hand-maintained colony-operator starter",
      "only choose react, reply, or publish",
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
  {
    path: "agents/openclaw/colony-operator/README.md",
    mustContain: [
      "### Full intended MVP target",
      "### Already proved baseline",
      "### Smallest honest operator action loop already in hand",
      "skip**, **react**, **reply**, or **publish**",
      "explicit bounded action intent over the seam",
      "let the substrate/runtime own readiness, resolved-intent truth, execution shape, and verification",
      "### Smallest honest supervised wallet-backed checkpoint",
      "bun run check:supervised-observation-eligibility",
      "--confirm-live-publish",
      "### Manual, host-specific, or not yet proved",
      "not yet the full MVP ceiling",
    ],
    mustNotContain: [
      "MVP runtime spine",
      "real multi-surface sensing spine",
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
  const staleClaimsFound = (check.mustNotContainUnlessNegated ?? []).flatMap((needle) =>
    findUnnegatedMatches(text, needle),
  );

  return {
    path: check.path,
    ok: missing.length === 0 && forbiddenFound.length === 0 && staleClaimsFound.length === 0,
    missing,
    forbiddenFound: [...forbiddenFound, ...staleClaimsFound],
  };
}

function findUnnegatedMatches(text: string, needle: string) {
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const matches: string[] = [];
  let index = lowerText.indexOf(lowerNeedle);

  while (index !== -1) {
    if (!isNegatedStaleClaim(lowerText, index, lowerNeedle)) {
      const excerptStart = Math.max(0, index - 40);
      const excerptEnd = Math.min(text.length, index + needle.length + 40);
      matches.push(text.slice(excerptStart, excerptEnd).replace(/\s+/g, " ").trim());
    }
    index = lowerText.indexOf(lowerNeedle, index + lowerNeedle.length);
  }

  return matches;
}

function getLocalNegationContext(text: string, index: number) {
  const hardBoundaries = ["\n", ".", ";", ":", "!", "?"];
  const boundary = Math.max(...hardBoundaries.map((marker) => text.lastIndexOf(marker, index - 1)));
  return text.slice(Math.max(boundary + 1, index - 90), index);
}

function isNegatedStaleClaim(text: string, index: number, needle: string) {
  const suffix = getLocalNegationContext(text, index).replace(/\s+/g, " ");
  // Only exact local prefixes immediately before the stale phrase count as negation.
  const directNegationPrefixes = [
    /\bnot\s*$/,
    /\bnot\s+a\s*$/,
    /\bno\s*$/,
    /\bwithout\s*$/,
    /\bdoes \*\*not\*\*\s*$/,
    /\bdoes not\s*$/,
    /\bdo not\s*$/,
    /\bmust not\s*$/,
    /\bis not\s*$/,
    /\bisn't\s*$/,
  ];
  const claimSpecificPrefixes: Record<string, RegExp[]> = {
    "fully-proved live wallet-backed operation": [
      /\bnot\s+a\s+blanket\s+claim\s+of\s*$/,
      /\bnot\s+a\s+claim\s+of\s*$/,
      /\bno\s+blanket\s+claim\s+of\s*$/,
    ],
  };

  return [
    ...directNegationPrefixes,
    ...(claimSpecificPrefixes[needle] ?? []),
  ].some((pattern) => pattern.test(suffix));
}
