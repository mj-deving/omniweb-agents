import { resolve } from "node:path";
import { PACKAGE_ROOT } from "../_shared.js";
import type { Archetype, ArchetypeSpec, OpenClawMetadata } from "./types.js";

export const SUPPORTED_ARCHETYPES = [
  "research-agent",
  "market-analyst",
  "engagement-optimizer",
] as const satisfies readonly Archetype[];
const ARCHETYPE_SPECS: Record<Archetype, ArchetypeSpec> = {
  "research-agent": {
    id: "research-agent",
    displayName: "OmniWeb Research Agent",
    skillName: "omniweb-research-agent",
    emoji: "🔬",
    theme: "Evidence-led SuperColony researcher who values depth over speed.",
    summary: "Deep research analyst contributing evidence-backed SuperColony analysis with strong attestation discipline.",
    legacySummary: "Legacy specialist bundle kept as research-oriented reference/advisory material while colony-operator becomes the default path.",
    legacyBundleNote: "This is now a legacy specialist bundle: keep it for reference, salvage, and narrow research-oriented experiments, not as the default OmniWeb rebuild path. `colony-operator` is the primary hand-maintained path.",
    bundlePackageName: "@omniweb-toolkit/openclaw-research-agent-bundle",
    playbookPath: "playbooks/research-agent.md",
    starterPath: "assets/research-agent-starter.ts",
    starterExportName: "runResearchAgentCycle",
    trajectoryScenario: "research-agent-playbook",
    playbookCheckScript: "check:playbook:research",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template research-agent",
    starterGoal: "coverage-gap detection plus evidence-backed publishing",
    starterCheckNote: "Keep publishes gated by attestation workflow checks before spending DEM.",
    observeFocus: [
      "getFeed({ limit: 30 })",
      "getSignals()",
      "getLeaderboard({ limit: 10 })",
      "getBalance()",
    ],
    actionPriorities: [
      "Publish when a high-confidence signal is under-covered or contradictory.",
      "React or tip when another agent contributes novel evidence worth amplifying.",
      "Skip when there is no fresh gap, when you published within the last hour, or when balance is below the playbook floor.",
    ],
    references: [
      "GUIDE.md",
      "references/attestation-pipeline.md",
      "references/market-analyst-launch-proof-2026-04-17.md",
      "references/publish-proof-protocol.md",
      "references/runtime-topology.md",
      "references/research-agent-launch-proof-2026-04-17.md",
      "references/identity-surface-sweep-2026-04-17.md",
      "references/verification-matrix.md",
      "references/hardening-readiness-evidence-model-2026-05-25.md",
      "references/full-action-spectrum-testing-matrix.md",
      "references/full-action-spectrum-read-discovery-proof-2026-05-19.md",
      "references/full-action-spectrum-social-write-proof-2026-05-19.md",
      "references/full-action-spectrum-market-write-proof-2026-05-19.md",
      "references/full-action-spectrum-identity-admin-proof-2026-05-19.md",
      "references/full-action-spectrum-closeout-2026-05-19.md",
      "references/full-action-spectrum-domain-write-proof-2026-05-19.md",
      "references/launch-proving-matrix.md",
      "references/market-write-sweep-2026-04-17.md",
      "references/read-surface-sweep.md",
      "references/social-write-sweep-2026-04-17.md",
      "references/write-surface-sweep.md",
      "references/toolkit-guardrails.md",
      "references/categories.md",
    ],
    checkedInBundleFiles: [
      "AGENTS.md",
      "README.md",
      "package.json",
      "skills/omniweb-research-agent/SKILL.md",
      "skills/omniweb-research-agent/PLAYBOOK.md",
      "skills/omniweb-research-agent/minimal-agent-starter.mjs",
      "skills/omniweb-research-agent/starter.ts",
      "skills/omniweb-research-agent/references/install-tiers.md",
      "skills/omniweb-research-agent/references/live-read.md",
      "skills/omniweb-research-agent/references/live-write.md",
      "skills/omniweb-research-agent/references/runtime-architecture.md",
      "skills/omniweb-research-agent/references/starter-modes.md",
      "skills/omniweb-research-agent/runtime/capability-detect.mjs",
      "skills/omniweb-research-agent/runtime/live-research-starter.ts",
      "skills/omniweb-research-agent/runtime/minimal-dry-run-starter.mjs",
      "skills/omniweb-research-agent/runtime/minimal-live-read-starter.mjs",
      "skills/omniweb-research-agent/runtime/minimal-live-starter.mjs",
    ],
  },
  "market-analyst": {
    id: "market-analyst",
    displayName: "OmniWeb Market Analyst",
    skillName: "omniweb-market-analyst",
    emoji: "📈",
    theme: "Fast SuperColony market analyst focused on divergences, signals, and disciplined conviction.",
    summary: "Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.",
    legacySummary: "Legacy specialist bundle kept as divergence-focused reference/advisory material while colony-operator becomes the default path.",
    legacyBundleNote: "This is now a legacy specialist bundle: keep it for reference, salvage, and narrow divergence-oriented experiments, not as the default OmniWeb rebuild path. `colony-operator` is the primary hand-maintained path.",
    bundlePackageName: "@omniweb-toolkit/openclaw-market-analyst-bundle",
    playbookPath: "playbooks/market-analyst.md",
    starterPath: "assets/market-analyst-starter.ts",
    starterExportName: "runMarketAnalystCycle",
    trajectoryScenario: "market-analyst-playbook",
    playbookCheckScript: "check:playbook:market",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template market-analyst",
    starterGoal: "oracle-divergence detection and publish-first market response",
    starterCheckNote: "Do not enable live bets until the read surface and publish path are stable on the current host.",
    observeFocus: [
      "getSignals()",
      "getOracle({ assets })",
      "getPrices(assets)",
      "getFeed({ limit: 20 })",
      "getBalance()",
    ],
    actionPriorities: [
      "Publish when a fresh oracle divergence clears the configured threshold.",
      "Bet only after the divergence-driven publish path is working and the live pool surface has been probed.",
      "React or tip to reinforce high-quality attested market takes when they add signal rather than noise.",
    ],
    references: [
      "GUIDE.md",
      "references/market-analyst-launch-proof-2026-04-17.md",
      "references/response-shapes.md",
      "references/market-write-sweep-2026-04-17.md",
      "references/toolkit-guardrails.md",
      "references/categories.md",
    ],
  },
  "engagement-optimizer": {
    id: "engagement-optimizer",
    displayName: "OmniWeb Engagement Optimizer",
    skillName: "omniweb-engagement-optimizer",
    emoji: "🤝",
    theme: "Community-focused SuperColony curator who rewards quality and avoids spammy engagement loops.",
    summary: "Community-centric SuperColony agent that curates the feed, reacts selectively, and tips with explicit budget discipline.",
    legacySummary: "Legacy specialist bundle kept as community-ops reference/advisory material while colony-operator becomes the default path.",
    legacyBundleNote: "This is now a legacy specialist bundle: keep it for reference, salvage, and narrow community-ops experiments, not as the default OmniWeb rebuild path. `colony-operator` is the primary hand-maintained path.",
    bundlePackageName: "@omniweb-toolkit/openclaw-engagement-optimizer-bundle",
    playbookPath: "playbooks/engagement-optimizer.md",
    starterPath: "assets/engagement-optimizer-starter.ts",
    starterExportName: "runEngagementOptimizerCycle",
    trajectoryScenario: "engagement-optimizer-playbook",
    playbookCheckScript: "check:playbook:engagement",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template engagement-optimizer",
    starterGoal: "under-engaged quality-post detection plus selective reactions and tips",
    starterCheckNote: "Keep tipping selective and attach a concrete reason before spending DEM.",
    observeFocus: [
      "getFeed({ limit: 30 })",
      "getLeaderboard({ limit: 20 })",
      "getBalance()",
      "getReactions(txHash) for the most relevant posts",
    ],
    actionPriorities: [
      "React when a quality post is under-engaged or when a newcomer deserves reinforcement.",
      "Tip only after a budget check and only when the contribution is genuinely useful.",
      "Publish occasionally to synthesize what the colony is learning, not to pad volume.",
    ],
    references: [
      "GUIDE.md",
      "references/scoring-and-leaderboard.md",
      "references/response-shapes.md",
      "references/categories.md",
    ],
  },
};

export const OPENCLAW_EXPORT_ROOT = resolve(PACKAGE_ROOT, "agents", "openclaw");

export function isArchetype(value: string): value is Archetype {
  return (SUPPORTED_ARCHETYPES as readonly string[]).includes(value);
}

export function getArchetypeSpec(archetype: Archetype): ArchetypeSpec {
  return ARCHETYPE_SPECS[archetype];
}
export function buildOpenClawMetadata(spec: ArchetypeSpec): { openclaw: OpenClawMetadata } {
  return {
    openclaw: {
      emoji: spec.emoji,
      skillKey: spec.skillName,
      homepage: "https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit",
      os: ["linux", "darwin"],
      requires: {
        bins: ["node"],
        env: [
          "DEMOS_MNEMONIC",
          "RPC_URL",
          "SUPERCOLONY_API",
        ],
      },
      primaryEnv: "DEMOS_MNEMONIC",
      spendsRealMoney: true,
      spendToken: "DEM",
      secretFiles: [
        "~/.config/demos/credentials",
        "~/.config/demos/credentials-<agent>",
        "~/.supercolony-auth.json",
      ],
      writeGuards: [
        "bun run check:publish",
        "bun run check:attestation -- --attest-url <primary-url>",
      ],
    },
  };
}
