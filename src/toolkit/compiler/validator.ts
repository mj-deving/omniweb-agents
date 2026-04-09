/**
 * Agent Compiler — Template Validator.
 *
 * Validates composed template files for correctness.
 */
import { loadStrategyConfig } from "../strategy/config-loader.js";
import { toErrorMessage } from "../util/errors.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_FILES = ["strategy.yaml", "agent.ts", "observe.ts"] as const;

/**
 * Validate a composed template's file set.
 * Checks file presence and strategy.yaml schema compliance.
 */
export function validateComposedTemplate(
  files: Map<string, string>,
): ValidationResult {
  const errors: string[] = [];

  // Check required files exist
  for (const required of REQUIRED_FILES) {
    if (!files.has(required)) {
      errors.push(`Missing required file: ${required}`);
    }
  }

  // Validate strategy.yaml parses and passes schema
  if (files.has("strategy.yaml")) {
    try {
      loadStrategyConfig(files.get("strategy.yaml")!);
    } catch (e) {
      errors.push(
        `Invalid strategy.yaml: ${toErrorMessage(e)}`,
      );
    }
  }

  // Validate observe.ts content
  const observeContent = files.get("observe.ts");
  if (observeContent && !observeContent.includes("learnFirstObserve")) {
    errors.push("observe.ts missing learnFirstObserve function");
  }

  // Validate agent.ts content
  const agentContent = files.get("agent.ts");
  if (agentContent && !agentContent.includes("runAgentLoop")) {
    errors.push("agent.ts missing runAgentLoop call");
  }

  return { valid: errors.length === 0, errors };
}
