/**
 * Skill Dojo adapter: demos-wallet (Action — STUB)
 *
 * Browser-only wallet extension integration.
 * Not available in Node.js agent runtime.
 *
 * Modes: connect, sign, transfer, identities, siwd, xm-transaction
 */

import type { Action } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";

export function createDemosWalletAction(
  _config: SkillAdapterConfig,
): Action {
  return {
    name: "skill-dojo:demos-wallet",
    description:
      "Demos wallet browser extension integration (browser-only — stub)",
    async validate() {
      return false;
    },
    async execute() {
      return {
        success: false,
        error:
          "demos-wallet requires browser environment — not available in Node.js agent runtime",
      };
    },
  };
}
