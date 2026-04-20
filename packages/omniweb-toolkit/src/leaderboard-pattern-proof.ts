import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildMinimalAttestationPlan } from "./minimal-attestation-plan.js";
import {
  runMinimalAgentCycle,
  type MinimalCycleRecord,
  type MinimalObserveResult,
} from "./minimal-agent.js";
import {
  getStarterSourcePack,
  type StarterArchetype,
  type StarterSourcePackEntry,
} from "./starter-source-packs.js";

type ProofArchetype = StarterArchetype;

export interface LeaderboardPatternProofEntry {
  archetype: ProofArchetype;
  sourceId: string;
  attestationReady: boolean;
  attestUrl: string | null;
  decision: "publish" | "skip";
  ok: boolean;
  outcomeStatus: MinimalCycleRecord["outcome"]["status"];
  observedScore: number | null;
}

export interface LeaderboardPatternSkipControl {
  ok: boolean;
  outcomeStatus: MinimalCycleRecord["outcome"]["status"];
  reason: string;
}

export interface LeaderboardPatternProofReport {
  checkedAt: string;
  ok: boolean;
  results: LeaderboardPatternProofEntry[];
  skipControl: LeaderboardPatternSkipControl;
}

const ARCHETYPES: ProofArchetype[] = ["research", "market", "engagement"];

export async function runLeaderboardPatternProof(): Promise<LeaderboardPatternProofReport> {
  const results: LeaderboardPatternProofEntry[] = [];

  for (const archetype of ARCHETYPES) {
    results.push(await runPublishProof(archetype));
  }

  const skipControl = await runSkipControl();

  return {
    checkedAt: new Date().toISOString(),
    ok: results.every((entry) => entry.ok) && skipControl.ok,
    results,
    skipControl,
  };
}

async function runPublishProof(archetype: ProofArchetype): Promise<LeaderboardPatternProofEntry> {
  const pack = getStarterSourcePack(archetype);
  const entry = pack.entries[0];
  const plan = buildMinimalAttestationPlan({
    topic: entry.label,
    preferredSourceIds: [entry.sourceId],
    allowTopicFallback: false,
  });

  if (!plan.ready || !plan.primary) {
    return {
      archetype,
      sourceId: entry.sourceId,
      attestationReady: false,
      attestUrl: null,
      decision: "skip",
      ok: false,
      outcomeStatus: "failed",
      observedScore: null,
    };
  }

  const stateDir = await mkdtemp(resolve(tmpdir(), `leaderboard-pattern-${archetype}-`));
  const score = 80 + ARCHETYPES.indexOf(archetype);
  const txHash = `0x${archetype}proof`;
  const text = buildProofText(archetype, entry, plan.primary.ratingOverall, plan.primary.score);

  try {
    const record = await runMinimalAgentCycle(
      async (): Promise<MinimalObserveResult> => ({
        kind: "publish",
        category: archetype === "engagement" ? "OBSERVATION" : "ANALYSIS",
        text,
        attestUrl: plan.primary!.url,
        confidence: 70,
        tags: ["leaderboard-pattern", archetype],
        attestationPlan: plan,
        facts: {
          sourceId: entry.sourceId,
          sourceLabel: entry.label,
          promptPreview: [
            `${entry.label} source rating: ${plan.primary!.ratingOverall}`,
            `Source selection score: ${plan.primary!.score}`,
            `Thesis style: one short numeric claim with uncertainty.`,
          ],
        },
      }),
      {
        omni: makeProofOmni(txHash, text, score, archetype === "engagement" ? "OBSERVATION" : "ANALYSIS"),
        stateDir,
        cycleId: `${archetype}-proof`,
        now: () => Date.UTC(2026, 3, 20, 7, 30, ARCHETYPES.indexOf(archetype)),
      },
    );

    return {
      archetype,
      sourceId: entry.sourceId,
      attestationReady: true,
      attestUrl: plan.primary.url,
      decision: "publish",
      ok: record.outcome.status === "published" && record.outcome.verification?.indexedVisible === true,
      outcomeStatus: record.outcome.status,
      observedScore: record.outcome.verification?.observedScore ?? null,
    };
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
}

async function runSkipControl(): Promise<LeaderboardPatternSkipControl> {
  const stateDir = await mkdtemp(resolve(tmpdir(), "leaderboard-pattern-skip-"));

  try {
    const record = await runMinimalAgentCycle(
      async (): Promise<MinimalObserveResult> => ({
        kind: "skip",
        reason: "no_attestation_ready_source",
        facts: {
          note: "Harness control path for skip-or-publish behavior.",
        },
      }),
      {
        omni: makeProofOmni("0xskip", "unused", 0, "OBSERVATION"),
        stateDir,
        cycleId: "skip-control",
        now: () => Date.UTC(2026, 3, 20, 7, 31, 0),
      },
    );

    return {
      ok: record.outcome.status === "skipped",
      outcomeStatus: record.outcome.status,
      reason: "no_attestation_ready_source",
    };
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
}

function buildProofText(
  archetype: ProofArchetype,
  entry: StarterSourcePackEntry,
  ratingOverall: number,
  score: number,
): string {
  const posture = archetype === "engagement"
    ? "one short curated observation"
    : "one short attested thesis";

  return `${entry.label} is publishable as ${posture} because the primary source rates ${ratingOverall} overall and the source-selection score is ${score}. Keep the claim narrow until the next attested refresh confirms the move.`;
}

function makeProofOmni(
  txHash: string,
  text: string,
  score: number,
  category: string,
): any {
  return {
    colony: {
      publish: async () => ({
        ok: true,
        data: { txHash },
        provenance: {
          path: "local",
          latencyMs: 10,
          attestation: {
            txHash: `${txHash}-attest`,
            responseHash: `${txHash}-response`,
          },
        },
      }),
      reply: async () => ({
        ok: true,
        data: { txHash },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash,
              payload: {
                cat: category,
                text,
              },
              score,
              blockNumber: 321,
            },
          ],
          meta: { lastBlock: 321 },
        },
      }),
      getPostDetail: async () => ({
        ok: false,
        error: "not_found",
      }),
    },
    runtime: {
      sdkBridge: {},
    },
  };
}
