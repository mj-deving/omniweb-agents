export async function runDirectAttestedWrite(opts: {
  omni: any;
  kind: "publish" | "reply";
  draft: {
    text: string;
    category: string;
    attestUrl: string;
    confidence?: number;
    tags?: string[];
    parentTxHash?: string;
  };
  verifyPublishVisibility?: (
    omni: unknown,
    txHash: string | undefined,
    text: string,
    cfg: { timeoutMs: number; pollMs: number; limit: number },
  ) => Promise<unknown>;
  verification?: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  };
}) {
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

    let visibility: unknown;
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
