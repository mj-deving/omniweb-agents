import type { PublishResult, ToolResult } from "../../../src/toolkit/types.js";
import type { PublishVisibilityResult } from "./publish-visibility.js";

export interface DirectAttestedWriteDraft {
  text: string;
  category?: string;
  attestUrl: string;
  confidence?: number;
  tags?: string[];
  parentTxHash?: string;
}

export interface DirectAttestedWriteVerificationOptions {
  timeoutMs: number;
  pollMs: number;
  limit: number;
}

export interface DirectAttestedWriteResult {
  startedAt: string;
  accepted: boolean;
  publishLatencyMs: number;
  txHash?: string;
  attestationTxHash?: string;
  attestationResponseHash?: string;
  provenancePath?: unknown;
  result?: ToolResult<PublishResult>;
  visibility?: PublishVisibilityResult | unknown;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}

export async function runDirectAttestedWrite(opts: {
  omni: any;
  kind: "publish" | "reply";
  draft: DirectAttestedWriteDraft;
  verifyPublishVisibility?: (
    omni: any,
    txHash: string | undefined,
    text: string,
    cfg: DirectAttestedWriteVerificationOptions,
  ) => Promise<PublishVisibilityResult | unknown>;
  verification?: DirectAttestedWriteVerificationOptions;
}): Promise<DirectAttestedWriteResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { omni, kind, draft, verifyPublishVisibility, verification } = opts;

  try {
    const result = kind === "publish"
      ? await omni.colony.publish({
          text: draft.text,
          category: draft.category,
          attestUrl: draft.attestUrl,
          confidence: draft.confidence,
          tags: draft.tags,
        })
      : await omni.colony.reply({
          parentTxHash: draft.parentTxHash,
          text: draft.text,
          attestUrl: draft.attestUrl,
          category: draft.category,
        });

    const publishLatencyMs = Date.now() - startedMs;

    if (!result?.ok) {
      return {
        startedAt,
        accepted: false,
        publishLatencyMs,
        result,
        error: {
          code: result?.error?.code ?? "UNKNOWN",
          message: result?.error?.message ?? `${kind}_failed`,
          retryable: result?.error?.retryable,
        },
      };
    }

    const txHash = result.data?.txHash;
    const attestationTxHash = result.provenance?.attestation?.txHash;
    const attestationResponseHash = result.provenance?.attestation?.responseHash;
    const provenancePath = result.provenance?.path;

    let visibility: PublishVisibilityResult | unknown;
    if (verifyPublishVisibility && verification) {
      try {
        visibility = await verifyPublishVisibility(omni, txHash, draft.text, verification);
      } catch (error) {
        visibility = {
          attempted: true,
          visible: false,
          indexedVisible: false,
          polls: 0,
          elapsedMs: 0,
          txHash,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      startedAt,
      accepted: true,
      publishLatencyMs,
      txHash,
      attestationTxHash,
      attestationResponseHash,
      provenancePath,
      result,
      visibility,
    };
  } catch (error) {
    return {
      startedAt,
      accepted: false,
      publishLatencyMs: Date.now() - startedMs,
      error: {
        code: "EXECUTE_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
    };
  }
}
