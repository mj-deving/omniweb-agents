import type { PublishVisibilityResult } from "../src/publish-visibility.ts";
import { runDirectAttestedWrite } from "./_direct-attested-write.ts";
import { describePublishVisibilityResult } from "./_publish-visibility-summary.ts";

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
  const { dryRun, stateDir, decision } = opts;
  const startedAt = new Date().toISOString();

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

  const write = await runDirectAttestedWrite({
    omni: opts.omni,
    kind: "publish",
    draft: {
      text: decision.text,
      category: decision.category,
      attestUrl: decision.attestUrl,
      confidence: decision.confidence,
    },
    verifyPublishVisibility: opts.verifyPublishVisibility,
    verification: opts.verification,
  });

  if (!write.accepted) {
    return {
      startedAt: write.startedAt,
      stateDir: stateDir ?? null,
      decision,
      outcome: {
        status: "failed",
        demSpendEstimate: 0,
        publishResult: write.result,
        error: {
          stage: "execute",
          message: write.error?.message ?? "publish_failed",
          code: write.error?.code,
          retryable: write.error?.retryable,
        },
      },
    };
  }

  return {
    startedAt: write.startedAt,
    stateDir: stateDir ?? null,
    decision,
    outcome: {
      status: "published",
      txHash: write.txHash,
      attestationTxHash: write.attestationTxHash,
      attestationResponseHash: write.attestationResponseHash,
      demSpendEstimate: 1,
      publishResult: write.result,
      verification: write.visibility,
      verificationSummary: describePublishVisibilityResult(write.visibility as PublishVisibilityResult | undefined),
    },
  };
}
