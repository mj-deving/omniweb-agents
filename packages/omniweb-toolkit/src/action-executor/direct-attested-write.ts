import type { OmniWeb } from "../colony.js";
import { runDirectAttestedWrite } from "../direct-attested-write.js";
import type { ResolvedIntent } from "../intent-types.js";
import type { MinimalVerificationOptions } from "../minimal-agent.js";
import { verifyPublishVisibility } from "../publish-visibility.js";
import { isVerificationResult } from "./readback-helpers.js";
import { buildFailedExecution } from "./result-helpers.js";
import type { ResolvedIntentExecutionResult } from "./types.js";

export async function executeDirectAttestedWriteIntent(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, verification: verificationOptions } = args;

  if (resolution.actionType !== "publish" && resolution.actionType !== "reply") {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: `unsupported_direct_write_action:${resolution.actionType}`,
      retryable: false,
    });
  }

  if (resolution.actionType === "reply" && !resolution.normalizedTarget.parentTxHash) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_reply_parent",
      retryable: false,
    });
  }

  const directWrite = await runDirectAttestedWrite({
    omni,
    kind: resolution.actionType,
    draft: {
      text: resolution.normalizedDraft.text ?? "",
      category: resolution.normalizedDraft.category,
      attestUrl: resolution.normalizedDraft.attestUrl ?? "",
      confidence: resolution.normalizedDraft.confidence,
      tags: resolution.normalizedDraft.tags,
      parentTxHash: resolution.normalizedTarget.parentTxHash,
    },
    verifyPublishVisibility,
    verification: verificationOptions,
  });

  const publishResult = directWrite.result;
  const visibility = isVerificationResult(directWrite.visibility) ? directWrite.visibility : undefined;
  if (!directWrite.accepted || !publishResult?.ok) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: publishResult?.error?.message ?? directWrite.error?.message ?? `${resolution.actionType}_failed`,
      code: publishResult?.error?.code ?? directWrite.error?.code,
      retryable: publishResult?.error?.retryable ?? directWrite.error?.retryable,
    }, {
      publishResult,
      verification: visibility,
      txHash: directWrite.txHash,
      attestationTxHash: directWrite.attestationTxHash,
      attestationResponseHash: directWrite.attestationResponseHash,
    });
  }

  return {
    status: "executed",
    actionType: resolution.actionType,
    txHash: directWrite.txHash,
    attestationTxHash: directWrite.attestationTxHash,
    attestationResponseHash: directWrite.attestationResponseHash,
    demSpendEstimate: 1,
    verification: visibility,
    publishResult,
    verificationPath: visibility?.verificationPath,
    visible: visibility?.visible,
    indexedVisible: visibility?.indexedVisible,
  };
}
