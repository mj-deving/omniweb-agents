/**
 * Common types for all Skill Dojo adapters.
 */

import type { ProviderResult } from "../../types.js";
import type { SkillDojoClient } from "../../lib/skill-dojo-client.js";
import type { NormalizedProof } from "../../lib/skill-dojo-proof.js";

/** Base config for all skill adapters */
export interface SkillAdapterConfig {
  client: SkillDojoClient;
}

/** Result from a skill adapter, extending ProviderResult with proof data */
export interface SkillProviderResult extends ProviderResult {
  proofs?: NormalizedProof[];
  executionTimeMs?: number;
  skillId?: string;
}

// Re-export for convenience
export type { SkillDojoClient, NormalizedProof };
