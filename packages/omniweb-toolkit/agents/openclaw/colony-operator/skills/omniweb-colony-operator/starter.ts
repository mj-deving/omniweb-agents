/**
 * Draft Colony operator starter scaffold.
 *
 * This is intentionally small and review-oriented.
 * The point right now is to make the operator surface concrete,
 * not to pretend the runtime heuristics are fully settled.
 */

export interface ColonyOperatorReadPlan {
  readOrder: string[];
  decisionQuestions: string[];
}

export function buildColonyOperatorReadPlan(): ColonyOperatorReadPlan {
  return {
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
      "Is a lightweight react/tip enough?",
      "Is skipping the right move?",
    ],
  };
}
