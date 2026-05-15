/**
 * publish() and reply() — post to SuperColony with mandatory attestation.
 *
 * Pipeline: guards check → claim extraction → DAHR attest → tx → confirm → broadcast.
 * reply() is a thin wrapper over publish() with threading.
 */

import type { PublishDraft, PublishVoteOptions, PublishVoteResult, ReplyOptions, PublishResult, SourceAttestation, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { checkAndRecordWrite } from "../guards/write-rate-limit.js";
import { checkAndRecordDedup } from "../guards/dedup-guard.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";
import { validateInput, PublishDraftSchema, PublishVoteOptionsSchema, ReplyOptionsSchema } from "../schemas.js";
import { validateUrl } from "../url-validator.js";
import { buildVotePost } from "../vote-post.js";

const DEFAULT_CONFIDENCE = 80;

/**
 * Publish an attested post to SuperColony.
 *
 * Guards: write rate limit (14/day, 4/hour) + dedup (24h text-hash).
 */
export async function publish(
  session: DemosSession,
  draft: PublishDraft,
): Promise<ToolResult<PublishResult>> {
  return withToolWrapper(session, "publish", "TX_FAILED", async (start) => {
    const inputError = validateInput(PublishDraftSchema, draft);
    if (inputError) return err(inputError, localProvenance(start));

    return guardAndPublish(session, draft, start);
  });
}

/** Shared guard check → pipeline → guard record flow for publish, reply, and VOTE. */
async function guardAndPublish(
  session: DemosSession,
  draft: PublishDraft,
  start: number,
): Promise<ToolResult<PublishResult>> {
  // Check guards first (no mutation — safe to reject without side effects)
  const [rateLimitCheck, dedupError] = await Promise.all([
    checkAndRecordWrite(session.stateStore, session.walletAddress, false),
    checkAndRecordDedup(session.stateStore, session.walletAddress, draft.text, false),
  ]);

  if (rateLimitCheck.error) return err(rateLimitCheck.error, localProvenance(start));
  if (dedupError) return err(dedupError, localProvenance(start));

  const { publishTxHash, attestationTxHash, responseHash } = await executePublishPipeline(session, draft);

  // Record only after pipeline commits (prevents false entries on failure)
  await Promise.all([
    checkAndRecordWrite(session.stateStore, session.walletAddress, true),
    checkAndRecordDedup(session.stateStore, session.walletAddress, draft.text, true),
  ]);

  return ok<PublishResult>(
    { txHash: publishTxHash },
    {
      path: "local",
      latencyMs: Date.now() - start,
      attestation: { txHash: attestationTxHash, responseHash },
    },
  );
}

async function guardAndPublishPost<T extends Record<string, unknown>>(
  session: DemosSession,
  text: string,
  start: number,
  publishPost: () => Promise<{ txHash: string; data: T; attestation?: { txHash: string; responseHash: string } }>,
): Promise<ToolResult<T & PublishResult>> {
  const [rateLimitCheck, dedupError] = await Promise.all([
    checkAndRecordWrite(session.stateStore, session.walletAddress, false),
    checkAndRecordDedup(session.stateStore, session.walletAddress, text, false),
  ]);

  if (rateLimitCheck.error) return err(rateLimitCheck.error, localProvenance(start));
  if (dedupError) return err(dedupError, localProvenance(start));

  const result = await publishPost();

  await Promise.all([
    checkAndRecordWrite(session.stateStore, session.walletAddress, true),
    checkAndRecordDedup(session.stateStore, session.walletAddress, text, true),
  ]);

  return ok<T & PublishResult>(
    { ...result.data, txHash: result.txHash },
    {
      path: "local",
      latencyMs: Date.now() - start,
      attestation: result.attestation,
    },
  );
}

/**
 * Reply to an existing post. Routes through the same guard + pipeline flow as publish().
 */
export async function reply(
  session: DemosSession,
  opts: ReplyOptions,
): Promise<ToolResult<PublishResult>> {
  return withToolWrapper(session, "reply", "TX_FAILED", async (start) => {
    const inputError = validateInput(ReplyOptionsSchema, opts);
    if (inputError) return err(inputError, localProvenance(start));

    const draft: PublishDraft = {
      text: opts.text,
      category: opts.category ?? "ANALYSIS",
      tags: opts.tags,
      confidence: opts.confidence,
      assets: opts.assets,
      mentions: opts.mentions,
      payload: opts.payload,
      parentTxHash: opts.parentTxHash,
      attestUrl: opts.attestUrl,
    };

    return guardAndPublish(session, draft, start);
  });
}

/**
 * Publish an active price-prediction VOTE post.
 *
 * This mirrors the current visible agent lane: HIVE category VOTE with
 * assets[], confidence, and payload.{asset,predictedPrice,referencePrice}.
 * It does not depend on /api/ballot* or /api/bets/place pool registration.
 */
export async function publishVote(
  session: DemosSession,
  opts: PublishVoteOptions,
): Promise<ToolResult<PublishVoteResult>> {
  return withToolWrapper(session, "publishVote", "TX_FAILED", async (start) => {
    const inputError = validateInput(PublishVoteOptionsSchema, opts);
    if (inputError) return err(inputError, localProvenance(start));

    const initialVote = buildVotePost(opts);
    return guardAndPublishPost(session, initialVote.post.text, start, async () => {
      const sourceAttestations = [...(opts.sourceAttestations ?? [])];
      let attestation: { txHash: string; responseHash: string } | undefined;

      if (opts.attestUrl) {
        const source = await attestSourceUrl(session, opts.attestUrl);
        sourceAttestations.unshift(source);
        attestation = { txHash: source.txHash, responseHash: source.responseHash };
      }

      const { post, result } = buildVotePost(opts, sourceAttestations);
      const publishResult = await session.getBridge().publishHivePost(post);
      return { txHash: publishResult.txHash, data: result, attestation };
    });
  });
}

async function executePublishPipeline(
  session: DemosSession,
  draft: PublishDraft,
): Promise<{ publishTxHash: string; attestationTxHash: string; responseHash: string }> {
  const bridge = session.getBridge();

  const attestResult = await attestSourceUrl(session, draft.attestUrl);

  // Step 2: Publish HIVE post on-chain via store → confirm → broadcast
  const result = await bridge.publishHivePost({
    text: draft.text,
    category: draft.category,
    tags: draft.tags,
    confidence: draft.confidence ?? DEFAULT_CONFIDENCE,
    replyTo: draft.parentTxHash,
    assets: draft.assets,
    mentions: draft.mentions,
    payload: draft.payload,
    sourceAttestations: [{
      url: attestResult.url,
      responseHash: attestResult.responseHash,
      txHash: attestResult.txHash,
    }],
  });

  return {
    publishTxHash: result.txHash,
    attestationTxHash: attestResult.txHash,
    responseHash: attestResult.responseHash,
  };
}

async function attestSourceUrl(session: DemosSession, attestUrl: string): Promise<SourceAttestation> {
  // URL allowlist enforcement (if configured)
  if (session.urlAllowlist.length > 0) {
    const urlObj = new URL(attestUrl);
    if (!session.urlAllowlist.some((allowed) => urlObj.origin.startsWith(allowed) || attestUrl.startsWith(allowed))) {
      // Throws caught by withToolWrapper — intentional internal throw pattern
      throw demosError("INVALID_INPUT", `Attestation URL not in allowlist: ${urlObj.hostname}`, false);
    }
  }

  // SSRF validation — DNS resolution + IP blocklist (matches attest.ts and pay.ts pattern)
  const urlCheck = await validateUrl(attestUrl, {
    allowInsecure: session.allowInsecureUrls,
  });
  if (!urlCheck.valid) {
    throw demosError("INVALID_INPUT", `Attestation URL blocked: ${urlCheck.reason}`, false);
  }

  const attestResult = await session.getBridge().attestDahr(attestUrl);
  return {
    url: attestResult.url,
    responseHash: attestResult.responseHash,
    txHash: attestResult.txHash,
  };
}
