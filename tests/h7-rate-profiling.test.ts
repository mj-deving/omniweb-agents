/**
 * H7 Rate Profiling — validate shared 5 req/hr Skill Dojo budget.
 *
 * Simulates realistic agent cron sessions calling Skill Dojo skills
 * against the shared 5 req/hr per IP rate limit.
 *
 * Key question: Can we run 3+ agents with Skill Dojo skills in a
 * single cron window without exhausting the rate limit?
 */

import { describe, it, expect } from "vitest";

// ── Rate Limit Simulator ──────────────────────────────

interface SkillCall {
  agent: string;
  skill: string;
  minuteOffset: number; // minutes into the cron window
}

interface SimulationResult {
  totalCalls: number;
  accepted: number;
  rejected: number;
  rejectedCalls: SkillCall[];
  peakCallsInWindow: number;
  timeline: { minute: number; callsInLastHour: number }[];
}

function simulateRateLimit(
  calls: SkillCall[],
  maxPerHour: number,
): SimulationResult {
  const sorted = [...calls].sort((a, b) => a.minuteOffset - b.minuteOffset);
  const accepted: SkillCall[] = [];
  const rejected: SkillCall[] = [];
  const callTimestamps: number[] = []; // minutes

  for (const call of sorted) {
    // Prune calls older than 60 minutes
    const cutoff = call.minuteOffset - 60;
    while (callTimestamps.length > 0 && callTimestamps[0] <= cutoff) {
      callTimestamps.shift();
    }

    if (callTimestamps.length < maxPerHour) {
      callTimestamps.push(call.minuteOffset);
      accepted.push(call);
    } else {
      rejected.push(call);
    }
  }

  // Build timeline at each minute where a call happens
  const timeline: { minute: number; callsInLastHour: number }[] = [];
  const allTimestamps: number[] = [];
  for (const call of sorted) {
    allTimestamps.push(call.minuteOffset);
    const cutoff = call.minuteOffset - 60;
    const inWindow = allTimestamps.filter((t) => t > cutoff).length;
    timeline.push({ minute: call.minuteOffset, callsInLastHour: inWindow });
  }

  return {
    totalCalls: calls.length,
    accepted: accepted.length,
    rejected: rejected.length,
    rejectedCalls: rejected,
    peakCallsInWindow: Math.max(...timeline.map((t) => t.callsInLastHour), 0),
    timeline,
  };
}

// ── Agent Call Profiles ───────────────────────────────

/**
 * Scenario A: Current plan — 3 active agents with Skill Dojo skills.
 * Sequential execution in one cron job (scheduled-run.sh pattern).
 * Each agent session takes ~5-15 minutes.
 *
 * sentinel:     prediction-market (1 call) — starts at minute 0
 * defi-markets: defi-agent (1 call) — starts at minute 15
 * infra-ops:    network-monitor + address-monitoring (2 calls) — starts at minute 30
 */
const SCENARIO_A_SEQUENTIAL: SkillCall[] = [
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 2 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 17 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 32 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 34 },
];

/**
 * Scenario B: Add pioneer (also uses prediction-market).
 * 4 agents sequential, each ~15 minutes apart.
 */
const SCENARIO_B_WITH_PIONEER: SkillCall[] = [
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 2 },
  { agent: "pioneer", skill: "prediction-market", minuteOffset: 17 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 32 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 47 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 49 },
];

/**
 * Scenario C: Worst case — all agents need 2 calls each.
 * Future state where every agent has a data + monitoring skill.
 */
const SCENARIO_C_WORST_CASE: SkillCall[] = [
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 2 },
  { agent: "sentinel", skill: "network-monitor", minuteOffset: 4 },
  { agent: "pioneer", skill: "prediction-market", minuteOffset: 17 },
  { agent: "pioneer", skill: "defi-agent", minuteOffset: 19 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 32 },
  { agent: "defi-markets", skill: "chain-operations", minuteOffset: 34 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 47 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 49 },
];

/**
 * Scenario D: Burst — all agents fire simultaneously (e.g., cron overlap).
 */
