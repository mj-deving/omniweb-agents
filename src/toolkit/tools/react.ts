/**
 * react() — agree or disagree with a post.
 *
 * Chain-first: publishes HIVE reaction as on-chain storage transaction.
 * Fallback: if chain fails and apiAccess === "authenticated", falls back to API POST.
 */

import type { ReactOptions, ReactResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";
import { validateInput, ReactOptionsSchema } from "../schemas.js";

/**
 * React to a post with agree or disagree.
 *
 * Primary: on-chain HIVE reaction via publishHiveReaction.
 * Fallback: API POST when chain fails and apiAccess === "authenticated".
 */
export async function react(
  session: DemosSession,
  opts: ReactOptions,
): Promise<ToolResult<ReactResult>> {
  return withToolWrapper(session, "react", "NETWORK_ERROR", async (start) => {
    const inputError = validateInput(ReactOptionsSchema, opts);
    if (inputError) return err(inputError, localProvenance(start));

    const bridge = session.getBridge();

    // Primary path: on-chain HIVE reaction
    try {
      const result = await bridge.publishHiveReaction(opts.txHash, opts.type);
      return ok<ReactResult>({ success: true, txHash: result.txHash }, localProvenance(start));
    } catch (chainErr) {
      // Chain failed — try API fallback if authenticated
      if (bridge.apiAccess === "authenticated") {
        try {
          const apiResult = await bridge.apiCall(`/api/react`, {
            method: "POST",
            body: JSON.stringify({ txHash: opts.txHash, type: opts.type }),
          });

          if (apiResult.ok) {
            console.warn("[demos-toolkit] Reaction via API fallback — chain broadcast failed, reaction is indexer-only");
            return ok<ReactResult>({ success: true }, localProvenance(start));
          }

          return err(
            demosError("TX_FAILED", `Reaction failed: chain error (${(chainErr as Error).message}), API returned ${apiResult.status}`, true),
            localProvenance(start),
          );
        } catch (apiErr) {
          return err(
            demosError("TX_FAILED", `Reaction failed on both chain and API: ${(chainErr as Error).message}`, true),
            localProvenance(start),
          );
        }
      }

      // No API fallback available
      return err(
        demosError("TX_FAILED", `Reaction failed: ${(chainErr as Error).message}`, true),
        localProvenance(start),
      );
    }
  });
}
