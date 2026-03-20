/**
 * Sources plugin — source preflight verification and post-generation match scoring.
 *
 * This is the most complete plugin because it has actual inline hook implementations.
 * The beforePublishDraft hook runs preflight checks against the source catalog,
 * and the afterPublishDraft hook scores how well the generated post matches
 * its claimed sources.
 *
 * Delegates to:
 * - tools/lib/sources/policy.ts  (preflight)
 * - tools/lib/sources/matcher.ts (match)
 */

import type { FrameworkPlugin } from "../types.js";
import type {
  BeforePublishDraftContext,
  AfterPublishDraftContext,
  PublishGateDecision,
  SourceMatchDecision,
} from "../lib/extensions.js";
import { preflight } from "../lib/sources/policy.js";
import { match } from "../lib/sources/matcher.js";

// ── Typed hook functions for the extension dispatcher ──

/**
 * beforePublishDraft hook for sources extension.
 * Runs preflight check using the catalog index.
 */
export async function sourcesBeforePublishDraft(
  ctx: BeforePublishDraftContext
): Promise<PublishGateDecision | void> {
  if (!ctx.sourceView) return;

  const result = preflight(ctx.topic, ctx.sourceView, ctx.config);

  if (!result.pass) {
    return {
      pass: false,
      reason: result.reason,
      reasonCode: result.reasonCode,
    };
  }

  return {
    pass: true,
    reason: result.reason,
    reasonCode: result.reasonCode,
    candidates: result.candidates,
  };
}

/**
 * afterPublishDraft hook for sources extension.
 * Runs match() to verify post-generation source alignment.
 */
export async function sourcesAfterPublishDraft(
  ctx: AfterPublishDraftContext
): Promise<SourceMatchDecision | void> {
  if (!ctx.sourceView || !ctx.preflightCandidates) return;

  const result = await match({
    topic: ctx.topic,
    postText: ctx.postText,
    postTags: ctx.postTags,
    candidates: ctx.preflightCandidates,
    sourceView: ctx.sourceView,
    llm: ctx.llm,
    prefetchedResponses: ctx.prefetchedResponses,
  });

  return {
    pass: result.pass,
    reason: result.reason,
    reasonCode: result.reasonCode,
    best: result.best,
    considered: result.considered,
  };
}

export function createSourcesPlugin(): FrameworkPlugin {
  return {
    name: "sources",
    version: "1.0.0",
    description:
      "Source preflight verification and post-generation match scoring",

    hooks: {
      /** Run preflight checks against the source catalog before publishing. */
      beforePublishDraft: async (ctx: any): Promise<void> => {
        if (!ctx.sourceView) return;
        const result = await preflight(ctx.topic, ctx.sourceView, ctx.config);
        ctx.preflightResult = result;
      },

      /** Score how well the generated post matches its claimed sources. */
      afterPublishDraft: async (ctx: any): Promise<void> => {
        if (!ctx.sourceView || !ctx.preflightCandidates) return;
        const result = await match({
          topic: ctx.topic,
          postText: ctx.postText,
          postTags: ctx.postTags,
          candidates: ctx.preflightCandidates,
          sourceView: ctx.sourceView,
          llm: ctx.llm,
          prefetchedResponses: ctx.prefetchedResponses,
        });
        ctx.matchResult = result;
      },
    },

    async init(_config) {
      // Sources plugin is stateless — no initialization needed.
      // The dynamic imports above handle lazy loading of heavy modules.
    },

    async destroy() {
      // Nothing to clean up.
    },
  };
}
