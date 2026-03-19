/**
 * Skill Dojo adapter: identity-agent (Action)
 *
 * CCI profile management — create, resolve, link wallets.
 * Modes: resolve, create, add-web3
 */

import type { Action } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";

export type IdentityAgentMode = "resolve" | "create" | "add-web3";

const VALID_MODES: IdentityAgentMode[] = ["resolve", "create", "add-web3"];

export function createIdentityAction(config: SkillAdapterConfig): Action {
  return {
    name: "skill-dojo:identity-agent",
    description: "CCI profile management — create, resolve, link wallets",
    async validate(input) {
      const mode = input.context?.mode as string;
      return VALID_MODES.includes((mode || "resolve") as IdentityAgentMode);
    },
    async execute(input) {
      const params = {
        mode: (input.context?.mode as string) || "resolve",
        ...(input.context?.address != null && {
          address: input.context.address as string,
        }),
        ...(input.context?.chain != null && {
          chain: input.context.chain as string,
        }),
        ...(input.context?.walletAddress != null && {
          walletAddress: input.context.walletAddress as string,
        }),
      };

      const response = await config.client.execute(
        "identity-agent",
        params,
      );
      if (!response.ok) {
        return {
          success: false,
          error: response.error || "Skill execution failed",
        };
      }

      return {
        success: true,
        data: response.result?.data,
        text: response.result?.message,
      };
    },
  };
}
