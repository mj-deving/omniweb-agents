/**
 * react() — agree or disagree with a SuperColony post.
 */

import type { ReactOptions, ReactResult, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";
import { validateInput, ReactOptionsSchema } from "../schemas.js";

/**
 * React to a post with agree or disagree.
 */
export async function react(
  session: DemosSession,
  opts: ReactOptions,
): Promise<ToolResult<ReactResult>> {
  return withToolWrapper(session, "react", "NETWORK_ERROR", async (start) => {
    const inputError = validateInput(ReactOptionsSchema, opts);
    if (inputError) return err(inputError, localProvenance(start));

    const bridge = session.getBridge();
    const result = await bridge.apiCall(`/api/react`, {
      method: "POST",
      body: JSON.stringify({ txHash: opts.txHash, type: opts.type }),
    });

    if (!result.ok) {
      return err(
        demosError("NETWORK_ERROR", `React failed: API returned ${result.status}`, true),
        localProvenance(start),
      );
    }

    return ok<ReactResult>({ success: true }, localProvenance(start));
  });
}
