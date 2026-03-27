/**
 * tip() — tip DEM to a post author with spending guards.
 */

import type { TipOptions, TipResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { checkTipSpendCap, recordTip } from "../guards/tip-spend-cap.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";
import { validateInput, TipOptionsSchema } from "../schemas.js";

/**
 * Tip DEM to a post author. Guards: max per-tip, max per-post, cooldown.
 */
export async function tip(
  session: DemosSession,
  opts: TipOptions,
): Promise<ToolResult<TipResult>> {
  return withToolWrapper(session, "tip", "TX_FAILED", async (start) => {
    const inputError = validateInput(TipOptionsSchema, opts);
    if (inputError) return err(inputError, localProvenance(start));

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

    const bridge = session.getBridge();
    const memo = `HIVE_TIP:${opts.txHash}`;

    // Resolve post author address — prefer chain (RPC) over feed API
    let recipientAddress: string | null = null;

    // Try RPC resolution first (trusted — on-chain data)
    if (bridge.queryTransaction) {
      try {
        const txResult = await bridge.queryTransaction(opts.txHash);
        if (txResult?.sender) {
          recipientAddress = txResult.sender;
        }
      } catch {
        // RPC failed — will fall back to feed API below
      }
    }

    // Fall back to feed API if RPC resolution failed
    if (!recipientAddress) {
      console.warn("[demos-toolkit] WARNING: Resolving tip recipient from feed API — RPC unavailable. Feed data is untrusted.");
      const feedResult = await bridge.apiCall("/api/feed?limit=50");
      if (!feedResult.ok) {
        return err(
          demosError("NETWORK_ERROR", "Cannot resolve tip recipient: SuperColony feed API unavailable", true),
          localProvenance(start),
        );
      }
      const posts = ((feedResult.data as Record<string, unknown>)?.posts ?? feedResult.data) as unknown[];
      const targetPost = Array.isArray(posts)
        ? posts.find((p: unknown) => String((p as Record<string, unknown>).txHash ?? "") === opts.txHash)
        : undefined;
      if (!targetPost) {
        return err(
          demosError("INVALID_INPUT", `Post ${opts.txHash.slice(0, 16)}... not found in feed — cannot resolve recipient`, false),
          localProvenance(start),
        );
      }
      recipientAddress = String((targetPost as Record<string, unknown>).sender ?? "");
      if (!recipientAddress) {
        return err(
          demosError("INVALID_INPUT", `Post ${opts.txHash.slice(0, 16)}... has no sender address`, false),
          localProvenance(start),
        );
      }
    }

    const result = await bridge.transferDem(recipientAddress, opts.amount, memo);

    await recordTip(session.stateStore, session.walletAddress, opts.txHash, opts.amount);

    return ok<TipResult>({ txHash: result.txHash }, localProvenance(start));
  });
}
