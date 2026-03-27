/**
 * react() — agree or disagree with a SuperColony post.
 */

import type { ReactOptions, ReactResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";

/**
 * React to a post with agree or disagree.
 */
export async function react(
  session: DemosSession,
  opts: ReactOptions,
): Promise<ToolResult<ReactResult>> {
  return withToolWrapper(session, "react", "NETWORK_ERROR", async (start) => {
    if (!opts.txHash) {
      return err(demosError("INVALID_INPUT", "txHash is required", false), localProvenance(start));
    }

    if (opts.type !== "agree" && opts.type !== "disagree") {
      return err(
        demosError("INVALID_INPUT", "type must be 'agree' or 'disagree'", false),
        localProvenance(start),
      );
    }

    // TODO(toolkit-mvp): integrate SDK bridge
    await executeReact(session, opts);

    return ok<ReactResult>({ success: true }, localProvenance(start));
  });
}

async function executeReact(
  _session: DemosSession,
  _opts: ReactOptions,
): Promise<void> {
  throw new Error("React integration pending — connect SDK bridge");
}
