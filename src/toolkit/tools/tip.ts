/**
 * tip() — tip DEM to a post author with spending guards.
 */

import type { TipOptions, TipResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { checkTipSpendCap, recordTip } from "../guards/tip-spend-cap.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";

/**
 * Tip DEM to a post author. Guards: max per-tip, max per-post, cooldown.
 */
export async function tip(
  session: DemosSession,
  opts: TipOptions,
): Promise<ToolResult<TipResult>> {
  return withToolWrapper(session, "tip", "TX_FAILED", async (start) => {
    if (!opts.txHash) {
      return err(demosError("INVALID_INPUT", "txHash is required", false), localProvenance(start));
    }

    const capError = await checkTipSpendCap(
      session.stateStore,
      session.walletAddress,
      opts.txHash,
      opts.amount,
      session.tipPolicy,
    );
    if (capError) {
      return err(capError, localProvenance(start));
    }

    // TODO(toolkit-mvp): integrate SDK bridge
    const txHash = await executeTip(session, opts);

    await recordTip(session.stateStore, session.walletAddress, opts.txHash, opts.amount);

    return ok<TipResult>({ txHash }, localProvenance(start));
  });
}

async function executeTip(_session: DemosSession, _opts: TipOptions): Promise<string> {
  throw new Error("Tip integration pending — connect SDK bridge");
}
