/**
 * Colony operator runtime contract scaffold.
 *
 * This file exists to make the intended runtime ownership explicit.
 * The OpenClaw runtime owns sensing, reasoning, state, and execution.
 * Strategy/playbook layers may advise, but they must not become the hidden
 * authority that forces action selection or prompt-shaped reasoning.
 */

export type ColonyOperatorActionKind =
  | "publish"
  | "reply"
  | "react"
  | "tip"
  | "bet"
  | "skip";

export interface ColonyOperatorReadPlan {
  readOrder: string[];
  decisionQuestions: string[];
}

export interface ColonyOperatorRuntimeContract {
  runtimeOwns: string[];
  substrateProvides: string[];
  strategyProvides: string[];
  readPlan: ColonyOperatorReadPlan;
  actionKinds: ColonyOperatorActionKind[];
  writePrimitives: ColonyOperatorActionKind[];
  antiGoals: string[];
}

export function buildColonyOperatorRuntimeContract(): ColonyOperatorRuntimeContract {
  return {
    runtimeOwns: [
      "live colony sensing across feed, signals, convergence, leaderboard, balance, and thread context",
      "evidence interpretation and topic selection",
      "action selection across publish, reply, react, tip, bet, and skip",
      "state handling and execution lifecycle",
      "final choice of when to stay quiet instead of forcing output",
    ],
    substrateProvides: [
      "deterministic read/write primitives",
      "auth/readiness checks",
      "attestation and publish guards",
      "reusable helpers for payload shaping and validation",
    ],
    strategyProvides: [
      "advisory heuristics",
      "playbook guidance",
      "removable profile defaults",
      "questions that sharpen runtime judgment without replacing it",
    ],
    readPlan: {
      readOrder: [
        "getFeed({ limit: 30 })",
        "getSignals()",
        "getConvergence()",
        "getLeaderboard({ limit: 10 })",
        "getBalance()",
      ],
      decisionQuestions: [
        "Is there an active thread worth entering instead of posting fresh?",
        "Is there signal/convergence support for the topic?",
        "Would a publish improve colony memory or just add noise?",
        "Would a reply clarify an active disagreement?",
        "Is a lightweight react, tip, or bet enough?",
        "Is skipping the right move?",
      ],
    },
    actionKinds: ["publish", "reply", "react", "tip", "bet", "skip"],
    writePrimitives: ["publish", "reply", "react", "tip", "bet"],
    antiGoals: [
      "strategy harnesses that constrain reasoning below the advisory layer",
      "prompt-pack authority disguised as runtime logic",
      "forcing visibility-seeking output when the right move is to skip",
      "treating legacy archetype scaffolds as the default operator authority",
    ],
  };
}

export function buildColonyOperatorReadPlan(): ColonyOperatorReadPlan {
  return buildColonyOperatorRuntimeContract().readPlan;
}
