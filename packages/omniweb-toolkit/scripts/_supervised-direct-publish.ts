export async function runDirectSupervisedPublish(opts: {
  omni: any;
  dryRun: boolean;
  stateDir?: string;
  decision: {
    text: string;
    category: string;
    attestUrl: string;
    confidence: number;
    [key: string]: unknown;
  };
  verifyPublishVisibility: (
    omni: unknown,
    txHash: string | undefined,
    text: string,
    cfg: { timeoutMs: number; pollMs: number; limit: number },
  ) => Promise<unknown>;
  verification: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  };
}) {
  const startedAt = new Date().toISOString();
  const { omni, dryRun, stateDir, decision, verifyPublishVisibility, verification } = opts;

  if (dryRun) {
    return {
      startedAt,
      stateDir: stateDir ?? null,
      decision,
      outcome: {
        status: "dry_run",
        demSpendEstimate: 0,
      },
    };
  }

  try {
    const publishResult = await omni.colony.publish({
      text: decision.text,
      category: decision.category,
      attestUrl: decision.attestUrl,
      confidence: decision.confidence,
    });

    if (!publishResult.ok) {
      return {
        startedAt,
        stateDir: stateDir ?? null,
        decision,
        outcome: {
          status: "failed",
          demSpendEstimate: 0,
          publishResult,
          error: {
            stage: "execute",
            message: publishResult.error?.message ?? "publish_failed",
            code: publishResult.error?.code,
            retryable: publishResult.error?.retryable,
          },
        },
      };
    }

    const txHash = publishResult.data?.txHash;
    const attestationTxHash = publishResult.provenance.attestation?.txHash;
    const attestationResponseHash = publishResult.provenance.attestation?.responseHash;
    let verificationResult: unknown;
    try {
      verificationResult = await verifyPublishVisibility(omni, txHash, decision.text, verification);
    } catch (error) {
      verificationResult = {
        attempted: true,
        visible: false,
        indexedVisible: false,
        polls: 0,
        elapsedMs: 0,
        txHash,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      startedAt,
      stateDir: stateDir ?? null,
      decision,
      outcome: {
        status: "published",
        txHash,
        attestationTxHash,
        attestationResponseHash,
        demSpendEstimate: 1,
        publishResult,
        verification: verificationResult,
      },
    };
  } catch (error) {
    return {
      startedAt,
      stateDir: stateDir ?? null,
      decision,
      outcome: {
        status: "failed",
        demSpendEstimate: 0,
        error: {
          stage: "execute",
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      },
    };
  }
}
