/**
 * Agent Compiler — Barrel exports.
 *
 * Generates complete agent template directories from loose text descriptions.
 * Flow: intent text -> parse -> compose -> validate -> output files
 */
export { buildIntentPrompt, parseIntentResponse } from "./intent-parser.js";
export { composeTemplate } from "./template-composer.js";
export type { ComposedTemplate } from "./template-composer.js";
export { validateComposedTemplate } from "./validator.js";
export type { ValidationResult } from "./validator.js";
export { validateIntentConfig, AgentIntentConfigSchema } from "./schema.js";
export { EXAMPLE_INTENTS } from "./examples.js";
export type {
  AgentIntentConfig,
  CoreCategory,
  DomainCategory,
  MetaCategory,
  TippingTrigger,
  PredictionMode,
  AttestationMethod,
  TippingMode,
  ModelTier,
} from "./types.js";
