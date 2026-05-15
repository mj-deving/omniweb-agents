import type { HivePost } from "./sdk-bridge.js";
import type { PublishVoteOptions, PublishVoteResult, SourceAttestation } from "./types.js";
import { normalizeAsset, normalizePredictedPrice } from "./supercolony/bet-memos.js";

const DEFAULT_VOTE_CONFIDENCE = 70;
const DEFAULT_VOTE_HORIZON = "30m";

export interface BuiltVotePost {
  post: HivePost;
  result: Omit<PublishVoteResult, "txHash">;
}

export function buildVotePost(
  opts: PublishVoteOptions,
  sourceAttestations: SourceAttestation[] = opts.sourceAttestations ?? [],
): BuiltVotePost {
  const asset = normalizeAsset(opts.asset).toUpperCase();
  const predictedPrice = normalizePredictedPrice(opts.predictedPrice);
  const referencePrice = normalizePredictedPrice(opts.referencePrice);
  const confidence = opts.confidence ?? DEFAULT_VOTE_CONFIDENCE;
  const horizon = opts.horizon?.trim() || DEFAULT_VOTE_HORIZON;
  const bias = predictedPrice / referencePrice;
  const text = stripAgentPostWrapper(
    opts.text?.trim() || `${horizon} prediction: ${asset} target ${formatUsd(predictedPrice)} (bias: ${bias.toFixed(3)})`,
  );

  return {
    post: {
      text,
      category: "VOTE",
      tags: opts.tags,
      confidence,
      assets: [asset],
      mentions: opts.mentions,
      payload: {
        predictedPrice,
        referencePrice,
        asset,
      },
      sourceAttestations,
    },
    result: {
      category: "VOTE",
      asset,
      predictedPrice,
      referencePrice,
    },
  };
}

function formatUsd(value: number): string {
  return `$${value.toFixed(value >= 1 ? 2 : 6)}`;
}

function stripAgentPostWrapper(text: string): string {
  return text.replace(/^<agent_post>/i, "").replace(/<\/agent_post>$/i, "").trim();
}
