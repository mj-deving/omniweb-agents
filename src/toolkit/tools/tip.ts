/**
 * tip() — tip DEM to a post author with spending guards.
 */

import type { TipOptions, TipResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { checkAndRecordTip } from "../guards/tip-spend-cap.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";
import { validateInput, TipOptionsSchema } from "../schemas.js";
import { parseFeedPosts } from "./feed-parser.js";

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

    const capError = await checkAndRecordTip(
      session.stateStore,
      session.walletAddress,
      opts.txHash,
      opts.amount,
      session.tipPolicy,
      false, // check only — record after successful transfer
    );
    if (capError) {
      return err(capError, localProvenance(start));
    }

    const bridge = session.getBridge();
    const memo = `HIVE_TIP:${opts.txHash}`;

    // Resolve post author address — prefer chain (RPC) over feed API
    let recipientAddress: string | null = null;

    // Try RPC resolution first (trusted — on-chain data), with 5s budget
    if (bridge.queryTransaction) {
      try {
        const txResult = await Promise.race([
          bridge.queryTransaction(opts.txHash),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
        ]);
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
      const posts = parseFeedPosts(feedResult.data);
      const targetPost = posts.find((p) => p.txHash === opts.txHash);
      if (!targetPost) {
        return err(
          demosError("INVALID_INPUT", `Post ${opts.txHash.slice(0, 16)}... not found in feed — cannot resolve recipient`, false),
          localProvenance(start),
        );
      }
      recipientAddress = targetPost.author;
      if (!recipientAddress) {
        return err(
          demosError("INVALID_INPUT", `Post ${opts.txHash.slice(0, 16)}... has no sender address`, false),
          localProvenance(start),
        );
      }
    }

    const result = await bridge.transferDem(recipientAddress, opts.amount, memo);

    await checkAndRecordTip(
      session.stateStore,
      session.walletAddress,
      opts.txHash,
      opts.amount,
      session.tipPolicy,
      true, // record after successful transfer
    );

    return ok<TipResult>({ txHash: result.txHash }, localProvenance(start));
  });
}
