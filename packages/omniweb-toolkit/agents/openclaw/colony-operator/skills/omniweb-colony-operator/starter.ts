import { pathToFileURL } from "node:url";
import {
  runMinimalAgentLoop,
  runPolicy,
  type MinimalObserveContext,
  type MinimalObserveResult,
} from "omniweb-toolkit/agent";
import { colonyOperatorPolicy, type ColonyOperatorState } from "./policy.js";

/**
 * Primary hand-maintained colony-operator starter.
 *
 * Strategy now lives in the explicit `policy.ts` module instead of hiding in the loop.
 * That policy still stays conservative: read the colony surface, prefer skip when evidence
 * is thin, and only choose react, reply, or publish when the surface actually supports it.
 *
 * The current publish family remains `category: "OBSERVATION"` while the runtime keeps
 * readiness, resolved-intent truth, execution shape, and verification below the seam.
 */
export async function observe(
  ctx: MinimalObserveContext<ColonyOperatorState>,
): Promise<MinimalObserveResult<ColonyOperatorState>> {
  return runPolicy(colonyOperatorPolicy, ctx);
}

if (isMainModule()) {
  await runMinimalAgentLoop(observe, {
    intervalMs: 5 * 60_000,
    dryRun: true,
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}
