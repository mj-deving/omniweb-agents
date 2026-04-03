/**
 * Contradiction-driven disagree rule (Phase 8b).
 *
 * Generates REPLY actions when contradictions are detected between
 * posts and our verified evidence. Extracted from engine.ts.
 */

import type { DecisionContext, DecisionLog, StrategyConfig } from "./types.js";
import { normalize, getRule, createAction, type EngineCandidate, buildEvidenceIndex } from "./engine-helpers.js";

/**
 * Evaluate the disagree_contradiction rule and append candidates/considered.
 * Called from decideActions() in engine.ts after core and enrichment rules.
 */
export function evaluateContradictionRule(
  config: StrategyConfig,
  context: DecisionContext,
  evidenceIndex: ReturnType<typeof buildEvidenceIndex>,
  candidates: EngineCandidate[],
  considered: DecisionLog["considered"],
): void {
  const contradictionRule = getRule(config, "disagree_contradiction");
  if (!contradictionRule || !context.intelligence?.contradictions) return;

  for (const contradiction of context.intelligence.contradictions) {
    // Only generate REPLY if we have a supported value (evidence to back the disagreement)
    if (contradiction.supportedValue === null) continue;

    const action = createAction(
      contradictionRule,
      `Contradiction on ${contradiction.subject}/${contradiction.metric}: ${contradiction.claims.length} conflicting claims`,
      {
        target: contradiction.targetPostTxHash,
        evidence: (evidenceIndex.get(normalize(contradiction.subject)) ?? []).map((e) => e.sourceId),
        metadata: {
          subject: contradiction.subject,
          metric: contradiction.metric,
          supportedValue: contradiction.supportedValue,
          claimCount: contradiction.claims.length,
          topics: [contradiction.subject],
        },
      },
    );

    candidates.push({ action, rule: contradictionRule.name });
    considered.push({ action, rule: contradictionRule.name });
  }
}
