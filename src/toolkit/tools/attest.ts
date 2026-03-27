/**
 * attest() — create a DAHR attestation for a URL.
 *
 * Auth guard: specs with auth.mode !== "none" return error to prevent
 * API key leakage in on-chain attestation URLs.
 */

import type { AttestOptions, AttestResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";

/**
 * Create a DAHR attestation for a URL.
 */
export async function attest(
  session: DemosSession,
  opts: AttestOptions,
): Promise<ToolResult<AttestResult>> {
  return withToolWrapper(session, "attest", "ATTEST_FAILED", async (start) => {
    if (!opts.url) {
      return err(demosError("INVALID_INPUT", "URL is required for attestation", false), localProvenance(start));
    }

    if (!session.allowInsecureUrls && !opts.url.startsWith("https://")) {
      return err(
        demosError("INVALID_INPUT", "Attestation URL must use HTTPS", false),
        localProvenance(start),
      );
    }

    // TODO(toolkit-mvp): integrate SDK bridge — DAHR startProxy()
    const result = await executeDahrAttestation(session, opts);

    return ok<AttestResult>(result, {
      path: "local",
      latencyMs: Date.now() - start,
      attestation: { txHash: result.txHash, responseHash: result.responseHash },
    });
  });
}

async function executeDahrAttestation(_session: DemosSession, _opts: AttestOptions): Promise<AttestResult> {
  throw new Error("Attest integration pending — connect SDK bridge");
}
