/**
 * FrameworkPlugin — the extension point for building custom agents.
 *
 * A plugin bundles hooks, data providers, evaluators, and configuration
 * into a single installable unit. The session loop discovers and invokes
 * plugins at the appropriate lifecycle points.
 *
 * Taxonomy inspired by Eliza's Action/Provider/Evaluator/Service pattern
 * (the gold standard from framework research).
 */

import type { LLMProvider } from "../tools/lib/llm-provider.js";
import type { AgentConfig } from "../tools/lib/agent-config.js";

// ── Core Plugin Types ───────────────────────────────

/**
 * A hook function that runs at a lifecycle point.
 * Returns void or a modified context object.
 */
export type HookFn<T = any> = (context: T) => void | Promise<void>;

/**
 * A data provider supplies external data to the agent loop.
 * Providers are invoked during the SENSE phase.
 */
export interface DataProvider {
  /** Unique provider name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Fetch data for a given topic */
  fetch(topic: string, options?: Record<string, unknown>): Promise<ProviderResult>;
}

export interface ProviderResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * An evaluator scores or filters content at decision points.
 * Evaluators run during the ACT phase (gate, match, quality).
 */
export interface Evaluator {
  /** Unique evaluator name */
  name: string;
  /** What this evaluator checks */
  description: string;
  /** Evaluate content and return a score/decision */
  evaluate(input: EvaluatorInput): Promise<EvaluatorResult>;
}

export interface EvaluatorInput {
  text: string;
  topic: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluatorResult {
  pass: boolean;
  score?: number;
  reason: string;
  details?: Record<string, unknown>;
}

// ── Plugin Interface ────────────────────────────────

/**
 * FrameworkPlugin — the primary extension mechanism.
 *
 * Plugins can provide any combination of hooks, providers, and evaluators.
 * All fields are optional — implement only what your plugin needs.
 */
export interface FrameworkPlugin {
  /** Plugin name (used for logging and diagnostics) */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Human-readable description */
  description?: string;

  /**
   * Lifecycle hooks — run at specific points in the session loop.
   * Keys are hook names (e.g., "beforeSense", "afterPublish").
   */
  hooks?: Record<string, HookFn>;

  /** Data providers — supply external data during SENSE */
  providers?: DataProvider[];

  /** Evaluators — score/filter content during ACT */
  evaluators?: Evaluator[];

  /**
   * Initialize the plugin. Called once when the plugin is registered.
   * Receives the agent config and LLM provider for setup.
   */
  init?(config: AgentConfig, llm?: LLMProvider): Promise<void>;

  /**
   * Cleanup function. Called when the session ends.
   */
  destroy?(): Promise<void>;
}

// ── Plugin Registry ─────────────────────────────────

/**
 * Register a plugin with the framework.
 * This is the main entry point for plugin installation.
 */
export interface PluginRegistry {
  /** Register a plugin */
  register(plugin: FrameworkPlugin): void;
  /** Get all registered plugins */
  getAll(): FrameworkPlugin[];
  /** Get a plugin by name */
  get(name: string): FrameworkPlugin | undefined;
  /** Get all hooks for a given lifecycle point */
  getHooks(hookName: string): HookFn[];
  /** Get all data providers */
  getProviders(): DataProvider[];
  /** Get all evaluators */
  getEvaluators(): Evaluator[];
}

/**
 * Create a new plugin registry.
 */
export function createPluginRegistry(): PluginRegistry {
  const plugins: FrameworkPlugin[] = [];

  return {
    register(plugin: FrameworkPlugin): void {
      plugins.push(plugin);
    },
    getAll(): FrameworkPlugin[] {
      return [...plugins];
    },
    get(name: string): FrameworkPlugin | undefined {
      return plugins.find((p) => p.name === name);
    },
    getHooks(hookName: string): HookFn[] {
      return plugins
        .filter((p) => p.hooks?.[hookName])
        .map((p) => p.hooks![hookName]);
    },
    getProviders(): DataProvider[] {
      return plugins.flatMap((p) => p.providers || []);
    },
    getEvaluators(): Evaluator[] {
      return plugins.flatMap((p) => p.evaluators || []);
    },
  };
}