const SCENARIO_D_BURST: SkillCall[] = [
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 0 },
  { agent: "pioneer", skill: "prediction-market", minuteOffset: 0 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 1 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 1 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 2 },
  { agent: "nexus", skill: "address-monitoring", minuteOffset: 2 },
];

/**
 * Scenario E: Two cron windows back-to-back (6h apart, but rate limit
 * is 1h sliding window — no conflict).
 */
const SCENARIO_E_TWO_WINDOWS: SkillCall[] = [
  // Window 1
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 2 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 17 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 32 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 34 },
  // Window 2 (6h = 360 minutes later)
  { agent: "sentinel", skill: "prediction-market", minuteOffset: 362 },
  { agent: "defi-markets", skill: "defi-agent", minuteOffset: 377 },
  { agent: "infra-ops", skill: "network-monitor", minuteOffset: 392 },
  { agent: "infra-ops", skill: "address-monitoring", minuteOffset: 394 },
];

// ── Tests ─────────────────────────────────────────────

describe("H7: Skill Dojo Rate Limit Profiling", () => {
  const RATE_LIMIT = 5;

  it("Scenario A: 3 agents sequential (4 calls) — FITS", () => {
    const result = simulateRateLimit(SCENARIO_A_SEQUENTIAL, RATE_LIMIT);
    expect(result.totalCalls).toBe(4);
    expect(result.rejected).toBe(0);
    expect(result.peakCallsInWindow).toBe(4);
    // Budget headroom
    expect(RATE_LIMIT - result.peakCallsInWindow).toBe(1);
  });

  it("Scenario B: 4 agents sequential (5 calls) — FITS exactly", () => {
    const result = simulateRateLimit(SCENARIO_B_WITH_PIONEER, RATE_LIMIT);
    expect(result.totalCalls).toBe(5);
    expect(result.rejected).toBe(0);
    expect(result.peakCallsInWindow).toBe(5);
    // Zero headroom
    expect(RATE_LIMIT - result.peakCallsInWindow).toBe(0);
  });

  it("Scenario C: 4 agents × 2 calls (8 calls) — EXCEEDS, 3 rejected", () => {
    const result = simulateRateLimit(SCENARIO_C_WORST_CASE, RATE_LIMIT);
    expect(result.totalCalls).toBe(8);
    expect(result.rejected).toBe(3);
    expect(result.rejectedCalls.map((c) => c.agent)).toEqual([
      "defi-markets",
      "infra-ops",
      "infra-ops",
    ]);
  });

  it("Scenario D: burst (6 calls in 2 min) — 1 rejected", () => {
    const result = simulateRateLimit(SCENARIO_D_BURST, RATE_LIMIT);
    expect(result.totalCalls).toBe(6);
    expect(result.rejected).toBe(1);
  });

  it("Scenario E: two 6h-apart windows — both fit independently", () => {
    const result = simulateRateLimit(SCENARIO_E_TWO_WINDOWS, RATE_LIMIT);
    expect(result.totalCalls).toBe(8);
    expect(result.rejected).toBe(0);
    // Windows are 360 min apart — no overlap in 60-min sliding window
  });

  it("summary: maximum safe call count per cron window", () => {
    // With 5 req/hr and sequential 15-min-apart sessions,
    // all calls land within one 60-min sliding window.
    // Max safe calls = RATE_LIMIT = 5
    const safeCalls = RATE_LIMIT;

    // Our Wave 1 plan: sentinel(1) + defi-markets(1) + infra-ops(2) = 4
    const wave1Calls = 4;
    expect(wave1Calls).toBeLessThanOrEqual(safeCalls);

    // With pioneer added: sentinel(1) + pioneer(1) + defi-markets(1) + infra-ops(2) = 5
    const wave1WithPioneer = 5;
    expect(wave1WithPioneer).toBeLessThanOrEqual(safeCalls);

    // Headroom analysis
    const headroomWave1 = safeCalls - wave1Calls;
    const headroomWithPioneer = safeCalls - wave1WithPioneer;

    expect(headroomWave1).toBe(1);       // 1 retry or 1 extra call
    expect(headroomWithPioneer).toBe(0);  // ZERO headroom — no retries possible
  });
});
