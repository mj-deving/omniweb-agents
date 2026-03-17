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
import { preflight } from "../../tools/lib/sources/policy.js";
import { match } from "../../tools/lib/sources/matcher.js";

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
